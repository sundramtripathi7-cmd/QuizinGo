const mongoose = require("mongoose");

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "🎓" },
    color: {
      type: String,
      enum: ["", "blue", "green", "orange", "pink"],
      default: "",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teacherName: { type: String, default: "Teacher" },
    code: { type: String, required: true, unique: true, uppercase: true },
    joinEnabled: { type: Boolean, default: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Classroom", classroomSchema);
