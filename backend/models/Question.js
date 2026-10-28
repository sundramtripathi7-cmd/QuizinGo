const mongoose = require("mongoose");
const { questionFields } = require("./questionFields");

const bankQuestionSchema = new mongoose.Schema(
  {
    ...questionFields,
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: { type: String, default: "General", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", bankQuestionSchema);
