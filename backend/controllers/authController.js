const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || "quizingo_secret", {
    expiresIn: "7d",
  });

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const allowedRole = role === "teacher" ? "teacher" : "student";

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: allowedRole,
    });

    const token = signToken(user._id);

    return res.status(201).json({
      token,
      user: user.toSafeObject(),
    });
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);

    return res.json({
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
};

const me = async (req, res) => {
  return res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : {
    id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  }});
};

module.exports = { register, login, me };
