import { Link } from "react-router-dom";
import "./QuizCard.css";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function QuizCard({ quiz }) {
  const used = quiz.attemptsUsed || 0;
  const allowed = quiz.attemptsAllowed || 0;
  const outOfAttempts = allowed > 0 && used >= allowed;

  let action = (
    <Link to={`/student/attempt/${quiz.id}`} className="start-quiz-btn">
      {used > 0 ? "Attempt again →" : "Start Quiz →"}
    </Link>
  );

  if (quiz.availability === "upcoming") {
    action = <span className="start-quiz-btn disabled">Opens {formatDate(quiz.openAt)}</span>;
  } else if (quiz.availability === "closed") {
    action = <span className="start-quiz-btn disabled">Closed</span>;
  } else if (outOfAttempts) {
    action = (
      <Link to="/student/results" className="start-quiz-btn secondary">
        View results
      </Link>
    );
  }

  return (
    <div className="quiz-card">
      <div className="quiz-card-top">
        <div className={`quiz-icon ${quiz.color}`}>{quiz.icon}</div>
        <span className="quiz-category">{quiz.category}</span>
      </div>

      <h3>{quiz.title}</h3>
      {quiz.classroom?.name && <p className="quiz-class">{quiz.classroom.name}</p>}

      <p className="quiz-description">{quiz.description}</p>

      <div className="quiz-info">
        <div>
          <span>Questions</span>
          <strong>{quiz.questions}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{quiz.duration ? `${quiz.duration} min` : "No limit"}</strong>
        </div>
        <div>
          <span>Attempts</span>
          <strong>{allowed ? `${used}/${allowed}` : used ? `${used} · ∞` : "Unlimited"}</strong>
        </div>
      </div>

      {quiz.bestPercentage != null && (
        <p className="quiz-best">
          Best grade: <strong>{quiz.bestPercentage}%</strong>
        </p>
      )}

      {quiz.closeAt && quiz.availability === "open" && (
        <p className="quiz-closes">Closes {formatDate(quiz.closeAt)}</p>
      )}

      <div className="quiz-card-footer">
        <div className="teacher-info">
          <div className="teacher-avatar">{quiz.teacher.charAt(0)}</div>
          <span>{quiz.teacher}</span>
        </div>
        {action}
      </div>
    </div>
  );
}

export default QuizCard;
