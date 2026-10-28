const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const Classroom = require("../models/Classroom");
const { enrolledClassIds } = require("../utils/classrooms");
const {
  ValidationError,
  normalizeQuestion,
  totalMarks,
} = require("../utils/questions");

const COLORS = ["", "blue", "green", "orange", "pink"];

const availability = (quiz, now = new Date()) => {
  if (quiz.openAt && now < quiz.openAt) return "upcoming";
  if (quiz.closeAt && now > quiz.closeAt) return "closed";
  return "open";
};

const mapQuizSummary = (quiz, extra = {}) => ({
  id: quiz._id.toString(),
  title: quiz.title,
  category: quiz.category,
  description: quiz.description,
  questions: quiz.questions.length,
  duration: quiz.duration,
  marks: quiz.marks || totalMarks(quiz.questions),
  teacher: quiz.teacherName || "Teacher",
  icon: quiz.icon,
  color: quiz.color || "",
  attemptsAllowed: quiz.attemptsAllowed || 0,
  passPercentage: quiz.passPercentage ?? 40,
  openAt: quiz.openAt,
  closeAt: quiz.closeAt,
  availability: availability(quiz),
  classroom: mapClassRef(quiz.classroom),
  createdAt: quiz.createdAt,
  ...extra,
});

function mapClassRef(classroom) {
  if (!classroom) return null;
  if (classroom.name) return { id: classroom._id.toString(), name: classroom.name };
  return { id: classroom.toString(), name: "" };
}

async function resolveClassroom(req) {
  const id = req.body.classroom;
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ValidationError("Choose the class this quiz belongs to");
  }
  const classroom = await Classroom.findOne({ _id: id, teacher: req.user._id }).select("_id");
  if (!classroom) throw new ValidationError("Choose one of your own classes");
  return classroom._id;
}

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function readQuizBody(body) {
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  if (!title || !category) {
    throw new ValidationError("Title and category are required");
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    throw new ValidationError("Add at least one question");
  }

  const questions = body.questions.map((raw, index) => {
    const question = normalizeQuestion(raw, index);
    if (raw.id && mongoose.isValidObjectId(raw.id)) question._id = raw.id;
    return question;
  });

  const openAt = parseDate(body.openAt);
  const closeAt = parseDate(body.closeAt);
  if (openAt && closeAt && closeAt <= openAt) {
    throw new ValidationError("Close date must be after the open date");
  }

  const pass = Number(body.passPercentage);

  return {
    title,
    category,
    description: String(body.description || "").trim(),
    duration: Math.max(0, Math.round(Number(body.duration) || 0)),
    icon: String(body.icon || "📝").trim().slice(0, 8) || "📝",
    color: COLORS.includes(body.color) ? body.color : "",
    questions,
    marks: totalMarks(questions),
    attemptsAllowed: Math.max(0, Math.round(Number(body.attemptsAllowed) || 0)),
    shuffleQuestions: Boolean(body.shuffleQuestions),
    shuffleAnswers: body.shuffleAnswers !== false,
    passPercentage: Number.isFinite(pass) ? Math.min(100, Math.max(0, pass)) : 40,
    showCorrectAnswers: body.showCorrectAnswers !== false,
    openAt,
    closeAt,
    isPublished: body.isPublished !== false,
  };
}

async function saveQuestionsToBank(teacherId, questions, category) {
  const bankCategory = String(category || "General").trim() || "General";
  const existing = await Question.find({ teacher: teacherId }).select("type question");
  const seen = new Set(existing.map((q) => `${q.type}::${q.question.toLowerCase()}`));

  const fresh = questions
    .filter((q) => !seen.has(`${q.type}::${q.question.toLowerCase()}`))
    .map(({ _id, ...q }) => ({ ...q, teacher: teacherId, category: bankCategory }));

  if (fresh.length) await Question.insertMany(fresh);
  return fresh.length;
}

const handleError = (res, error, fallback) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({ message: error.message || fallback });
};

const getQuizzes = async (req, res) => {
  try {
    const classIds = await enrolledClassIds(req.user._id);
    const quizzes = await Quiz.find({ isPublished: true, classroom: { $in: classIds } })
      .populate("classroom", "name")
      .sort({ createdAt: -1 });

    const counts = await Attempt.aggregate([
      { $match: { student: req.user._id, status: "submitted" } },
      { $group: { _id: "$quiz", count: { $sum: 1 }, best: { $max: "$percentage" } } },
    ]);
    const usedByQuiz = Object.fromEntries(counts.map((item) => [item._id.toString(), item]));

    return res.json({
      quizzes: quizzes.map((quiz) => {
        const used = usedByQuiz[quiz._id.toString()];
        return mapQuizSummary(quiz, {
          attemptsUsed: used?.count || 0,
          bestPercentage: used ? used.best : null,
        });
      }),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch quizzes");
  }
};

const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacher: req.user._id })
      .populate("classroom", "name")
      .sort({ createdAt: -1 });
    const counts = await Attempt.aggregate([
      { $match: { quiz: { $in: quizzes.map((q) => q._id) }, status: "submitted" } },
      { $group: { _id: "$quiz", count: { $sum: 1 }, average: { $avg: "$percentage" } } },
    ]);
    const byQuiz = Object.fromEntries(counts.map((item) => [item._id.toString(), item]));

    return res.json({
      quizzes: quizzes.map((quiz) => {
        const stats = byQuiz[quiz._id.toString()];
        return mapQuizSummary(quiz, {
          isPublished: quiz.isPublished,
          attemptCount: stats?.count || 0,
          averagePercentage: stats ? Math.round(stats.average) : null,
        });
      }),
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch quizzes");
  }
};

const getQuizForEdit = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.teacher.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    return res.json({
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        category: quiz.category,
        description: quiz.description,
        duration: quiz.duration,
        icon: quiz.icon,
        color: quiz.color,
        classroom: quiz.classroom ? quiz.classroom.toString() : "",
        attemptsAllowed: quiz.attemptsAllowed,
        shuffleQuestions: quiz.shuffleQuestions,
        shuffleAnswers: quiz.shuffleAnswers,
        passPercentage: quiz.passPercentage,
        showCorrectAnswers: quiz.showCorrectAnswers,
        openAt: quiz.openAt,
        closeAt: quiz.closeAt,
        isPublished: quiz.isPublished,
        questions: quiz.questions.map((q) => ({
          id: q._id.toString(),
          type: q.type || "mcq",
          question: q.question,
          options: q.options,
          answer: q.answer,
          tolerance: q.tolerance,
          pairs: q.pairs,
          marks: q.marks ?? 1,
          feedback: q.feedback || "",
        })),
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch quiz");
  }
};

const createQuiz = async (req, res) => {
  try {
    const data = readQuizBody(req.body);
    data.classroom = await resolveClassroom(req);
    const quiz = await Quiz.create({
      ...data,
      teacher: req.user._id,
      teacherName: req.user.name,
    });

    const savedToBank = req.body.saveToBank
      ? await saveQuestionsToBank(req.user._id, data.questions, req.body.bankCategory || data.category)
      : 0;

    return res.status(201).json({ quiz: mapQuizSummary(quiz), savedToBank });
  } catch (error) {
    return handleError(res, error, "Failed to create quiz");
  }
};

const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.teacher.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const data = readQuizBody(req.body);
    data.classroom = await resolveClassroom(req);
    quiz.set(data);
    await quiz.save();

    const savedToBank = req.body.saveToBank
      ? await saveQuestionsToBank(req.user._id, data.questions, req.body.bankCategory || data.category)
      : 0;

    return res.json({ quiz: mapQuizSummary(quiz), savedToBank });
  } catch (error) {
    return handleError(res, error, "Failed to update quiz");
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (quiz.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own quizzes" });
    }

    await Attempt.deleteMany({ quiz: quiz._id });
    await quiz.deleteOne();

    return res.json({ message: "Quiz deleted" });
  } catch (error) {
    return handleError(res, error, "Failed to delete quiz");
  }
};

const getQuizAttempts = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.teacher.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const attempts = await Attempt.find({ quiz: quiz._id, status: "submitted" })
      .populate("student", "name email")
      .sort({ submittedAt: -1, createdAt: -1 });

    return res.json({
      quiz: mapQuizSummary(quiz),
      attempts: attempts.map((item) => ({
        id: item._id.toString(),
        studentName: item.student?.name || "Deleted student",
        studentEmail: item.student?.email || "",
        score: item.score,
        maxScore: item.maxScore || item.totalQuestions,
        percentage: item.percentage,
        passed: item.passed,
        submittedAt: item.submittedAt || item.createdAt,
      })),
    });
  } catch (error) {
    return handleError(res, error, "Failed to load attempts");
  }
};

const getStudentStats = async (req, res) => {
  try {
    const classIds = await enrolledClassIds(req.user._id);
    const [totalQuizzes, attempts] = await Promise.all([
      Quiz.countDocuments({ isPublished: true, classroom: { $in: classIds } }),
      Attempt.find({ student: req.user._id, status: "submitted" }),
    ]);

    const completed = attempts.length;
    const averageScore =
      completed === 0
        ? 0
        : Math.round(attempts.reduce((sum, item) => sum + item.percentage, 0) / completed);

    const studyMinutes = attempts.reduce((sum, item) => {
      const end = item.submittedAt || item.updatedAt;
      const start = item.startedAt || item.createdAt;
      return sum + Math.max(0, (end - start) / 60000);
    }, 0);

    return res.json({
      stats: {
        totalQuizzes,
        completed,
        averageScore,
        studyHours: Math.round((studyMinutes / 60) * 10) / 10,
      },
    });
  } catch (error) {
    return handleError(res, error, "Failed to load stats");
  }
};

module.exports = {
  availability,
  getQuizzes,
  getMyQuizzes,
  getQuizForEdit,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
  getStudentStats,
};
