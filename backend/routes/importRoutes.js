const express = require("express");
const multer = require("multer");
const { importQuestions } = require("../controllers/importController");
const { protect, authorize } = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

router.post("/", protect, authorize("teacher"), upload.single("file"), importQuestions);

module.exports = router;
