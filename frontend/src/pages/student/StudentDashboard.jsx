import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import QuizCard from "../../components/QuizCard";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import "./StudentDashboard.css";

function StudentDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completed: 0,
    averageScore: 0,
    studyHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([api.getQuizzes(), api.getStudentStats()])
      .then(([quizData, statsData]) => {
        if (!active) return;
        setQuizzes(quizData.quizzes || []);
        setStats(statsData.stats || stats);
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

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((quiz) =>
        `${quiz.title} ${quiz.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [quizzes, search]
  );

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="student-layout">
      <Sidebar />

      <main className="student-main">
        <header className="dashboard-header">
          <div className="header-actions">
            <div className="header-profile">
              <div className="header-avatar">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{user?.name}</strong>
                <small>Student</small>
              </div>
            </div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <span className="welcome-label">STUDENT DASHBOARD</span>
            <h1>
              {greeting}, {firstName}
            </h1>
            <p>
              Ready to test your knowledge? Pick a quiz and start learning.
            </p>
          </div>

          <div className="date-box">
            <span>Today</span>
            <strong>{today}</strong>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">▣</div>
            <div>
              <span>Total Quizzes</span>
              <strong>{stats.totalQuizzes}</strong>
              <small>Available to you</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">✓</div>
            <div>
              <span>Completed</span>
              <strong>{stats.completed}</strong>
              <small>Quizzes attempted</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">↗</div>
            <div>
              <span>Average Score</span>
              <strong>{stats.averageScore}%</strong>
              <small>Across all attempts</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">◷</div>
            <div>
              <span>Study Time</span>
              <strong>{stats.studyHours}h</strong>
              <small>Estimated this month</small>
            </div>
          </div>
        </section>

        <section className="quiz-section">
          <div className="section-top">
            <div>
              <h2>Available Quizzes</h2>
              <p>Choose a quiz and challenge yourself.</p>
            </div>

            <div className="quiz-actions">
              <div className="search-box">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading && <div className="panel-message">Loading quizzes...</div>}
          {error && <div className="panel-message error">{error}</div>}

          {!loading && !error && filteredQuizzes.length > 0 && (
            <div className="quiz-grid">
              {filteredQuizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          )}

          {!loading && !error && filteredQuizzes.length === 0 && (
            <div className="no-quizzes">
              <div>⌕</div>
              <h3>No quizzes found</h3>
              <p>Try searching with a different keyword.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentDashboard;
