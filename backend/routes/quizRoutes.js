const express = require("express");
const {
  getQuizzes,
  getMyQuizzes,
  getQuizForEdit,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
  getStudentStats,
} = require("../controllers/quizController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, authorize("student"), getQuizzes);
router.get("/mine", protect, authorize("teacher"), getMyQuizzes);
router.get("/stats/student", protect, authorize("student"), getStudentStats);
router.get("/:id", protect, authorize("teacher"), getQuizForEdit);
router.get("/:id/attempts", protect, authorize("teacher"), getQuizAttempts);
router.post("/", protect, authorize("teacher"), createQuiz);
router.put("/:id", protect, authorize("teacher"), updateQuiz);
router.delete("/:id", protect, authorize("teacher"), deleteQuiz);

module.exports = router;
