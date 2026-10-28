const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ["login", "register"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    name: { type: String, default: "" },
    role: { type: String, enum: ["student", "teacher", ""], default: "" },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpChallengeSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);
