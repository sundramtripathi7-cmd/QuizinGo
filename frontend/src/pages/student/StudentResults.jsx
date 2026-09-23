import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../api";
import "./StudentDashboard.css";
import "./StudentExtra.css";

function StudentResults() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .getMyAttempts()
      .then((data) => {
        if (active) setAttempts(data.attempts || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="student-layout">
      <Sidebar />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">MY RESULTS</span>
            <h1>Your quiz history</h1>
            <p>Review past attempts and track how you improve over time.</p>
          </div>
        </section>

        <section className="extra-panel">
          {loading && <div className="panel-message">Loading results...</div>}
          {error && <div className="panel-message error">{error}</div>}

          {!loading && !error && attempts.length === 0 && (
            <div className="no-quizzes">
              <h3>No results yet</h3>
              <p>Attempt a quiz to see your score here.</p>
              <Link to="/student" className="primary-btn">
                Browse Quizzes
              </Link>
            </div>
          )}

          {!loading && attempts.length > 0 && (
            <div className="results-table">
              <div className="results-row head">
                <span>Quiz</span>
                <span>Score</span>
                <span>Percentage</span>
                <span>Date</span>
                <span></span>
              </div>

              {attempts.map((item) => (
                <div className="results-row" key={item.id}>
                  <div>
                    <strong>{item.quizTitle}</strong>
                    <small>{item.category}</small>
                  </div>
                  <span>
                    {item.score}/{item.totalQuestions}
                  </span>
                  <span className="pct">{item.percentage}%</span>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <Link to={`/student/result/${item.id}`}>View</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentResults;
