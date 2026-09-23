import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
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

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const created = await register(form);
      navigate(created.role === "teacher" ? "/teacher" : "/student", {
        replace: true,
      });
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
          <p>
            Create your account and start challenging yourself with interactive
            quizzes.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join QuizInGo today</p>

          <form onSubmit={handleSubmit}>
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
              placeholder="Enter your email"
              value={form.email}
              onChange={updateField("email")}
              required
            />

            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={updateField("password")}
              required
              minLength={6}
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
                  <small>Attempt quizzes</small>
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
                  <small>Create quizzes</small>
                </div>
              </label>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

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
