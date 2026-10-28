import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "../student/StudentExtra.css";
import "./Teacher.css";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function QuizAttempts() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getQuizAttempts(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  const attempts = data?.attempts || [];
  const average = attempts.length
    ? Math.round(attempts.reduce((sum, item) => sum + item.percentage, 0) / attempts.length)
    : 0;
  const passRate = attempts.length
    ? Math.round((attempts.filter((item) => item.passed).length / attempts.length) * 100)
    : 0;

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">QUIZ RESULTS</span>
            <h1>{data?.quiz.title || "Results"}</h1>
            <p>Every submitted attempt, newest first.</p>
          </div>
          <Link to="/teacher" className="secondary-btn">
            ← Back
          </Link>
        </section>

        {error && <div className="extra-panel panel-message error">{error}</div>}

        {data && (
          <>
            <section className="teacher-stats">
              <div className="stat-card">
                <div className="stat-icon purple">#</div>
                <div>
                  <span>Attempts</span>
                  <strong>{attempts.length}</strong>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">↗</div>
                <div>
                  <span>Average score</span>
                  <strong>{average}%</strong>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">✓</div>
                <div>
                  <span>Pass rate (≥ {data.quiz.passPercentage}%)</span>
                  <strong>{passRate}%</strong>
                </div>
              </div>
            </section>

            <section className="extra-panel">
              {attempts.length === 0 ? (
                <div className="no-quizzes">
                  <h3>No attempts yet</h3>
                  <p>Results appear here once students submit the quiz.</p>
                </div>
              ) : (
                <div className="results-table">
                  <div className="results-row head">
                    <span>Student</span>
                    <span>Score</span>
                    <span>Grade</span>
                    <span>Submitted</span>
                    <span>Result</span>
                  </div>
                  {attempts.map((item) => (
                    <div className="results-row" key={item.id}>
                      <div>
                        <strong>{item.studentName}</strong>
                        <small>{item.studentEmail}</small>
                      </div>
                      <span>
                        {item.score}/{item.maxScore}
                      </span>
                      <span className="pct">{item.percentage}%</span>
                      <span>{formatDate(item.submittedAt)}</span>
                      <span className={item.passed ? "pass-tag" : "fail-tag"}>
                        {item.passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default QuizAttempts;
