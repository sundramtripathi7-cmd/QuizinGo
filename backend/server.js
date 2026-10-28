const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const bankRoutes = require("./routes/bankRoutes");
const importRoutes = require("./routes/importRoutes");
const classroomRoutes = require("./routes/classroomRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ message: "QuizInGo API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/questions", bankRoutes);
app.use("/api/import", importRoutes);
app.use("/api/classes", classroomRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 10 MB)" : err.message;
    return res.status(400).json({ message });
  }
  console.error(err);
  return res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
