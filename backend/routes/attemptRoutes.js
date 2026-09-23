const express = require("express");
const {
  submitAttempt,
  getMyAttempts,
  getAttemptById,
} = require("../controllers/attemptController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", protect, authorize("student"), getMyAttempts);
router.get("/:id", protect, authorize("student"), getAttemptById);
router.post("/:id/submit", protect, authorize("student"), submitAttempt);

module.exports = router;
