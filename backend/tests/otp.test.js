const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { generateOtp, hashOtp, otpMatches, isValidEmail, normalizeEmail } = require("../utils/otp");

describe("otp helpers", () => {
  test("codes are 6 digits", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtp();
      assert.match(code, /^\d{6}$/);
    }
  });

  test("hash is bound to email and purpose", () => {
    const hash = hashOtp("Teacher@Quizingo.com", "login", "123456");
    assert.equal(otpMatches("teacher@quizingo.com", "login", "123456", hash), true);
    assert.equal(otpMatches("teacher@quizingo.com", "register", "123456", hash), false);
    assert.equal(otpMatches("other@quizingo.com", "login", "123456", hash), false);
    assert.equal(otpMatches("teacher@quizingo.com", "login", "000000", hash), false);
  });

  test("email normalisation", () => {
    assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
    assert.equal(isValidEmail("a@b.com"), true);
    assert.equal(isValidEmail("not-an-email"), false);
  });
});
