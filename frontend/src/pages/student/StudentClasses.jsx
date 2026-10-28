import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import JoinClassForm from "../../components/JoinClassForm";
import { api } from "../../api";
import "./StudentDashboard.css";
import "./StudentExtra.css";
import "../teacher/Teacher.css";
import "../../components/Classes.css";

function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getClasses()
      .then((data) => setClasses(data.classes || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLeave = async (item) => {
    if (!window.confirm(`Leave ${item.name}? You will no longer see its quizzes.`)) return;
    try {
      await api.leaveClass(item.id);
      setClasses((previous) => previous.filter((c) => c.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="student-layout">
      <Sidebar />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">MY CLASSES</span>
            <h1>Your classes</h1>
            <p>You only see quizzes from classes you belong to.</p>
          </div>
        </section>

        <div className="class-page">
          <JoinClassForm onJoined={(item) => setClasses((previous) => [item, ...previous])} />

          {error && <div className="panel-message error">{error}</div>}
          {loading && <div className="panel-message">Loading classes…</div>}

          {!loading && classes.length === 0 && (
            <div className="no-quizzes">
              <div>🎓</div>
              <h3>You're not in any class yet</h3>
              <p>Enter the code your teacher gave you, or ask them to add you by email.</p>
            </div>
          )}

          <div className="class-grid">
            {classes.map((item) => (
              <div className="class-card" key={item.id}>
                <div className={`class-banner ${item.color}`}>
                  <h3>{item.name}</h3>
                  <span>{item.teacher}</span>
                  <div className="class-banner-icon">{item.icon}</div>
                </div>
                <div className="class-body">
                  {item.description && <p>{item.description}</p>}
                  <div className="class-meta">
                    <span>
                      <strong>{item.quizCount}</strong> quiz{item.quizCount === 1 ? "" : "zes"}
                    </span>
                    <span>
                      <strong>{item.studentCount}</strong> student{item.studentCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="class-foot">
                  <button type="button" className="link-btn danger" onClick={() => handleLeave(item)}>
                    Leave
                  </button>
                  <Link to={`/student/quizzes?class=${item.id}`} className="primary-btn small">
                    View quizzes →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentClasses;
