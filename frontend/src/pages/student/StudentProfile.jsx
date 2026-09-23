import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import "./StudentDashboard.css";
import "./StudentExtra.css";

function StudentProfile() {
  const { user } = useAuth();

  return (
    <div className="student-layout">
      <Sidebar />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">PROFILE</span>
            <h1>Your account</h1>
            <p>Manage how you appear across QuizInGo.</p>
          </div>
        </section>

        <section className="extra-panel profile-card">
          <div className="profile-hero-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="profile-fields">
            <div>
              <span>Full name</span>
              <strong>{user?.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>Student</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default StudentProfile;
