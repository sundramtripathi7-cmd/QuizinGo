import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { user, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("details");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "student",
  });
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef(null);

  useEffect(() => () => window.clearInterval(timer.current), []);

  if (user) {
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} replace />;
  }

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const startCountdown = (from = 45) => {
    window.clearInterval(timer.current);
    setSeconds(from);
    timer.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await requestOtp({ ...form, purpose: "register" });
      setHint(result.message);
      setDevCode(result.devCode || "");
      setStep("code");
      startCountdown(result.retryAfter || 45);
    } catch (err) {
      if (err.status === 429 && err.data?.retryAfter) startCountdown(err.data.retryAfter);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const created = await verifyOtp({ email: form.email, code, purpose: "register" });
      navigate(created.role === "teacher" ? "/teacher" : "/student", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <Link to="/" className="auth-logo">
          Quiz<span>InGo</span>
        </Link>
        <div className="auth-message">
          <h1>
            Start your
            <br />
            learning journey.
          </h1>
          <p>Create an account with your real email. We send a one-time code to verify it — same for students and teachers.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Create Account</h2>
          <p className="auth-subtitle">
            {step === "details" ? "We’ll email you a verification code" : `Enter the code sent to ${form.email}`}
          </p>

          {step === "details" ? (
            <form onSubmit={sendCode}>
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={updateField("name")}
                required
              />

              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={updateField("email")}
                required
              />

              <label>I am a</label>
              <div className="role-options">
                <label className="role-card">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={form.role === "student"}
                    onChange={updateField("role")}
                  />
                  <div>
                    <strong>Student</strong>
                    <small>Join classes and attempt quizzes</small>
                  </div>
                </label>
                <label className="role-card">
                  <input
                    type="radio"
                    name="role"
                    value="teacher"
                    checked={form.role === "teacher"}
                    onChange={updateField("role")}
                  />
                  <div>
                    <strong>Teacher</strong>
                    <small>Create classes and quizzes</small>
                  </div>
                </label>
              </div>

              {error && <div className="form-error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmCode}>
              <p className="otp-sent">
                {hint}
                <button type="button" className="link-btn" onClick={() => setStep("details")}>
                  Change details
                </button>
              </p>
              <label htmlFor="reg-otp">6-digit code</label>
              <input
                id="reg-otp"
                className="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
              />
              {devCode && (
                <p className="otp-dev">
                  Dev code: <strong>{devCode}</strong> (shown only when email is not configured)
                </p>
              )}
              {error && <div className="form-error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>
                {loading ? "Creating…" : "Verify and create account"}
              </button>
              <button type="button" className="auth-resend" disabled={seconds > 0 || loading} onClick={sendCode}>
                {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
              </button>
            </form>
          )}

          <p className="switch-auth">
            Already have an account?
            <Link to="/login"> Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
