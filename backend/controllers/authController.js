const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OtpChallenge = require("../models/OtpChallenge");
const { sendOtpEmail } = require("../utils/mailer");
const {
  OTP_TTL_MS,
  RESEND_MS,
  MAX_VERIFY_ATTEMPTS,
  normalizeEmail,
  isValidEmail,
  generateOtp,
  hashOtp,
  otpMatches,
} = require("../utils/otp");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || "quizingo_secret", {
    expiresIn: "7d",
  });

const authPayload = (user) => ({
  token: signToken(user._id),
  user: user.toSafeObject(),
});

const isDev = () => process.env.NODE_ENV !== "production";

const requestOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === "register" ? "register" : "login";

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const existing = await User.findOne({ email });

    if (purpose === "login" && !existing) {
      return res.status(404).json({
        message: "No account found with that email. Create an account first.",
      });
    }

    if (purpose === "register" && existing) {
      return res.status(400).json({ message: "Email is already registered. Sign in instead." });
    }

    const name = String(req.body.name || "").trim();
    const role = req.body.role === "teacher" ? "teacher" : "student";

    if (purpose === "register" && !name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const latest = await OtpChallenge.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_MS) {
      const wait = Math.ceil((RESEND_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
      return res.status(429).json({
        message: `Please wait ${wait}s before requesting another code`,
        retryAfter: wait,
      });
    }

    await OtpChallenge.deleteMany({ email, purpose });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await OtpChallenge.create({
      email,
      purpose,
      codeHash: hashOtp(email, purpose, code),
      expiresAt,
      name: purpose === "register" ? name : "",
      role: purpose === "register" ? role : "",
    });

    const mail = await sendOtpEmail(email, code, purpose);
    const payload = {
      message: mail.sent
        ? `We sent a 6-digit code to ${email}`
        : `We generated a 6-digit code for ${email}. Email is not configured, so check the server console.`,
      email,
      purpose,
      expiresIn: OTP_TTL_MS / 1000,
      delivered: mail.sent,
    };
    if (isDev()) payload.devCode = code;
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send code" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === "register" ? "register" : "login";
    const code = String(req.body.code || "").replace(/\D/g, "");

    if (!isValidEmail(email) || code.length !== 6) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email" });
    }

    const challenge = await OtpChallenge.findOne({ email, purpose }).sort({ createdAt: -1 });
    if (!challenge || challenge.expiresAt <= new Date()) {
      return res.status(400).json({ message: "That code has expired. Request a new one." });
    }

    if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
      await challenge.deleteOne();
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    if (!otpMatches(email, purpose, code, challenge.codeHash)) {
      challenge.attempts += 1;
      await challenge.save();
      const left = MAX_VERIFY_ATTEMPTS - challenge.attempts;
      return res.status(401).json({
        message: left
          ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many attempts. Request a new code.",
      });
    }

    let user;
    if (purpose === "register") {
      user = await User.create({
        name: challenge.name,
        email,
        role: challenge.role === "teacher" ? "teacher" : "student",
      });
    } else {
      user = await User.findOne({ email });
      if (!user) {
        await challenge.deleteOne();
        return res.status(404).json({ message: "No account found with that email" });
      }
    }

    await challenge.deleteOne();
    return res.json(authPayload(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email is already registered. Sign in instead." });
    }
    return res.status(500).json({ message: error.message || "Verification failed" });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (password && String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const existing = await User.findOne({ email: normalized });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const allowedRole = role === "teacher" ? "teacher" : "student";

    const user = await User.create({
      name: String(name).trim(),
      email: normalized,
      ...(password ? { password } : {}),
      role: allowedRole,
    });

    return res.status(201).json(authPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json(authPayload(user));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
};

const me = async (req, res) => {
  return res.json({
    user: req.user.toSafeObject
      ? req.user.toSafeObject()
      : {
          id: req.user._id.toString(),
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
  });
};

module.exports = { register, login, me, requestOtp, verifyOtp };
