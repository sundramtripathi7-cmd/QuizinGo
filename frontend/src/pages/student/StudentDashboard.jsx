import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import QuizCard from "../../components/QuizCard";
import JoinClassForm from "../../components/JoinClassForm";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import "./StudentDashboard.css";
import "../../components/Classes.css";

function StudentDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const classFilter = searchParams.get("class") || "";
  const [search, setSearch] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completed: 0,
    averageScore: 0,
    studyHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    let active = true;

    Promise.all([api.getQuizzes(), api.getStudentStats(), api.getClasses()])
      .then(([quizData, statsData, classData]) => {
        if (!active) return;
        setQuizzes(quizData.quizzes || []);
        setStats((previous) => statsData.stats || previous);
        setClasses(classData.classes || []);
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

  useEffect(() => load(), [load]);

  const selectClass = (id) => setSearchParams(id ? { class: id } : {}, { replace: true });

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter(
        (quiz) =>
          (!classFilter || quiz.classroom?.id === classFilter) &&
          `${quiz.title} ${quiz.category} ${quiz.classroom?.name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [quizzes, search, classFilter]
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

          {!loading && !error && classes.length > 1 && (
            <div className="class-filter">
              <button type="button" className={classFilter ? "" : "active"} onClick={() => selectClass("")}>
                All classes
              </button>
              {classes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={classFilter === item.id ? "active" : ""}
                  onClick={() => selectClass(item.id)}
                >
                  {item.icon} {item.name}
                </button>
              ))}
            </div>
          )}

          {!loading && !error && classes.length === 0 && (
            <div className="no-quizzes">
              <div>🎓</div>
              <h3>Join a class to see quizzes</h3>
              <p>Your teacher shares quizzes with a class. Enter the class code below.</p>
              <div className="join-empty">
                <JoinClassForm
                  compact
                  onJoined={() => {
                    setLoading(true);
                    load();
                  }}
                />
              </div>
            </div>
          )}

          {!loading && !error && filteredQuizzes.length > 0 && (
            <div className="quiz-grid">
              {filteredQuizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          )}

          {!loading && !error && classes.length > 0 && filteredQuizzes.length === 0 && (
            <div className="no-quizzes">
              <div>⌕</div>
              <h3>No quizzes found</h3>
              <p>
                {search
                  ? "Try searching with a different keyword."
                  : "Your teacher hasn't published a quiz here yet. "}
                {!search && <Link to="/student/classes">Join another class</Link>}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentDashboard;
