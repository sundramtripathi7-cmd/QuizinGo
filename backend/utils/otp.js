const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 45 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pepper = () => process.env.JWT_SECRET || "quizingo_secret";

const normalizeEmail = (value) => String(value || "").toLowerCase().trim();

const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value));

const generateOtp = () => {
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(n).padStart(OTP_LENGTH, "0");
};

const hashOtp = (email, purpose, code) =>
  crypto
    .createHmac("sha256", pepper())
    .update(`${normalizeEmail(email)}:${purpose}:${code}`)
    .digest("hex");

const otpMatches = (email, purpose, code, codeHash) => {
  const expected = Buffer.from(codeHash || "", "utf8");
  const actual = Buffer.from(hashOtp(email, purpose, String(code || "")), "utf8");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

module.exports = {
  OTP_LENGTH,
  OTP_TTL_MS,
  RESEND_MS,
  MAX_VERIFY_ATTEMPTS,
  normalizeEmail,
  isValidEmail,
  generateOtp,
  hashOtp,
  otpMatches,
};
