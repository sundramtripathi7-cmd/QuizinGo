import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useAuth();

  const dashboardPath =
    user?.role === "teacher" ? "/teacher" : user ? "/student" : null;

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        Quiz<span>InGo</span>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <a href="#features">Features</a>
        <a href="#about">About</a>
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            <Link to={dashboardPath} className="login-btn">
              Dashboard
            </Link>
            <button type="button" className="register-btn nav-logout" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-btn">
              Login
            </Link>
            <Link to="/register" className="register-btn">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
