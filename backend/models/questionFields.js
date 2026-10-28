const mongoose = require("mongoose");

const QUESTION_TYPES = [
  "mcq",
  "multi",
  "truefalse",
  "shortanswer",
  "numerical",
  "matching",
];

const pairSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    match: { type: String, required: true },
  },
  { _id: false }
);

// mcq/truefalse: answer is a string; multi/shortanswer: array of strings; numerical: number.
const questionFields = {
  type: { type: String, enum: QUESTION_TYPES, default: "mcq" },
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  answer: { type: mongoose.Schema.Types.Mixed },
  tolerance: { type: Number, default: 0 },
  pairs: { type: [pairSchema], default: [] },
  marks: { type: Number, default: 1, min: 0 },
  feedback: { type: String, default: "" },
};

module.exports = { QUESTION_TYPES, questionFields };
