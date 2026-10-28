const express = require("express");
const {
  listBank,
  addToBank,
  deleteBankQuestions,
} = require("../controllers/bankController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect, authorize("teacher"));

router.get("/", listBank);
router.post("/", addToBank);
router.post("/delete", deleteBankQuestions);
router.delete("/:id", deleteBankQuestions);

module.exports = router;
