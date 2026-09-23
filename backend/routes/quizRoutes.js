const express = require("express");
const {
  getQuizzes,
  getQuizById,
  getMyQuizzes,
  createQuiz,
  deleteQuiz,
  getStudentStats,
} = require("../controllers/quizController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getQuizzes);
router.get("/mine", protect, authorize("teacher"), getMyQuizzes);
router.get("/stats/student", protect, authorize("student"), getStudentStats);
router.get("/:id", protect, getQuizById);
router.post("/", protect, authorize("teacher"), createQuiz);
router.delete("/:id", protect, authorize("teacher"), deleteQuiz);

module.exports = router;
