const express = require("express");
const {
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
} = require("../controllers/classroomController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const teacher = [protect, authorize("teacher")];
const student = [protect, authorize("student")];

router.get("/", protect, listClasses);
router.post("/join", ...student, joinClass);
router.post("/:id/leave", ...student, leaveClass);

router.post("/", ...teacher, createClass);
router.get("/:id", ...teacher, getClass);
router.put("/:id", ...teacher, updateClass);
router.delete("/:id", ...teacher, deleteClass);
router.post("/:id/code", ...teacher, regenerateCode);
router.post("/:id/students", ...teacher, addStudents);
router.delete("/:id/students/:studentId", ...teacher, removeStudent);

module.exports = router;
