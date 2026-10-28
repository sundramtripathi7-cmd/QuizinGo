const mongoose = require("mongoose");
const Question = require("../models/Question");
const { ValidationError, normalizeQuestion } = require("../utils/questions");

const mapBankQuestion = (q) => ({
  id: q._id.toString(),
  type: q.type || "mcq",
  question: q.question,
  options: q.options,
  answer: q.answer,
  tolerance: q.tolerance,
  pairs: q.pairs,
  marks: q.marks ?? 1,
  feedback: q.feedback || "",
  category: q.category,
  createdAt: q.createdAt,
});

const listBank = async (req, res) => {
  try {
    const filter = { teacher: req.user._id };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.question = { $regex: escaped, $options: "i" };
    }

    const [questions, categories] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).limit(500),
      Question.distinct("category", { teacher: req.user._id }),
    ]);

    return res.json({
      questions: questions.map(mapBankQuestion),
      categories: categories.sort(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load question bank" });
  }
};

const addToBank = async (req, res) => {
  try {
    const { questions, category } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions to save" });
    }

    const fallbackCategory = String(category || "General").trim() || "General";
    const docs = questions.map((raw, index) => ({
      ...normalizeQuestion(raw, index),
      teacher: req.user._id,
      category: String(raw.category || fallbackCategory).trim() || fallbackCategory,
    }));

    const inserted = await Question.insertMany(docs);
    return res.status(201).json({
      saved: inserted.length,
      questions: inserted.map(mapBankQuestion),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to save questions" });
  }
};

const deleteBankQuestions = async (req, res) => {
  try {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : [req.params.id])
      .filter((id) => id && mongoose.isValidObjectId(id));
    if (!ids.length) {
      return res.status(400).json({ message: "No questions selected" });
    }

    const result = await Question.deleteMany({ _id: { $in: ids }, teacher: req.user._id });
    return res.json({ deleted: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete questions" });
  }
};

module.exports = { listBank, addToBank, deleteBankQuestions };
