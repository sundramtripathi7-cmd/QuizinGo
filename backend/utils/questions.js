const { QUESTION_TYPES } = require("../models/questionFields");

class ValidationError extends Error {}

const clean = (value) => String(value ?? "").trim();

const normalizeText = (value) =>
  clean(value).toLowerCase().replace(/\s+/g, " ");

const uniqueNonEmpty = (list) => {
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = clean(item);
    if (text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }
  return result;
};

const findOption = (options, value) => {
  const target = normalizeText(value);
  return options.find((option) => normalizeText(option) === target);
};

const toTrueFalse = (value) => {
  if (value === true) return "True";
  if (value === false) return "False";
  const text = normalizeText(value);
  if (["true", "t", "yes"].includes(text)) return "True";
  if (["false", "f", "no"].includes(text)) return "False";
  return null;
};

/**
 * Validates a question coming from the client or an import and returns the
 * canonical shape stored in MongoDB. Throws ValidationError with a readable message.
 */
function normalizeQuestion(raw, index = 0) {
  const label = `Question ${index + 1}`;
  const type = QUESTION_TYPES.includes(raw?.type) ? raw.type : "mcq";
  const question = clean(raw?.question);

  if (!question) {
    throw new ValidationError(`${label}: question text is required`);
  }

  const marks = Number(raw?.marks);
  const base = {
    type,
    question,
    marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
    feedback: clean(raw?.feedback),
    options: [],
    pairs: [],
    tolerance: 0,
  };

  if (type === "mcq" || type === "multi") {
    const options = uniqueNonEmpty(raw?.options);
    if (options.length < 2) {
      throw new ValidationError(`${label}: needs at least 2 options`);
    }

    const answers = (Array.isArray(raw?.answer) ? raw.answer : [raw?.answer])
      .map((value) => findOption(options, value))
      .filter(Boolean);
    const unique = [...new Set(answers)];

    if (unique.length === 0) {
      throw new ValidationError(`${label}: mark the correct option`);
    }

    if (type === "mcq") {
      return { ...base, options, answer: unique[0] };
    }
    return { ...base, options, answer: unique };
  }

  if (type === "truefalse") {
    const answer = toTrueFalse(raw?.answer);
    if (!answer) {
      throw new ValidationError(`${label}: answer must be True or False`);
    }
    return { ...base, options: ["True", "False"], answer };
  }

  if (type === "shortanswer") {
    const list = Array.isArray(raw?.answer)
      ? raw.answer
      : clean(raw?.answer).split("|");
    const answer = uniqueNonEmpty(list);
    if (answer.length === 0) {
      throw new ValidationError(`${label}: add at least one accepted answer`);
    }
    return { ...base, answer };
  }

  if (type === "numerical") {
    const answer = Number(raw?.answer);
    const tolerance = Math.abs(Number(raw?.tolerance) || 0);
    if (raw?.answer === "" || raw?.answer == null || !Number.isFinite(answer)) {
      throw new ValidationError(`${label}: numerical answer must be a number`);
    }
    return { ...base, answer, tolerance };
  }

  if (type === "matching") {
    const pairs = (Array.isArray(raw?.pairs) ? raw.pairs : [])
      .map((pair) => ({ prompt: clean(pair?.prompt), match: clean(pair?.match) }))
      .filter((pair) => pair.prompt && pair.match);
    if (pairs.length < 2) {
      throw new ValidationError(`${label}: matching needs at least 2 complete pairs`);
    }
    return { ...base, pairs, answer: null };
  }

  throw new ValidationError(`${label}: unsupported question type`);
}

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function buildLayout(quiz) {
  const ordered = quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;

  return ordered.map((question) => {
    const entry = { questionId: question._id.toString() };
    if (question.type === "mcq" || question.type === "multi" || !question.type) {
      entry.options = quiz.shuffleAnswers
        ? shuffle(question.options)
        : [...question.options];
    }
    if (question.type === "matching") {
      entry.choices = shuffle([...new Set(question.pairs.map((pair) => pair.match))]);
    }
    return entry;
  });
}

function toStudentQuestion(question, layoutEntry = {}) {
  const type = question.type || "mcq";
  const base = {
    id: question._id.toString(),
    type,
    question: question.question,
    marks: question.marks ?? 1,
  };

  if (type === "mcq" || type === "multi") {
    return { ...base, options: layoutEntry.options || question.options };
  }
  if (type === "truefalse") {
    return { ...base, options: ["True", "False"] };
  }
  if (type === "matching") {
    return {
      ...base,
      prompts: question.pairs.map((pair) => pair.prompt),
      choices: layoutEntry.choices || question.pairs.map((pair) => pair.match),
    };
  }
  return base;
}

const wildcardMatch = (pattern, value) => {
  const escaped = normalizeText(pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$`).test(normalizeText(value));
};

const isEmptyResponse = (type, response) => {
  if (response == null) return true;
  if (type === "multi") return !Array.isArray(response) || response.length === 0;
  if (type === "matching") {
    return typeof response !== "object" || Object.values(response).every((v) => !clean(v));
  }
  return clean(response) === "";
};

/** Returns the fraction (0..1) of the question's marks earned by a response. */
function scoreFraction(question, response) {
  const type = question.type || "mcq";

  switch (type) {
    case "mcq":
    case "truefalse":
      return normalizeText(response) === normalizeText(question.answer) ? 1 : 0;

    case "multi": {
      const correct = new Set((question.answer || []).map(normalizeText));
      const selected = new Set((response || []).map(normalizeText));
      let right = 0;
      let wrong = 0;
      selected.forEach((value) => (correct.has(value) ? (right += 1) : (wrong += 1)));
      return correct.size ? Math.max(0, (right - wrong) / correct.size) : 0;
    }

    case "shortanswer":
      return (question.answer || []).some((accepted) => wildcardMatch(accepted, response))
        ? 1
        : 0;

    case "numerical": {
      const value = Number(String(response).replace(",", "."));
      if (!Number.isFinite(value)) return 0;
      return Math.abs(value - question.answer) <= (question.tolerance || 0) + 1e-9 ? 1 : 0;
    }

    case "matching": {
      const pairs = question.pairs || [];
      if (!pairs.length) return 0;
      const right = pairs.filter(
        (pair, index) => normalizeText(response?.[index]) === normalizeText(pair.match)
      ).length;
      return right / pairs.length;
    }

    default:
      return 0;
  }
}

function correctAnswerDisplay(question) {
  const type = question.type || "mcq";
  if (type === "matching") {
    return question.pairs.map((pair) => `${pair.prompt} → ${pair.match}`);
  }
  if (type === "numerical") {
    return question.tolerance
      ? `${question.answer} (± ${question.tolerance})`
      : String(question.answer);
  }
  return question.answer;
}

function gradeQuestion(question, response) {
  const type = question.type || "mcq";
  const marks = question.marks ?? 1;
  const unanswered = isEmptyResponse(type, response);
  const fraction = unanswered ? 0 : scoreFraction(question, response);
  const earned = Math.round(marks * fraction * 100) / 100;

  let status = "wrong";
  if (unanswered) status = "unanswered";
  else if (fraction >= 1) status = "correct";
  else if (fraction > 0) status = "partial";

  return {
    questionId: question._id.toString(),
    type,
    question: question.question,
    options: question.options || [],
    prompts: type === "matching" ? question.pairs.map((pair) => pair.prompt) : [],
    marks,
    earned,
    status,
    isCorrect: status === "correct",
    userAnswer: unanswered ? null : response,
    correctAnswer: correctAnswerDisplay(question),
    feedback: question.feedback || "",
  };
}

const totalMarks = (questions) =>
  Math.round(questions.reduce((sum, q) => sum + (q.marks ?? 1), 0) * 100) / 100;

module.exports = {
  ValidationError,
  normalizeQuestion,
  buildLayout,
  toStudentQuestion,
  gradeQuestion,
  totalMarks,
};
