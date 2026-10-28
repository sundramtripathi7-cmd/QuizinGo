import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "../student/StudentExtra.css";
import "./Teacher.css";
import "../../components/Classes.css";

const STATUS_LABEL = { open: "Open", upcoming: "Upcoming", closed: "Closed" };

function TeacherDashboard() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getMyQuizzes(), api.getClasses()])
      .then(([quizData, classData]) => {
        setQuizzes(quizData.quizzes || []);
        setClasses(classData.classes || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quiz and all its attempts?")) return;

    try {
      await api.deleteQuiz(id);
      setQuizzes((previous) => previous.filter((quiz) => quiz.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Teacher";
  const totalAttempts = quizzes.reduce((sum, quiz) => sum + quiz.attemptCount, 0);
  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">TEACHER DASHBOARD</span>
            <h1>Hello, {firstName}</h1>
            <p>Create quizzes from a file in seconds, then track how students do.</p>
          </div>

          <Link to="/teacher/create" className="primary-btn">
            Create Quiz →
          </Link>
        </section>

        <section className="teacher-stats">
          <div className="stat-card">
            <div className="stat-icon purple">▣</div>
            <div>
              <span>Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
          </div>
          <Link to="/teacher/classes" className="stat-card stat-link">
            <div className="stat-icon blue">🎓</div>
            <div>
              <span>Classes · students</span>
              <strong>
                {classes.length} · {totalStudents}
              </strong>
            </div>
          </Link>
          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <span>Student attempts</span>
              <strong>{totalAttempts}</strong>
            </div>
          </div>
        </section>

        <section className="extra-panel">
          <div className="teacher-heading">
            <h2>Your Quizzes</h2>
            <Link to="/teacher/bank" className="ghost-btn">
              Question bank
            </Link>
          </div>

          {loading && <div className="panel-message">Loading quizzes...</div>}
          {error && <div className="panel-message error">{error}</div>}

          {!loading && quizzes.length === 0 && (
            <div className="no-quizzes">
              <h3>No quizzes yet</h3>
              <p>Upload a question paper (PDF, Word or text) to create your first quiz.</p>
              <Link to="/teacher/create" className="primary-btn">
                Create Quiz
              </Link>
            </div>
          )}

          <div className="teacher-quiz-list">
            {quizzes.map((quiz) => (
              <div className="teacher-quiz-item" key={quiz.id}>
                <div className="teacher-quiz-icon">{quiz.icon || "📝"}</div>
                <div className="teacher-quiz-info">
                  <strong>
                    {quiz.title}
                    {!quiz.classroom ? (
                      <span className="status-pill unassigned-pill" title="Edit the quiz and choose a class">
                        No class · hidden
                      </span>
                    ) : quiz.isPublished ? (
                      <span className={`status-pill ${quiz.availability}`}>
                        {STATUS_LABEL[quiz.availability]}
                      </span>
                    ) : (
                      <span className="status-pill draft">Draft</span>
                    )}
                  </strong>
                  <p>
                    {quiz.classroom && <>🎓 {quiz.classroom.name} • </>}
                    {quiz.category} • {quiz.questions} questions • {quiz.marks} marks •{" "}
                    {quiz.duration ? `${quiz.duration} min` : "No time limit"} •{" "}
                    {quiz.attemptCount} attempt{quiz.attemptCount === 1 ? "" : "s"}
                    {quiz.averagePercentage != null && ` • avg ${quiz.averagePercentage}%`}
                  </p>
                </div>
                <div className="teacher-quiz-actions">
                  <Link to={`/teacher/quiz/${quiz.id}/results`} className="ghost-btn">
                    Results
                  </Link>
                  <Link to={`/teacher/edit/${quiz.id}`} className="ghost-btn">
                    Edit
                  </Link>
                  <button type="button" className="danger-btn" onClick={() => handleDelete(quiz.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default TeacherDashboard;
