const express = require("express");
const {
  startAttempt,
  saveAnswers,
  submitAttempt,
  getMyAttempts,
  getAttemptById,
} = require("../controllers/attemptController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("student"));

router.get("/mine", getMyAttempts);
router.post("/start/:quizId", startAttempt);
router.put("/:id/answers", saveAnswers);
router.post("/:id/submit", submitAttempt);
router.get("/:id", getAttemptById);

module.exports = router;
