const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { normalizeQuestion, gradeQuestion, ValidationError } = require("../utils/questions");

const withId = (question) => ({ ...question, _id: new mongoose.Types.ObjectId() });

test("mcq and true/false grading is case-insensitive", () => {
  const mcq = withId(normalizeQuestion({ type: "mcq", question: "Q", options: ["A", "B"], answer: "b" }));
  assert.equal(mcq.answer, "B");
  assert.equal(gradeQuestion(mcq, "B").status, "correct");
  assert.equal(gradeQuestion(mcq, "A").status, "wrong");
  assert.equal(gradeQuestion(mcq, undefined).status, "unanswered");

  const tf = withId(normalizeQuestion({ type: "truefalse", question: "Q", answer: "t" }));
  assert.equal(gradeQuestion(tf, "True").earned, 1);
});

test("multiple answer gives partial credit and penalises wrong picks", () => {
  const q = withId(
    normalizeQuestion({
      type: "multi",
      question: "Primes",
      options: ["2", "3", "4", "5"],
      answer: ["2", "3", "5"],
      marks: 3,
    })
  );
  assert.equal(gradeQuestion(q, ["2", "3", "5"]).earned, 3);
  assert.equal(gradeQuestion(q, ["2", "3"]).earned, 2);
  assert.equal(gradeQuestion(q, ["2", "3"]).status, "partial");
  assert.equal(gradeQuestion(q, ["2", "4"]).earned, 0);
});

test("short answer supports alternatives and * wildcard", () => {
  const q = withId(normalizeQuestion({ type: "shortanswer", question: "Q", answer: "Paris|*shakespeare" }));
  assert.equal(gradeQuestion(q, " paris ").status, "correct");
  assert.equal(gradeQuestion(q, "William Shakespeare").status, "correct");
  assert.equal(gradeQuestion(q, "London").status, "wrong");
});

test("numerical tolerance", () => {
  const q = withId(normalizeQuestion({ type: "numerical", question: "pi", answer: "3.14", tolerance: 0.01 }));
  assert.equal(gradeQuestion(q, "3.15").status, "correct");
  assert.equal(gradeQuestion(q, "3,13").status, "correct");
  assert.equal(gradeQuestion(q, "3.2").status, "wrong");
});

test("matching gives credit per pair", () => {
  const q = withId(
    normalizeQuestion({
      type: "matching",
      question: "Match",
      marks: 2,
      pairs: [
        { prompt: "India", match: "Delhi" },
        { prompt: "Japan", match: "Tokyo" },
      ],
    })
  );
  assert.equal(gradeQuestion(q, { 0: "Delhi", 1: "Tokyo" }).earned, 2);
  assert.equal(gradeQuestion(q, { 0: "Delhi", 1: "Delhi" }).earned, 1);
});

test("validation rejects incomplete questions", () => {
  assert.throws(
    () => normalizeQuestion({ type: "mcq", question: "Q", options: ["A", "B"], answer: "C" }),
    ValidationError
  );
  assert.throws(() => normalizeQuestion({ type: "numerical", question: "Q", answer: "" }), ValidationError);
  assert.throws(
    () => normalizeQuestion({ type: "matching", question: "Q", pairs: [{ prompt: "a", match: "b" }] }),
    ValidationError
  );
});
