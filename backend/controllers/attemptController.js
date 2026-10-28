const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const { availability } = require("./quizController");
const { isEnrolled } = require("../utils/classrooms");
const {
  buildLayout,
  toStudentQuestion,
  gradeQuestion,
  totalMarks,
} = require("../utils/questions");

// Network latency allowance when a submission arrives just after the deadline.
const GRACE_MS = 30 * 1000;

const isExpired = (attempt, now = Date.now()) =>
  Boolean(attempt.deadline) && now > attempt.deadline.getTime() + GRACE_MS;

function layoutQuestions(attempt, quiz) {
  const layout = Array.isArray(attempt.layout) ? attempt.layout : [];
  const items = layout
    .map((entry) => ({ entry, question: quiz.questions.id(entry.questionId) }))
    .filter((item) => item.question);
  return items.length
    ? items
    : quiz.questions.map((question) => ({ entry: {}, question }));
}

function sanitizeAnswers(raw, questions) {
  const answers = {};
  if (!raw || typeof raw !== "object") return answers;

  for (const question of questions) {
    const id = question._id.toString();
    const value = raw[id];
    if (value == null) continue;

    const type = question.type || "mcq";
    if (type === "multi") {
      if (Array.isArray(value)) {
        answers[id] = value.map((v) => String(v).slice(0, 500)).slice(0, 20);
      }
    } else if (type === "matching") {
      if (typeof value === "object" && !Array.isArray(value)) {
        answers[id] = Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => /^\d+$/.test(key))
            .map(([key, v]) => [key, String(v ?? "").slice(0, 500)])
        );
      }
    } else {
      answers[id] = String(value).slice(0, 1000);
    }
  }
  return answers;
}

async function finalizeAttempt(attempt, quiz, answers) {
  const questions = layoutQuestions(attempt, quiz).map((item) => item.question);
  const review = questions.map((question) =>
    gradeQuestion(question, answers[question._id.toString()])
  );

  const score = Math.round(review.reduce((sum, item) => sum + item.earned, 0) * 100) / 100;
  const maxScore = totalMarks(questions);
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;

  attempt.set({
    status: "submitted",
    submittedAt: new Date(),
    answers,
    review,
    score,
    maxScore,
    totalQuestions: questions.length,
    percentage,
    passed: percentage >= (quiz.passPercentage ?? 40),
  });
  attempt.markModified("answers");
  attempt.markModified("review");
  await attempt.save();
  return attempt;
}

function attemptPayload(attempt, quiz, attemptNumber) {
  const items = layoutQuestions(attempt, quiz);
  return {
    id: attempt._id.toString(),
    startedAt: attempt.startedAt,
    deadline: attempt.deadline,
    serverNow: new Date(),
    answers: attempt.answers || {},
    attemptNumber,
    attemptsAllowed: quiz.attemptsAllowed || 0,
    quiz: {
      id: quiz._id.toString(),
      title: quiz.title,
      category: quiz.category,
      duration: quiz.duration,
      marks: totalMarks(items.map((item) => item.question)),
      questions: items.map(({ entry, question }) => toStudentQuestion(question, entry)),
    },
  };
}

const startAttempt = async (req, res) => {
  try {
    const quiz = mongoose.isValidObjectId(req.params.quizId)
      ? await Quiz.findById(req.params.quizId)
      : null;
    // Same response whether the quiz is missing or belongs to a class the student isn't in.
    if (!quiz || !quiz.isPublished || !(await isEnrolled(quiz.classroom, req.user._id))) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const state = availability(quiz);
    if (state === "upcoming") {
      return res.status(403).json({
        message: `This quiz opens on ${quiz.openAt.toLocaleString("en-GB")}`,
      });
    }

    let existing = await Attempt.findOne({
      quiz: quiz._id,
      student: req.user._id,
      status: "in_progress",
    });

    if (existing && isExpired(existing)) {
      await finalizeAttempt(existing, quiz, existing.answers || {});
      existing = null;
    }

    const used = await Attempt.countDocuments({
      quiz: quiz._id,
      student: req.user._id,
      status: "submitted",
    });

    if (existing) {
      return res.json({ attempt: attemptPayload(existing, quiz, used + 1), resumed: true });
    }

    if (state === "closed") {
      return res.status(403).json({ message: "This quiz is closed" });
    }

    if (quiz.attemptsAllowed && used >= quiz.attemptsAllowed) {
      return res.status(403).json({
        message: `You have used all ${quiz.attemptsAllowed} allowed attempt(s)`,
      });
    }

    if (!quiz.questions.length) {
      return res.status(400).json({ message: "This quiz has no questions yet" });
    }

    const now = new Date();
    let deadline = quiz.duration > 0 ? new Date(now.getTime() + quiz.duration * 60000) : null;
    if (quiz.closeAt && (!deadline || quiz.closeAt < deadline)) deadline = quiz.closeAt;

    const attempt = await Attempt.create({
      quiz: quiz._id,
      student: req.user._id,
      status: "in_progress",
      startedAt: now,
      deadline,
      layout: buildLayout(quiz),
      answers: {},
    });

    return res.status(201).json({ attempt: attemptPayload(attempt, quiz, used + 1), resumed: false });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to start quiz" });
  }
};

async function loadOwnInProgress(req, res) {
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt || attempt.student.toString() !== req.user._id.toString()) {
    res.status(404).json({ message: "Attempt not found" });
    return null;
  }
  if (attempt.status !== "in_progress") {
    res.status(409).json({ message: "This attempt was already submitted", attemptId: attempt._id });
    return null;
  }
  const quiz = await Quiz.findById(attempt.quiz);
  if (!quiz) {
    res.status(404).json({ message: "Quiz no longer exists" });
    return null;
  }
  if (!(await isEnrolled(quiz.classroom, req.user._id))) {
    res.status(403).json({ message: "You are no longer enrolled in this quiz's class" });
    return null;
  }
  return { attempt, quiz };
}

const saveAnswers = async (req, res) => {
  try {
    const loaded = await loadOwnInProgress(req, res);
    if (!loaded) return undefined;
    const { attempt, quiz } = loaded;

    if (isExpired(attempt)) {
      await finalizeAttempt(attempt, quiz, attempt.answers || {});
      return res.status(409).json({ message: "Time is up — your attempt was submitted", attemptId: attempt._id });
    }

    const questions = layoutQuestions(attempt, quiz).map((item) => item.question);
    attempt.answers = sanitizeAnswers(req.body.answers, questions);
    attempt.markModified("answers");
    await attempt.save();

    return res.json({ saved: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save answers" });
  }
};

const submitAttempt = async (req, res) => {
  try {
    const loaded = await loadOwnInProgress(req, res);
    if (!loaded) return undefined;
    const { attempt, quiz } = loaded;

    const questions = layoutQuestions(attempt, quiz).map((item) => item.question);
    // After the deadline only the last autosaved answers count.
    const answers = isExpired(attempt)
      ? attempt.answers || {}
      : sanitizeAnswers(req.body.answers, questions);

    await finalizeAttempt(attempt, quiz, answers);

    return res.status(201).json({
      attempt: {
        id: attempt._id.toString(),
        quizId: quiz._id.toString(),
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passed: attempt.passed,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit quiz" });
  }
};

const getMyAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id, status: "submitted" })
      .populate("quiz", "title category")
      .sort({ submittedAt: -1, createdAt: -1 });

    return res.json({
      attempts: attempts.map((item) => ({
        id: item._id.toString(),
        quizId: item.quiz?._id?.toString(),
        quizTitle: item.quiz?.title || "Deleted quiz",
        category: item.quiz?.category || "",
        score: item.score,
        maxScore: item.maxScore || item.totalQuestions,
        totalQuestions: item.totalQuestions,
        percentage: item.percentage,
        passed: item.passed,
        createdAt: item.submittedAt || item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load results" });
  }
};

// Attempts saved before question types existed only stored isCorrect.
const normalizeReviewItem = (item) => {
  if (item.status) return item;
  const answered = item.userAnswer != null && item.userAnswer !== "";
  return {
    ...item,
    type: "mcq",
    marks: 1,
    earned: item.isCorrect ? 1 : 0,
    status: !answered ? "unanswered" : item.isCorrect ? "correct" : "wrong",
  };
};

const getAttemptById = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate(
      "quiz",
      "title category showCorrectAnswers passPercentage attemptsAllowed"
    );

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const isOwner = attempt.student.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (attempt.status !== "submitted") {
      return res.status(400).json({ message: "This attempt is still in progress" });
    }

    const showAnswers = attempt.quiz ? attempt.quiz.showCorrectAnswers !== false : true;
    const review = (attempt.review || []).map(normalizeReviewItem).map((item) =>
      showAnswers ? item : { ...item, correctAnswer: null }
    );

    return res.json({
      attempt: {
        id: attempt._id.toString(),
        quizId: attempt.quiz?._id?.toString() || null,
        quizTitle: attempt.quiz?.title || "Quiz",
        category: attempt.quiz?.category || "",
        score: attempt.score,
        maxScore: attempt.maxScore || attempt.totalQuestions,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        passed: attempt.passed,
        passPercentage: attempt.quiz?.passPercentage ?? 40,
        showCorrectAnswers: showAnswers,
        review,
        startedAt: attempt.startedAt,
        createdAt: attempt.submittedAt || attempt.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load attempt" });
  }
};

module.exports = {
  startAttempt,
  saveAnswers,
  submitAttempt,
  getMyAttempts,
  getAttemptById,
};
