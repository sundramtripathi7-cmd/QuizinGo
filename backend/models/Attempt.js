const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    review: [
      {
        questionId: String,
        question: String,
        options: [String],
        correctAnswer: String,
        userAnswer: String,
        isCorrect: Boolean,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
