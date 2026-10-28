const test = require("node:test");
const assert = require("node:assert/strict");
const { parseQuestions, detectFormat } = require("../utils/parsers");

test("Aiken format", () => {
  const text = `What is the capital of France?
A. Berlin
B. Paris
C. Madrid
ANSWER: B

Which gas do plants absorb?
A) Oxygen
B) Carbon dioxide
ANSWER: B`;

  const { format, questions, warnings } = parseQuestions(text);
  assert.equal(format, "text");
  assert.equal(questions.length, 2);
  assert.equal(questions[0].type, "mcq");
  assert.equal(questions[0].answer, "Paris");
  assert.equal(questions[1].answer, "Carbon dioxide");
  assert.equal(warnings.length, 0);
});

test("numbered paper with inline options, multi answers and starred options", () => {
  const text = `1. Which data structure follows LIFO?
A) Queue B) Stack C) Tree D) Graph
Answer: B
2. Select the prime numbers
a. 2
b. 4
c. 7
Answer: A, C
Marks: 2
3. Pick the mammal
A. Shark
*B. Whale
C. Trout
Page 1 of 3`;

  const { questions } = parseQuestions(text);
  assert.equal(questions.length, 3);
  assert.deepEqual(questions[0].options, ["Queue", "Stack", "Tree", "Graph"]);
  assert.equal(questions[0].answer, "Stack");
  assert.equal(questions[1].type, "multi");
  assert.deepEqual(questions[1].answer, ["2", "7"]);
  assert.equal(questions[1].marks, 2);
  assert.equal(questions[2].answer, "Whale");
});

test("plain text infers true/false, numerical, short answer and matching", () => {
  const text = `Q1. The sun is a star.
Answer: True
Q2. What is 7 x 6?
Answer: 42
Q3. Value of g in m/s^2?
Answer: 9.8 ± 0.1
Q4. Who painted the Mona Lisa?
Answer: Leonardo da Vinci | da Vinci
Feedback: Painted in the early 1500s.
Q5. Match the animal to its sound
Dog -> Bark
Cat -> Meow
Cow -> Moo`;

  const { questions } = parseQuestions(text);
  assert.deepEqual(
    questions.map((q) => q.type),
    ["truefalse", "numerical", "numerical", "shortanswer", "matching"]
  );
  assert.equal(questions[0].answer, "True");
  assert.equal(questions[1].answer, 42);
  assert.equal(questions[2].tolerance, 0.1);
  assert.deepEqual(questions[3].answer, ["Leonardo da Vinci", "da Vinci"]);
  assert.equal(questions[3].feedback, "Painted in the early 1500s.");
  assert.equal(questions[4].pairs.length, 3);
});

test("paper headings and instructions are not treated as questions", () => {
  const { questions } = parseQuestions(`Mid-term Examination - Physics
Answer all questions. Each question carries one mark.

1. Unit of force?
A) Newton B) Joule
Answer: A`);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answer, "Newton");
});

test("Word-style text with blank lines between every paragraph", () => {
  const { questions } = parseQuestions(`Q1. Which planet is closest to the sun?

A. Venus

B. Mercury

Answer: B

Marks: 2

Q2. Match the inventor to the invention

Edison -> Light bulb

Bell -> Telephone

Name the largest ocean

Answer: Pacific`);
  assert.deepEqual(questions.map((q) => q.type), ["mcq", "matching", "shortanswer"]);
  assert.equal(questions[0].marks, 2);
  assert.equal(questions[1].pairs.length, 2);
  assert.equal(questions[2].question, "Name the largest ocean");
});

test("missing answer produces a warning instead of failing", () => {
  const { questions, warnings } = parseQuestions(`1. Pick one
A. x
B. y`);
  assert.equal(questions.length, 1);
  assert.equal(warnings[0].index, 0);
});

test("GIFT format covers all supported types", () => {
  const text = `// comment
$CATEGORY: $course$/Science

::Q1:: Which planet is red? {=Mars ~Venus ~Jupiter#Too big}

The earth is flat.{F}

Pick primes {~%50%2 ~%50%3 ~%-100%4}

Who wrote Hamlet? {=Shakespeare =William Shakespeare}

What is pi? {#3.14:0.01}

Match capitals {=India -> Delhi =Japan -> Tokyo =France -> Paris}

Describe your day. {}

Range question {#1..3}`;

  assert.equal(detectFormat(text), "gift");
  const { questions, warnings } = parseQuestions(text);
  assert.deepEqual(
    questions.map((q) => q.type),
    ["mcq", "truefalse", "multi", "shortanswer", "numerical", "matching", "numerical"]
  );
  assert.equal(questions[0].answer, "Mars");
  assert.deepEqual(questions[0].options, ["Mars", "Venus", "Jupiter"]);
  assert.equal(questions[0].category, "Science");
  assert.equal(questions[1].answer, "False");
  assert.deepEqual(questions[2].answer, ["2", "3"]);
  assert.equal(questions[4].tolerance, 0.01);
  assert.equal(questions[6].answer, 2);
  assert.equal(questions[6].tolerance, 1);
  assert.ok(warnings.some((w) => /essay/i.test(w.message)));
});

test("CSV format with explicit and inferred types", () => {
  const text = `question,type,options,answer,marks,feedback
"What is 2+2?",mcq,3|4|5,B,1,
"Pick even numbers",multi,1|2|4,2|4,2,
"Water boils at 100C at sea level",truefalse,,True,,
"Capital of Italy",shortanswer,,Rome,,
"Match",matching,A->1|B->2,,,`;

  assert.equal(detectFormat(text), "csv");
  const { questions } = parseQuestions(text);
  assert.deepEqual(
    questions.map((q) => q.type),
    ["mcq", "multi", "truefalse", "shortanswer", "matching"]
  );
  assert.equal(questions[0].answer, "4");
  assert.deepEqual(questions[1].answer, ["2", "4"]);
  assert.equal(questions[1].marks, 2);
});
