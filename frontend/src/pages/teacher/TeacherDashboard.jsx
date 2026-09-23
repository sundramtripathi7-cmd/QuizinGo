import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "./Teacher.css";

function TeacherDashboard() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQuizzes = () => {
    setLoading(true);
    api
      .getMyQuizzes()
      .then((data) => setQuizzes(data.quizzes || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quiz?")) return;

    try {
      await api.deleteQuiz(id);
      setQuizzes((previous) => previous.filter((quiz) => quiz.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Teacher";

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">TEACHER DASHBOARD</span>
            <h1>Hello, {firstName}</h1>
            <p>Create quizzes and manage your assessments.</p>
          </div>

          <Link to="/teacher/create" className="primary-btn">
            Create Quiz →
          </Link>
        </section>

        <section className="extra-panel">
          <div className="teacher-heading">
            <h2>Your Quizzes</h2>
            <span>{quizzes.length} total</span>
          </div>

          {loading && <div className="panel-message">Loading quizzes...</div>}
          {error && <div className="panel-message error">{error}</div>}

          {!loading && quizzes.length === 0 && (
            <div className="no-quizzes">
              <h3>No quizzes yet</h3>
              <p>Create your first quiz to get started.</p>
              <Link to="/teacher/create" className="primary-btn">
                Create Quiz
              </Link>
            </div>
          )}

          <div className="teacher-quiz-list">
            {quizzes.map((quiz) => (
              <div className="teacher-quiz-item" key={quiz.id}>
                <div className="teacher-quiz-icon">{quiz.icon || "📝"}</div>
                <div>
                  <strong>{quiz.title}</strong>
                  <p>
                    {quiz.category} • {quiz.questions} questions • {quiz.duration}{" "}
                    min
                  </p>
                </div>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => handleDelete(quiz.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default TeacherDashboard;
