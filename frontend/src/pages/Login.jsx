import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { user, login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("otp");
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const goTo = (loggedIn) => {
    const redirect = location.state?.from || (loggedIn.role === "teacher" ? "/teacher" : "/student");
    navigate(redirect, { replace: true });
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
      const result = await requestOtp({ email, purpose: "login" });
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
      goTo(await verifyOtp({ email, code, purpose: "login" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      goTo(await login(email, password));
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
            Welcome back.
            <br />
            Keep learning.
          </h1>
          <p>Sign in with your email. We send a one-time code to students and teachers alike.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">
            {mode === "otp" ? "Enter your email to receive a sign-in code" : "Sign in with your password"}
          </p>

          {mode === "otp" && step === "email" && (
            <form onSubmit={sendCode}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <div className="form-error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Sending code…" : "Send sign-in code"}
              </button>
            </form>
          )}

          {mode === "otp" && step === "code" && (
            <form onSubmit={confirmCode}>
              <p className="otp-sent">
                {hint || `Code sent to ${email}`}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                    setDevCode("");
                  }}
                >
                  Change email
                </button>
              </p>
              <label htmlFor="login-otp">6-digit code</label>
              <input
                id="login-otp"
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
                {loading ? "Verifying…" : "Verify and sign in"}
              </button>
              <button
                type="button"
                className="auth-resend"
                disabled={seconds > 0 || loading}
                onClick={sendCode}
              >
                {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
              </button>
            </form>
          )}

          {mode === "password" && (
            <form onSubmit={handlePassword}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <div className="form-error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          )}

          <button
            type="button"
            className="auth-alt"
            onClick={() => {
              setMode(mode === "otp" ? "password" : "otp");
              setError("");
              setStep("email");
            }}
          >
            {mode === "otp" ? "Use password instead" : "Use email code instead"}
          </button>

          <div className="demo-creds">
            <p>Demo accounts (password or OTP)</p>
            <small>student@quizingo.com · student123</small>
            <small>teacher@quizingo.com · teacher123</small>
          </div>

          <p className="switch-auth">
            Don&apos;t have an account?
            <Link to="/register"> Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
