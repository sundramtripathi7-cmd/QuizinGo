const crypto = require("crypto");
const Classroom = require("../models/Classroom");

// No 0/O or 1/I/L so codes can be read aloud or copied from a board.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

const randomCode = () =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");

async function generateUniqueCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    if (!(await Classroom.exists({ code }))) return code;
  }
  throw new Error("Could not generate a unique class code, please try again");
}

const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

async function enrolledClassIds(studentId) {
  const classes = await Classroom.find({ students: studentId }).select("_id");
  return classes.map((item) => item._id);
}

async function isEnrolled(classroomId, studentId) {
  if (!classroomId) return false;
  return Boolean(await Classroom.exists({ _id: classroomId, students: studentId }));
}

module.exports = {
  generateUniqueCode,
  normalizeCode,
  enrolledClassIds,
  isEnrolled,
};
