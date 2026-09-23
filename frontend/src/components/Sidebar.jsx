import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

function Sidebar({ role = "student" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  const studentLinks = [
    { to: "/student", label: "Dashboard", end: true },
    { to: "/student/quizzes", label: "Available Quizzes" },
    { to: "/student/results", label: "My Results" },
    { to: "/student/profile", label: "Profile" },
  ];

  const teacherLinks = [
    { to: "/teacher", label: "Dashboard", end: true },
    { to: "/teacher/create", label: "Create Quiz" },
  ];

  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-logo">
        Quiz<span>InGo</span>
      </Link>

      <div className="sidebar-profile">
        <div className="profile-avatar">{initial}</div>
        <div>
          <strong>{user?.name || "User"}</strong>
          <span>{user?.role === "teacher" ? "Teacher" : "Student"}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <span aria-hidden="true">•</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-box">
          <div>?</div>
          <strong>Need Help?</strong>
          <p>Contact support if you need assistance.</p>
        </div>

        <button type="button" className="logout-link" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
