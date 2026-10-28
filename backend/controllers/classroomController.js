const mongoose = require("mongoose");
const Classroom = require("../models/Classroom");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const { generateUniqueCode, normalizeCode } = require("../utils/classrooms");

const COLORS = ["", "blue", "green", "orange", "pink"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapClass = (item, extra = {}) => ({
  id: item._id.toString(),
  name: item.name,
  description: item.description,
  icon: item.icon,
  color: item.color || "",
  teacher: item.teacherName,
  studentCount: item.students.length,
  createdAt: item.createdAt,
  ...extra,
});

const mapStudent = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});

function readClassBody(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) {
      const error = new Error("Class name is required");
      error.status = 400;
      throw error;
    }
    data.name = name.slice(0, 120);
  }
  if (body.description !== undefined) data.description = String(body.description || "").trim().slice(0, 1000);
  if (body.icon !== undefined) data.icon = String(body.icon || "🎓").trim().slice(0, 8) || "🎓";
  if (body.color !== undefined) data.color = COLORS.includes(body.color) ? body.color : "";
  if (body.joinEnabled !== undefined) data.joinEnabled = Boolean(body.joinEnabled);
  return data;
}

const fail = (res, error, fallback) =>
  res.status(error.status || 500).json({ message: error.message || fallback });

async function loadOwnClass(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Class not found" });
    return null;
  }
  const item = await Classroom.findById(req.params.id);
  if (!item || item.teacher.toString() !== req.user._id.toString()) {
    res.status(404).json({ message: "Class not found" });
    return null;
  }
  return item;
}

async function quizCounts(classIds, publishedOnly) {
  const match = { classroom: { $in: classIds } };
  if (publishedOnly) match.isPublished = true;
  const counts = await Quiz.aggregate([
    { $match: match },
    { $group: { _id: "$classroom", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(counts.map((item) => [item._id.toString(), item.count]));
}

const listClasses = async (req, res) => {
  try {
    const isTeacher = req.user.role === "teacher";
    const classes = await Classroom.find(
      isTeacher ? { teacher: req.user._id } : { students: req.user._id }
    ).sort({ createdAt: -1 });

    const counts = await quizCounts(classes.map((item) => item._id), !isTeacher);

    return res.json({
      classes: classes.map((item) =>
        mapClass(item, {
          quizCount: counts[item._id.toString()] || 0,
          ...(isTeacher ? { code: item.code, joinEnabled: item.joinEnabled } : {}),
        })
      ),
    });
  } catch (error) {
    return fail(res, error, "Failed to load classes");
  }
};

const createClass = async (req, res) => {
  try {
    const data = readClassBody(req.body);
    const item = await Classroom.create({
      ...data,
      teacher: req.user._id,
      teacherName: req.user.name,
      code: await generateUniqueCode(),
    });
    return res.status(201).json({
      classroom: mapClass(item, { code: item.code, joinEnabled: item.joinEnabled, quizCount: 0 }),
    });
  } catch (error) {
    return fail(res, error, "Failed to create class");
  }
};

const getClass = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;

    await item.populate("students", "name email");
    const quizzes = await Quiz.find({ classroom: item._id })
      .select("title icon color isPublished questions openAt closeAt")
      .sort({ createdAt: -1 });

    return res.json({
      classroom: mapClass(item, {
        code: item.code,
        joinEnabled: item.joinEnabled,
        quizCount: quizzes.length,
        students: item.students
          .filter(Boolean)
          .map(mapStudent)
          .sort((a, b) => a.name.localeCompare(b.name)),
        quizzes: quizzes.map((quiz) => ({
          id: quiz._id.toString(),
          title: quiz.title,
          icon: quiz.icon,
          color: quiz.color || "",
          isPublished: quiz.isPublished,
          questions: quiz.questions.length,
        })),
      }),
    });
  } catch (error) {
    return fail(res, error, "Failed to load class");
  }
};

const updateClass = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;
    item.set(readClassBody(req.body, { partial: true }));
    await item.save();
    return res.json({
      classroom: mapClass(item, { code: item.code, joinEnabled: item.joinEnabled }),
    });
  } catch (error) {
    return fail(res, error, "Failed to update class");
  }
};

const regenerateCode = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;
    item.code = await generateUniqueCode();
    await item.save();
    return res.json({ code: item.code });
  } catch (error) {
    return fail(res, error, "Failed to change the code");
  }
};

const deleteClass = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;
    // Quizzes are kept (with their results) but become hidden until moved to another class.
    const { modifiedCount } = await Quiz.updateMany(
      { classroom: item._id },
      { $set: { classroom: null } }
    );
    await item.deleteOne();
    return res.json({ message: "Class deleted", unassignedQuizzes: modifiedCount });
  } catch (error) {
    return fail(res, error, "Failed to delete class");
  }
};

const addStudents = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;

    const raw = Array.isArray(req.body.emails)
      ? req.body.emails
      : String(req.body.emails || "").split(/[\s,;]+/);
    const emails = [...new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 500);

    if (!emails.length) {
      return res.status(400).json({ message: "Enter at least one email address" });
    }

    const invalid = emails.filter((email) => !EMAIL_PATTERN.test(email));
    const valid = emails.filter((email) => EMAIL_PATTERN.test(email));
    const users = await User.find({ email: { $in: valid } }).select("name email role");
    const byEmail = new Map(users.map((user) => [user.email, user]));
    const enrolled = new Set(item.students.map((id) => id.toString()));

    const result = { added: [], alreadyEnrolled: [], notFound: [], notStudent: [], invalid };
    for (const email of valid) {
      const user = byEmail.get(email);
      if (!user) result.notFound.push(email);
      else if (user.role !== "student") result.notStudent.push(email);
      else if (enrolled.has(user._id.toString())) result.alreadyEnrolled.push(email);
      else {
        item.students.push(user._id);
        enrolled.add(user._id.toString());
        result.added.push(mapStudent(user));
      }
    }

    if (result.added.length) await item.save();
    return res.json({ ...result, studentCount: item.students.length });
  } catch (error) {
    return fail(res, error, "Failed to add students");
  }
};

const removeStudent = async (req, res) => {
  try {
    const item = await loadOwnClass(req, res);
    if (!item) return undefined;
    item.students = item.students.filter((id) => id.toString() !== req.params.studentId);
    await item.save();
    return res.json({ studentCount: item.students.length });
  } catch (error) {
    return fail(res, error, "Failed to remove student");
  }
};

const joinClass = async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    if (!code) {
      return res.status(400).json({ message: "Enter the class code from your teacher" });
    }

    const item = await Classroom.findOne({ code });
    if (!item) {
      return res.status(404).json({ message: "No class found with that code" });
    }
    if (!item.joinEnabled) {
      return res.status(403).json({ message: "This class is not accepting new students. Ask your teacher to add you." });
    }
    if (item.students.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(409).json({ message: `You are already in ${item.name}` });
    }

    item.students.push(req.user._id);
    await item.save();

    const counts = await quizCounts([item._id], true);
    return res.status(201).json({
      classroom: mapClass(item, { quizCount: counts[item._id.toString()] || 0 }),
    });
  } catch (error) {
    return fail(res, error, "Failed to join class");
  }
};

const leaveClass = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Class not found" });
    }
    const result = await Classroom.updateOne(
      { _id: req.params.id, students: req.user._id },
      { $pull: { students: req.user._id } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ message: "You are not in this class" });
    }
    return res.json({ message: "You left the class" });
  } catch (error) {
    return fail(res, error, "Failed to leave class");
  }
};

module.exports = {
  listClasses,
  createClass,
  getClass,
  updateClass,
  regenerateCode,
  deleteClass,
  addStudents,
  removeStudent,
  joinClass,
  leaveClass,
};
