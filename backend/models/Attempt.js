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
    status: {
      type: String,
      enum: ["in_progress", "submitted"],
      default: "submitted",
    },
    startedAt: { type: Date, default: Date.now },
    deadline: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    // Per-question display order fixed at start so shuffles survive page reloads.
    layout: { type: mongoose.Schema.Types.Mixed, default: [] },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    review: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, minimize: false }
);

attemptSchema.index({ quiz: 1, student: 1, status: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
