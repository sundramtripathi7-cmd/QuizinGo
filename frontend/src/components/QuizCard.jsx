import { Link } from "react-router-dom";
import "./QuizCard.css";

function QuizCard({ quiz }) {
  return (
    <div className="quiz-card">

      <div className="quiz-card-top">
        <div className={`quiz-icon ${quiz.color}`}>
          {quiz.icon}
        </div>

        <span className="quiz-category">
          {quiz.category}
        </span>
      </div>

      <h3>{quiz.title}</h3>

      <p className="quiz-description">
        {quiz.description}
      </p>

      <div className="quiz-info">

        <div>
          <span>Questions</span>
          <strong>{quiz.questions}</strong>
        </div>

        <div>
          <span>Duration</span>
          <strong>{quiz.duration} min</strong>
        </div>

        <div>
          <span>Marks</span>
          <strong>{quiz.marks}</strong>
        </div>

      </div>

      <div className="quiz-card-footer">

        <div className="teacher-info">
          <div className="teacher-avatar">
            {quiz.teacher.charAt(0)}
          </div>

          <span>{quiz.teacher}</span>
        </div>

        <Link
          to={`/student/attempt/${quiz.id}`}
          className="start-quiz-btn"
        >
          Start Quiz →
        </Link>

      </div>

    </div>
  );
}

export default QuizCard;