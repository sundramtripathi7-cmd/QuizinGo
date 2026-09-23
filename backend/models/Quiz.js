const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: "Each question needs at least 2 options",
      },
    },
    answer: { type: String, required: true },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    duration: { type: Number, default: 30 },
    marks: { type: Number, default: 0 },
    icon: { type: String, default: "📝" },
    color: {
      type: String,
      enum: ["", "blue", "green", "orange", "pink"],
      default: "",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherName: { type: String, default: "Teacher" },
    questions: { type: [questionSchema], default: [] },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizSchema.virtual("questionCount").get(function questionCount() {
  return this.questions.length;
});

quizSchema.set("toJSON", { virtuals: true });
quizSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Quiz", quizSchema);
