const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");

const mapQuizSummary = (quiz) => ({
  id: quiz._id.toString(),
  title: quiz.title,
  category: quiz.category,
  description: quiz.description,
  questions: quiz.questions.length,
  duration: quiz.duration,
  marks: quiz.marks || quiz.questions.length,
  teacher: quiz.teacherName || "Teacher",
  icon: quiz.icon,
  color: quiz.color || "",
  createdAt: quiz.createdAt,
});

const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true }).sort({ createdAt: -1 });
    return res.json({ quizzes: quizzes.map(mapQuizSummary) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch quizzes" });
  }
};

const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const includeAnswers = req.user?.role === "teacher";

    return res.json({
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        category: quiz.category,
        description: quiz.description,
        duration: quiz.duration,
        marks: quiz.marks || quiz.questions.length,
        teacher: quiz.teacherName || "Teacher",
        icon: quiz.icon,
        color: quiz.color || "",
        questions: quiz.questions.map((q) => ({
          id: q._id.toString(),
          question: q.question,
          options: q.options,
          ...(includeAnswers ? { answer: q.answer } : {}),
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch quiz" });
  }
};

const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    return res.json({ quizzes: quizzes.map(mapQuizSummary) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch quizzes" });
  }
};

const createQuiz = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      duration,
      icon,
      color,
      questions,
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: "Title and category are required" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Add at least one question" });
    }

    for (const item of questions) {
      if (!item.question || !item.answer || !Array.isArray(item.options) || item.options.length < 2) {
        return res.status(400).json({
          message: "Each question needs text, answer, and at least 2 options",
        });
      }
      if (!item.options.includes(item.answer)) {
        return res.status(400).json({
          message: "Answer must match one of the options",
        });
      }
    }

    const quiz = await Quiz.create({
      title: title.trim(),
      category: category.trim(),
      description: (description || "").trim(),
      duration: Number(duration) || 30,
      marks: questions.length,
      icon: icon || "📝",
      color: color || "",
      teacher: req.user._id,
      teacherName: req.user.name,
      questions,
      isPublished: true,
    });

    return res.status(201).json({ quiz: mapQuizSummary(quiz) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create quiz" });
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
    return res.status(500).json({ message: error.message || "Failed to delete quiz" });
  }
};

const getStudentStats = async (req, res) => {
  try {
    const [totalQuizzes, attempts] = await Promise.all([
      Quiz.countDocuments({ isPublished: true }),
      Attempt.find({ student: req.user._id }),
    ]);

    const completed = attempts.length;
    const averageScore =
      completed === 0
        ? 0
        : Math.round(
            attempts.reduce((sum, item) => sum + item.percentage, 0) / completed
          );

    return res.json({
      stats: {
        totalQuizzes,
        completed,
        averageScore,
        studyHours: Math.round((completed * 0.4) * 10) / 10,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load stats" });
  }
};

module.exports = {
  getQuizzes,
  getQuizById,
  getMyQuizzes,
  createQuiz,
  deleteQuiz,
  getStudentStats,
};
