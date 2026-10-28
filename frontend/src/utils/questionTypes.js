export const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple choice", hint: "One correct option" },
  { value: "multi", label: "Multiple answer", hint: "Several correct options, partial credit" },
  { value: "truefalse", label: "True / False", hint: "Simple true or false statement" },
  { value: "shortanswer", label: "Short answer", hint: "Typed answer, supports * wildcard" },
  { value: "numerical", label: "Numerical", hint: "Number with an accepted error margin" },
  { value: "matching", label: "Matching", hint: "Match each item to its answer" },
];

export const typeLabel = (type) =>
  QUESTION_TYPES.find((item) => item.value === type)?.label || "Multiple choice";

let keyCounter = 0;
const newKey = () => `q${Date.now().toString(36)}${(keyCounter += 1)}`;

const asArray = (value) =>
  Array.isArray(value) ? value : value == null || value === "" ? [] : [value];

const norm = (value) => String(value ?? "").trim().toLowerCase();

export function emptyEditorQuestion(type = "mcq") {
  return {
    key: newKey(),
    id: undefined,
    type,
    question: "",
    options: ["", "", "", ""],
    correct: [],
    tfAnswer: "True",
    accepted: "",
    numAnswer: "",
    tolerance: "0",
    pairs: [
      { prompt: "", match: "" },
      { prompt: "", match: "" },
      { prompt: "", match: "" },
    ],
    marks: 1,
    feedback: "",
    category: undefined,
  };
}

/** API/import question -> editor state. Ids are only kept when editing an existing quiz. */
export function toEditorQuestion(question, { keepId = false } = {}) {
  const type = question.type || "mcq";
  const editor = emptyEditorQuestion(type);

  editor.id = keepId ? question.id : undefined;
  editor.question = question.question || "";
  editor.marks = question.marks ?? 1;
  editor.feedback = question.feedback || "";
  editor.category = question.category;

  if (type === "mcq" || type === "multi") {
    if (question.options?.length) editor.options = [...question.options];
    const answers = asArray(question.answer).map(norm);
    editor.correct = editor.options
      .map((option, index) => (answers.includes(norm(option)) ? index : -1))
      .filter((index) => index >= 0);
    if (type === "mcq") editor.correct = editor.correct.slice(0, 1);
  } else if (type === "truefalse") {
    editor.tfAnswer = norm(question.answer) === "false" ? "False" : "True";
  } else if (type === "shortanswer") {
    editor.accepted = asArray(question.answer).join("\n");
  } else if (type === "numerical") {
    editor.numAnswer =
      question.answer == null || question.answer === "" ? "" : String(question.answer);
    editor.tolerance = String(question.tolerance || 0);
  } else if (type === "matching" && question.pairs?.length) {
    editor.pairs = question.pairs.map((pair) => ({ prompt: pair.prompt, match: pair.match }));
  }

  return editor;
}

/** Editor state -> API payload. */
export function fromEditorQuestion(editor) {
  const base = {
    id: editor.id,
    type: editor.type,
    question: editor.question.trim(),
    marks: Number(editor.marks) || 1,
    feedback: editor.feedback.trim(),
    category: editor.category,
  };

  const options = editor.options
    .map((text, index) => ({ text: text.trim(), index }))
    .filter((option) => option.text);
  const chosen = options.filter((option) => editor.correct.includes(option.index));

  switch (editor.type) {
    case "mcq":
      return { ...base, options: options.map((o) => o.text), answer: chosen[0]?.text || "" };
    case "multi":
      return { ...base, options: options.map((o) => o.text), answer: chosen.map((o) => o.text) };
    case "truefalse":
      return { ...base, options: ["True", "False"], answer: editor.tfAnswer };
    case "shortanswer":
      return {
        ...base,
        answer: editor.accepted
          .split(/\n|\|/)
          .map((value) => value.trim())
          .filter(Boolean),
      };
    case "numerical":
      return {
        ...base,
        answer: editor.numAnswer === "" ? "" : Number(String(editor.numAnswer).replace(",", ".")),
        tolerance: Math.abs(Number(String(editor.tolerance).replace(",", ".")) || 0),
      };
    case "matching":
      return {
        ...base,
        pairs: editor.pairs
          .map((pair) => ({ prompt: pair.prompt.trim(), match: pair.match.trim() }))
          .filter((pair) => pair.prompt && pair.match),
      };
    default:
      return base;
  }
}

export function validateEditorQuestion(editor) {
  if (!editor.question.trim()) return "Question text is required";
  if (!(Number(editor.marks) > 0)) return "Marks must be greater than 0";

  const payload = fromEditorQuestion(editor);

  switch (editor.type) {
    case "mcq":
    case "multi":
      if (payload.options.length < 2) return "Add at least 2 options";
      if (asArray(payload.answer).length === 0 || payload.answer === "") {
        return editor.type === "mcq" ? "Select the correct option" : "Select at least one correct option";
      }
      return null;
    case "shortanswer":
      return payload.answer.length ? null : "Add at least one accepted answer";
    case "numerical":
      return payload.answer === "" || !Number.isFinite(payload.answer)
        ? "Enter a numerical answer"
        : null;
    case "matching":
      return payload.pairs.length >= 2 ? null : "Add at least 2 complete pairs";
    default:
      return null;
  }
}

export function summarizeAnswer(question) {
  const type = question.type || "mcq";
  switch (type) {
    case "multi":
      return asArray(question.answer).join(", ");
    case "shortanswer":
      return asArray(question.answer).join(" / ");
    case "numerical":
      return question.tolerance
        ? `${question.answer} ± ${question.tolerance}`
        : String(question.answer ?? "");
    case "matching":
      return `${question.pairs?.length || 0} pairs`;
    default:
      return String(question.answer ?? "");
  }
}

export function isAnswered(question, value) {
  if (value == null) return false;
  if (question.type === "multi") return Array.isArray(value) && value.length > 0;
  if (question.type === "matching") {
    return question.prompts.every((_, index) => String(value[index] ?? "").trim() !== "");
  }
  return String(value).trim() !== "";
}

export const TYPE_INSTRUCTIONS = {
  mcq: "Select one correct answer.",
  multi: "Select all answers that apply. Wrong picks reduce your score.",
  truefalse: "Is this statement true or false?",
  shortanswer: "Type your answer. Spelling matters, capital letters don't.",
  numerical: "Enter a number.",
  matching: "Choose the matching answer for each item.",
};

export const TEMPLATES = {
  text: {
    label: "Plain text / Aiken (.txt)",
    filename: "quizingo-text-template.txt",
    content: `1. What is the capital of France?
A) Berlin
B) Paris
C) Madrid
D) Rome
Answer: B
Feedback: Paris has been the capital since 987 AD.

2. Which of these are prime numbers?
A) 2
B) 4
C) 7
D) 9
Answer: A, C
Marks: 2

3. The sun rises in the east.
Answer: True

4. What is 12 x 12?
Answer: 144

5. Value of pi to two decimals?
Answer: 3.14 ± 0.01

6. Who wrote Romeo and Juliet?
Answer: Shakespeare | William Shakespeare

7. Match each country to its capital
India -> New Delhi
Japan -> Tokyo
Egypt -> Cairo
`,
  },
  gift: {
    label: "Moodle GIFT (.gift)",
    filename: "quizingo-gift-template.gift",
    content: `// Moodle GIFT format
$CATEGORY: Science

::Q1:: Which planet is known as the Red Planet? {=Mars ~Venus ~Jupiter ~Mercury}

::Q2:: Select the prime numbers {~%50%2 ~%50%7 ~%-50%4 ~%-50%9}

::Q3:: The Pacific is the largest ocean. {T}

::Q4:: Who wrote Hamlet? {=Shakespeare =William Shakespeare}

::Q5:: What is the value of pi? {#3.14:0.01}

::Q6:: Match the country to its capital. {
=India -> New Delhi
=Japan -> Tokyo
=France -> Paris
}
`,
  },
  csv: {
    label: "CSV / Excel (.csv)",
    filename: "quizingo-csv-template.csv",
    content: `question,type,options,answer,marks,feedback
"What is the capital of France?",mcq,Berlin|Paris|Madrid|Rome,B,1,"Paris is the capital."
"Which are prime numbers?",multi,2|4|7|9,A|C,2,
"The sun rises in the east.",truefalse,,True,1,
"Who wrote Hamlet?",shortanswer,,Shakespeare|William Shakespeare,1,
"Value of pi (2 decimals)?",numerical,,3.14:0.01,1,
"Match countries to capitals",matching,India->New Delhi|Japan->Tokyo|Egypt->Cairo,,2,
`,
  },
};

export function downloadTemplate(key) {
  const template = TEMPLATES[key];
  if (!template) return;
  const blob = new Blob([template.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = template.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
