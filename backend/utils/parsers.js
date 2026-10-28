const LETTER_RE = /^\(?([A-Ja-j])[.)]?$/;

const clean = (value) => String(value ?? "").trim();
const normalizeText = (value) => clean(value).toLowerCase().replace(/\s+/g, " ");

const letterIndex = (letter) => letter.toUpperCase().charCodeAt(0) - 65;

const toTrueFalse = (value) => {
  const text = normalizeText(value).replace(/[.]$/, "");
  if (["true", "t", "yes"].includes(text)) return "True";
  if (["false", "f", "no"].includes(text)) return "False";
  return null;
};

const NUMERIC_RE =
  /^(-?\d+(?:[.,]\d+)?)\s*(?:(?:±|\+\/-|\+-|:)\s*(\d+(?:[.,]\d+)?))?$/;

const toNumber = (value) => Number(String(value).replace(",", "."));

/* ------------------------------------------------------------------ */
/* Plain text: Aiken, numbered question papers, PDF/DOCX extracted text */
/* ------------------------------------------------------------------ */

const QUESTION_START_RE =
  /^(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*[.):\-]\s+(.*)$|^Q(?:uestion)?\.?\s*(\d{1,3})\s*[.):\-]?\s*(.*)$/i;
const OPTION_RE = /^(\*)?\s*\(?([A-Ja-j])\s*[.)\]]\s+(.+?)\s*(\*|✓|✔)?$/;
const ANSWER_RE =
  /^(?:correct\s+answers?|answers?|ans)\s*[:\-=.]\s*(.+)$/i;
const FEEDBACK_RE = /^(?:feedback|explanation|solution)\s*[:\-]\s*(.+)$/i;
const MARKS_RE = /^(?:marks?|points?|score)\s*[:\-=]\s*(\d+(?:\.\d+)?)/i;
const TYPE_RE = /^type\s*[:\-=]\s*([\w/ -]+)$/i;
const PAIR_RE = /^(.+?)\s*(?:->|=>|→)\s*(.+)$/;
const NOISE_RE = /^(?:page\s+\d+(?:\s+of\s+\d+)?|-\s*\d+\s*-)$/i;

const TYPE_ALIASES = {
  mcq: "mcq",
  multichoice: "mcq",
  "multiple choice": "mcq",
  single: "mcq",
  multi: "multi",
  multiple: "multi",
  checkbox: "multi",
  "multiple answer": "multi",
  truefalse: "truefalse",
  "true/false": "truefalse",
  tf: "truefalse",
  boolean: "truefalse",
  shortanswer: "shortanswer",
  short: "shortanswer",
  "short answer": "shortanswer",
  text: "shortanswer",
  numerical: "numerical",
  number: "numerical",
  numeric: "numerical",
  matching: "matching",
  match: "matching",
};

const resolveType = (value) => TYPE_ALIASES[normalizeText(value)] || null;

// PDFs often put every option on one line: "A) Stack B) Queue C) Tree".
function splitInlineOptions(line) {
  const re = /(^|\s)\(?([A-Ja-j])[.)]\s+/g;
  const marks = [];
  let match;
  while ((match = re.exec(line))) {
    marks.push({ index: match.index + match[1].length, letter: match[2].toUpperCase() });
  }
  if (marks.length < 2 || marks[0].index !== 0) return [line];
  for (let i = 1; i < marks.length; i += 1) {
    if (marks[i].letter.charCodeAt(0) !== marks[i - 1].letter.charCodeAt(0) + 1) {
      return [line];
    }
  }
  return marks.map((mark, i) =>
    line.slice(mark.index, i + 1 < marks.length ? marks[i + 1].index : undefined).trim()
  );
}

function preprocessLines(text) {
  const lines = [];
  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\t/g, " ").replace(/\u00a0/g, " ").trim();
    if (NOISE_RE.test(line)) continue;

    // "D) Graph   Answer: A" -> two lines
    const parts = line.split(/\s+(?=(?:Correct\s+[Aa]nswer|ANSWER|Answer|Ans)\s*[:=])/);
    for (const part of parts) {
      lines.push(...splitInlineOptions(part.trim()));
    }
  }
  return lines;
}

function resolveAnswerIndices(raw, options) {
  const text = clean(raw);
  if (!text) return [];

  const letterTokens = text
    .replace(/\band\b|&/gi, ",")
    .split(/[\s,;|/]+/)
    .filter(Boolean);
  if (letterTokens.length && letterTokens.every((token) => LETTER_RE.test(token))) {
    return [
      ...new Set(
        letterTokens
          .map((token) => letterIndex(token.match(LETTER_RE)[1]))
          .filter((index) => index < options.length)
      ),
    ];
  }

  const prefixed = text.match(/^\(?([A-Ja-j])[.)]\s+/);
  if (prefixed && letterIndex(prefixed[1]) < options.length) {
    return [letterIndex(prefixed[1])];
  }

  const normalized = options.map(normalizeText);
  const whole = normalized.indexOf(normalizeText(text));
  if (whole >= 0) return [whole];

  return [
    ...new Set(
      text
        .split(/\s*[|;]\s*/)
        .map((part) => normalized.indexOf(normalizeText(part)))
        .filter((index) => index >= 0)
    ),
  ];
}

/** Turns a collected draft (text, options, answer line...) into a typed question. */
function buildQuestion(draft) {
  const warnings = [];
  const options = draft.options.map((option) => clean(option.text)).filter(Boolean);
  const base = {
    type: "mcq",
    question: clean(draft.text),
    options: [],
    answer: "",
    tolerance: 0,
    pairs: [],
    marks: draft.marks || 1,
    feedback: clean(draft.feedback),
    category: draft.category || undefined,
  };
  const forced = draft.type;

  if (!base.question) warnings.push("Question text is missing");

  if (forced === "matching" || (!options.length && draft.pairs.length >= 2)) {
    const pairs = draft.pairs.length
      ? draft.pairs
      : options.map((option) => option.match(PAIR_RE)).filter(Boolean)
          .map((m) => ({ prompt: clean(m[1]), match: clean(m[2]) }));
    if (pairs.length < 2) warnings.push("Matching needs at least 2 pairs (use 'item -> match')");
    return { question: { ...base, type: "matching", pairs, answer: null }, warnings };
  }

  if (options.length >= 2 && !["shortanswer", "numerical"].includes(forced)) {
    const starred = draft.options
      .map((option, index) => (option.starred ? index : -1))
      .filter((index) => index >= 0);
    let indices =
      draft.answerRaw != null ? resolveAnswerIndices(draft.answerRaw, options) : [];
    if (!indices.length) indices = starred;

    const isTrueFalse =
      options.length === 2 && options.every((option) => toTrueFalse(option));
    if ((isTrueFalse || forced === "truefalse") && indices.length === 1) {
      return {
        question: {
          ...base,
          type: "truefalse",
          options: ["True", "False"],
          answer: toTrueFalse(options[indices[0]]) || "True",
        },
        warnings,
      };
    }

    if (!indices.length) {
      warnings.push("No correct answer found — select it before saving");
    }

    const type = forced === "multi" || indices.length > 1 ? "multi" : "mcq";
    return {
      question: {
        ...base,
        type,
        options,
        answer:
          type === "multi"
            ? indices.map((index) => options[index])
            : indices.length
              ? options[indices[0]]
              : "",
      },
      warnings,
    };
  }

  const answerRaw = clean(draft.answerRaw);
  if (!answerRaw) {
    warnings.push("No options or answer found — complete this question before saving");
    return { question: { ...base, type: forced || "shortanswer", answer: [] }, warnings };
  }

  const trueFalse = toTrueFalse(answerRaw);
  if ((trueFalse && forced !== "shortanswer") || forced === "truefalse") {
    return {
      question: {
        ...base,
        type: "truefalse",
        options: ["True", "False"],
        answer: trueFalse || "True",
      },
      warnings,
    };
  }

  const numeric = answerRaw.match(NUMERIC_RE);
  if ((numeric && forced !== "shortanswer") || forced === "numerical") {
    if (!numeric) warnings.push("Numerical answer could not be read");
    return {
      question: {
        ...base,
        type: "numerical",
        answer: numeric ? toNumber(numeric[1]) : "",
        tolerance: numeric && numeric[2] ? toNumber(numeric[2]) : 0,
      },
      warnings,
    };
  }

  return {
    question: {
      ...base,
      type: "shortanswer",
      answer: answerRaw.split(/\s*[|;]\s*/).map(clean).filter(Boolean),
    },
    warnings,
  };
}

const newDraft = (text = "", numbered = false) => ({
  text,
  numbered,
  options: [],
  pairs: [],
  answerRaw: null,
  feedback: "",
  marks: null,
  type: null,
});

function parsePlainText(text) {
  const drafts = [];
  let current = null;

  const flush = () => {
    if (!current || !(current.text || current.options.length)) {
      current = null;
      return;
    }
    // Paper titles and instructions: unnumbered text with nothing that makes it a question.
    const isHeading =
      !current.numbered &&
      !current.options.length &&
      !current.pairs.length &&
      current.answerRaw == null;
    if (!isHeading) drafts.push(current);
    current = null;
  };

  // Blank lines are ignored: Word/PDF extraction inserts them between every paragraph,
  // so question boundaries come from numbering, answer lines and pair blocks instead.
  for (const line of preprocessLines(text)) {
    if (!line) continue;

    const answer = line.match(ANSWER_RE);
    if (answer && current) {
      current.answerRaw = answer[1];
      continue;
    }

    const feedback = line.match(FEEDBACK_RE);
    if (feedback && current) {
      current.feedback = feedback[1];
      continue;
    }

    const marks = line.match(MARKS_RE);
    if (marks && current) {
      current.marks = Number(marks[1]);
      continue;
    }

    const type = line.match(TYPE_RE);
    if (type && current && resolveType(type[1])) {
      current.type = resolveType(type[1]);
      continue;
    }

    const start = line.match(QUESTION_START_RE);
    if (start) {
      flush();
      current = newDraft(clean(start[2] ?? start[4]), true);
      continue;
    }

    const option = line.match(OPTION_RE);
    if (option && current && current.text && current.answerRaw == null) {
      current.options.push({ text: option[3], starred: Boolean(option[1] || option[4]) });
      continue;
    }

    const pair = line.match(PAIR_RE);
    if (pair && current && current.text && !current.options.length && current.answerRaw == null) {
      current.pairs.push({ prompt: clean(pair[1]), match: clean(pair[2]) });
      continue;
    }

    if (!current) {
      current = newDraft(line);
    } else if (current.answerRaw != null || current.pairs.length) {
      flush();
      current = newDraft(line);
    } else if (current.options.length) {
      // Wrapped option text from PDFs.
      const last = current.options[current.options.length - 1];
      last.text = `${last.text} ${line}`;
    } else {
      current.text = current.text ? `${current.text} ${line}` : line;
    }
  }
  flush();

  return drafts.map(buildQuestion);
}

/* ------------------------------------------------------------------ */
/* Moodle GIFT format                                                   */
/* ------------------------------------------------------------------ */

const giftUnescape = (value) =>
  clean(value).replace(/\\([~=#{}:\\n])/g, (_, ch) => (ch === "n" ? "\n" : ch));

const indexOfUnescaped = (text, ch, from = 0) => {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\\") {
      i += 1;
    } else if (text.startsWith(ch, i)) {
      return i;
    }
  }
  return -1;
};

const lastIndexOfUnescaped = (text, ch) => {
  let found = -1;
  let index = indexOfUnescaped(text, ch);
  while (index >= 0) {
    found = index;
    index = indexOfUnescaped(text, ch, index + 1);
  }
  return found;
};

function giftTokens(body) {
  const tokens = [];
  let current = null;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "\\") {
      if (current) current.text += ch + (body[i + 1] ?? "");
      i += 1;
    } else if (ch === "=" || ch === "~") {
      current = { marker: ch, text: "" };
      tokens.push(current);
    } else if (current) {
      current.text += ch;
    }
  }

  return tokens.map((token) => {
    let text = token.text;
    let weight = null;
    const weightMatch = text.match(/^\s*%(-?\d+(?:\.\d+)?)%/);
    if (weightMatch) {
      weight = Number(weightMatch[1]);
      text = text.slice(weightMatch[0].length);
    }
    const hash = indexOfUnescaped(text, "#");
    if (hash >= 0) text = text.slice(0, hash);
    return { marker: token.marker, weight, raw: text, text: giftUnescape(text) };
  });
}

function parseGiftNumber(value) {
  const text = clean(value).replace(/^=/, "");
  const range = text.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return { answer: (min + max) / 2, tolerance: Math.abs(max - min) / 2 };
  }
  const single = text.match(/^(-?\d+(?:\.\d+)?)(?:\s*:\s*(\d+(?:\.\d+)?))?/);
  if (single) {
    return { answer: Number(single[1]), tolerance: Number(single[2] || 0) };
  }
  return null;
}

function parseGift(text) {
  const results = [];
  let category;

  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"));

  const blocks = lines.join("\n").split(/\n\s*\n/);

  for (const rawBlock of blocks) {
    let block = rawBlock.trim();
    if (!block) continue;

    const cat = block.match(/^\$CATEGORY:\s*(.+)$/im);
    if (cat) {
      category = clean(cat[1]).split("/").pop();
      block = block.replace(/^\$CATEGORY:.*$/im, "").trim();
      if (!block) continue;
    }

    let title = "";
    if (block.startsWith("::")) {
      const end = block.indexOf("::", 2);
      if (end > 0) {
        title = block.slice(2, end).trim();
        block = block.slice(end + 2).trim();
      }
    }

    const open = indexOfUnescaped(block, "{");
    const close = lastIndexOfUnescaped(block, "}");
    if (open < 0 || close < open) {
      results.push({
        question: null,
        warnings: [`Skipped "${(title || block).slice(0, 40)}": no answer block {…}`],
      });
      continue;
    }

    const before = block.slice(0, open).replace(/^\[(html|moodle|markdown|plain)\]/i, "");
    const after = block.slice(close + 1);
    let body = block.slice(open + 1, close).trim();

    let questionText = giftUnescape(before);
    if (clean(after)) questionText = `${questionText} _____ ${giftUnescape(after)}`;
    questionText = questionText.replace(/<[^>]+>/g, "").trim() || title;

    let feedback = "";
    const general = body.indexOf("####");
    if (general >= 0) {
      feedback = giftUnescape(body.slice(general + 4));
      body = body.slice(0, general).trim();
    }

    const base = {
      question: questionText,
      options: [],
      answer: "",
      tolerance: 0,
      pairs: [],
      marks: 1,
      feedback,
      category,
    };

    if (!body) {
      results.push({
        question: null,
        warnings: [`Skipped essay question "${questionText.slice(0, 40)}" (essays need manual grading)`],
      });
      continue;
    }

    const trueFalse = body.match(/^(T|TRUE|F|FALSE)\s*(#.*)?$/i);
    if (trueFalse) {
      results.push({
        question: {
          ...base,
          type: "truefalse",
          options: ["True", "False"],
          answer: trueFalse[1].toUpperCase().startsWith("T") ? "True" : "False",
        },
        warnings: [],
      });
      continue;
    }

    if (body.startsWith("#")) {
      const firstAnswer = giftTokens(body.slice(1).trim().startsWith("=") ? body.slice(1) : `=${body.slice(1)}`)
        .find((token) => token.marker === "=");
      const parsed = firstAnswer ? parseGiftNumber(firstAnswer.raw) : null;
      results.push({
        question: {
          ...base,
          type: "numerical",
          answer: parsed ? parsed.answer : "",
          tolerance: parsed ? parsed.tolerance : 0,
        },
        warnings: parsed ? [] : ["Numerical answer could not be read"],
      });
      continue;
    }

    const tokens = giftTokens(body);

    if (tokens.some((token) => token.raw.includes("->"))) {
      const pairs = tokens
        .filter((token) => token.marker === "=")
        .map((token) => {
          const [prompt, match] = token.raw.split("->");
          return { prompt: giftUnescape(prompt), match: giftUnescape(match) };
        })
        .filter((pair) => pair.prompt && pair.match);
      results.push({
        question: { ...base, type: "matching", pairs, answer: null },
        warnings: pairs.length < 2 ? ["Matching needs at least 2 pairs"] : [],
      });
      continue;
    }

    const equals = tokens.filter((token) => token.marker === "=");
    const tildes = tokens.filter((token) => token.marker === "~");

    if (!tildes.length) {
      results.push({
        question: {
          ...base,
          type: "shortanswer",
          answer: equals.map((token) => token.text).filter(Boolean),
        },
        warnings: equals.length ? [] : ["No accepted answers found"],
      });
      continue;
    }

    const options = tokens.map((token) => token.text).filter(Boolean);
    const weighted = tildes.filter((token) => token.weight > 0);

    if (!equals.length && weighted.length) {
      const correct = weighted.map((token) => token.text);
      results.push({
        question: {
          ...base,
          type: correct.length > 1 ? "multi" : "mcq",
          options,
          answer: correct.length > 1 ? correct : correct[0],
        },
        warnings: [],
      });
      continue;
    }

    results.push({
      question: {
        ...base,
        type: equals.length > 1 ? "multi" : "mcq",
        options,
        answer: equals.length > 1 ? equals.map((token) => token.text) : equals[0]?.text || "",
      },
      warnings: equals.length ? [] : ["No correct answer marked with ="],
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* CSV: question,type,options,answer,marks,feedback,tolerance           */
/* ------------------------------------------------------------------ */

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => clean(cell)));
}

function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];

  const header = rows[0].map((cell) => normalizeText(cell));
  const col = (name) => header.indexOf(name);
  if (col("question") < 0) {
    return [{ question: null, warnings: ["CSV needs a header row with a 'question' column"] }];
  }

  return rows.slice(1).map((row) => {
    const get = (name) => (col(name) >= 0 ? clean(row[col(name)]) : "");
    const type = resolveType(get("type"));
    const optionCells = get("options")
      .split("|")
      .map(clean)
      .filter(Boolean);

    const draft = newDraft(get("question"));
    draft.type = type;
    draft.feedback = get("feedback");
    draft.marks = Number(get("marks")) || null;

    if (type === "matching" || optionCells.every((cell) => PAIR_RE.test(cell)) && optionCells.length >= 2 && !get("answer")) {
      draft.pairs = optionCells
        .map((cell) => cell.match(PAIR_RE))
        .filter(Boolean)
        .map((m) => ({ prompt: clean(m[1]), match: clean(m[2]) }));
    } else {
      draft.options = optionCells.map((cell) => ({ text: cell, starred: false }));
    }

    const answer = get("answer");
    const tolerance = get("tolerance");
    draft.answerRaw = answer ? (tolerance ? `${answer}:${tolerance}` : answer) : null;

    return buildQuestion(draft);
  });
}

/* ------------------------------------------------------------------ */

function detectFormat(text, filename = "") {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".gift")) return "gift";
  if (lower.endsWith(".csv")) return "csv";

  const firstLine = clean(text.split(/\r?\n/).find((line) => clean(line)) || "");
  if (/^"?question"?\s*,/i.test(firstLine)) return "csv";

  if (
    /\{\s*(T|F|TRUE|FALSE)\s*\}/i.test(text) ||
    /\{[^{}]*(^|\s)[=~][^{}]*\}/m.test(text) ||
    /\{\s*#/.test(text)
  ) {
    return "gift";
  }

  return "text";
}

function parseQuestions(text, format = "auto", filename = "") {
  const resolved = format === "auto" || !format ? detectFormat(text, filename) : format;
  let results;

  if (resolved === "gift") results = parseGift(text);
  else if (resolved === "csv") results = parseCsv(text);
  else results = parsePlainText(text);

  const questions = [];
  const warnings = [];

  for (const result of results) {
    if (!result.question) {
      warnings.push(...result.warnings.map((message) => ({ index: null, message })));
      continue;
    }
    const index = questions.length;
    questions.push(result.question);
    warnings.push(...result.warnings.map((message) => ({ index, message })));
  }

  return { format: resolved, questions, warnings };
}

module.exports = { parseQuestions, detectFormat };
