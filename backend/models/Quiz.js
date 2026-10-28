const mongoose = require("mongoose");
const { questionFields } = require("./questionFields");

const questionSchema = new mongoose.Schema(questionFields, { _id: true });

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
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
      index: true,
    },
    questions: { type: [questionSchema], default: [] },
    isPublished: { type: Boolean, default: true },

    attemptsAllowed: { type: Number, default: 0, min: 0 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleAnswers: { type: Boolean, default: true },
    passPercentage: { type: Number, default: 40, min: 0, max: 100 },
    showCorrectAnswers: { type: Boolean, default: true },
    openAt: { type: Date, default: null },
    closeAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
