const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");

const submitAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const answers = req.body.answers || {};
    let score = 0;

    const review = quiz.questions.map((question) => {
      const questionId = question._id.toString();
      const userAnswer = answers[questionId];
      const isCorrect = userAnswer === question.answer;
      if (isCorrect) score += 1;

      return {
        questionId,
        question: question.question,
        options: question.options,
        correctAnswer: question.answer,
        userAnswer: userAnswer || null,
        isCorrect: Boolean(userAnswer) && isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const attempt = await Attempt.create({
      quiz: quiz._id,
      student: req.user._id,
      answers,
      score,
      totalQuestions,
      percentage,
      review,
    });

    return res.status(201).json({
      attempt: {
        id: attempt._id.toString(),
        quizId: quiz._id.toString(),
        quizTitle: quiz.title,
        score,
        totalQuestions,
        percentage,
        review,
        createdAt: attempt.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit quiz" });
  }
};

const getMyAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id })
      .populate("quiz", "title category")
      .sort({ createdAt: -1 });

    return res.json({
      attempts: attempts.map((item) => ({
        id: item._id.toString(),
        quizId: item.quiz?._id?.toString(),
        quizTitle: item.quiz?.title || "Deleted quiz",
        category: item.quiz?.category || "",
        score: item.score,
        totalQuestions: item.totalQuestions,
        percentage: item.percentage,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load results" });
  }
};

const getAttemptById = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate(
      "quiz",
      "title category"
    );

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({
      attempt: {
        id: attempt._id.toString(),
        quizId: attempt.quiz?._id?.toString() || null,
        quizTitle: attempt.quiz?.title || "Quiz",
        category: attempt.quiz?.category || "",
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        review: attempt.review,
        createdAt: attempt.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load attempt" });
  }
};

module.exports = { submitAttempt, getMyAttempts, getAttemptById };
