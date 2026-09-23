import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === "teacher" ? "/teacher" : "/student"}
        replace
      />
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loggedIn = await login(email, password);
      const redirect =
        location.state?.from ||
        (loggedIn.role === "teacher" ? "/teacher" : "/student");
      navigate(redirect, { replace: true });
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
          <p>
            Login to access your quizzes, results and learning dashboard.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Login to your QuizInGo account</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
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

          <div className="demo-creds">
            <p>Demo accounts</p>
            <small>student@quizingo.com / student123</small>
            <small>teacher@quizingo.com / teacher123</small>
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
