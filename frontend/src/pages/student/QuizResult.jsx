import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import "./QuizResult.css";

function QuizResult() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .getAttempt(id)
      .then((data) => {
        if (active) setAttempt(data.attempt);
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
  }, [id]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spin" />
        <p>Loading result...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="page-loader">
        <p>{error || "Result not found"}</p>
        <Link to="/student" className="primary-btn">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const review = attempt.review || [];
  const totalQuestions = attempt.totalQuestions;
  const correctAnswers = review.filter((item) => item.isCorrect).length;
  const answeredQuestions = review.filter((item) => item.userAnswer).length;
  const wrongAnswers = answeredQuestions - correctAnswers;
  const unanswered = totalQuestions - answeredQuestions;
  const percentage = attempt.percentage;

  const getResultMessage = () => {
    if (percentage >= 80) return "Excellent performance! Keep it up.";
    if (percentage >= 60) return "Good job! There is still room to improve.";
    if (percentage >= 40) return "Nice attempt. Keep practicing to improve.";
    return "Keep practicing and try again.";
  };

  const getStatusClass = () => {
    if (percentage >= 80) return "excellent";
    if (percentage >= 60) return "good";
    if (percentage >= 40) return "average";
    return "needs-work";
  };

  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="result-page">
      <header className="result-header">
        <Link to="/student" className="result-logo">
          Quiz<span>InGo</span>
        </Link>

        <div className="result-header-title">
          <strong>Quiz Result</strong>
          <span>{attempt.quizTitle}</span>
        </div>

        <Link to="/student" className="back-dashboard">
          Dashboard →
        </Link>
      </header>

      <main className="result-main">
        <section className="result-hero">
          <div className="result-check">✓</div>
          <span className="result-label">QUIZ COMPLETED</span>
          <h1>Great job, {firstName}!</h1>
          <p>
            You have successfully completed <strong>{attempt.quizTitle}</strong>.
          </p>
        </section>

        <section className="score-card">
          <div className="score-circle">
            <div>
              <strong>{percentage}%</strong>
              <span>Score</span>
            </div>
          </div>

          <div className="score-info">
            <span className="score-label">YOUR SCORE</span>
            <h2>
              {attempt.score} / {totalQuestions}
            </h2>
            <p className={getStatusClass()}>{getResultMessage()}</p>
          </div>
        </section>

        <section className="result-stats">
          <div className="result-stat correct">
            <div className="result-stat-icon">✓</div>
            <div>
              <span>Correct Answers</span>
              <strong>{correctAnswers}</strong>
            </div>
          </div>

          <div className="result-stat wrong">
            <div className="result-stat-icon">×</div>
            <div>
              <span>Wrong Answers</span>
              <strong>{wrongAnswers}</strong>
            </div>
          </div>

          <div className="result-stat unanswered">
            <div className="result-stat-icon">−</div>
            <div>
              <span>Unanswered</span>
              <strong>{unanswered}</strong>
            </div>
          </div>

          <div className="result-stat total">
            <div className="result-stat-icon">#</div>
            <div>
              <span>Total Questions</span>
              <strong>{totalQuestions}</strong>
            </div>
          </div>
        </section>

        <section className="review-section">
          <div className="review-heading">
            <div>
              <h2>Question Review</h2>
              <p>Review your answers and see where you can improve.</p>
            </div>
            <span>
              {correctAnswers}/{totalQuestions} Correct
            </span>
          </div>

          <div className="review-list">
            {review.map((question, index) => {
              const isUnanswered = !question.userAnswer;
              const isCorrect = question.isCorrect;

              return (
                <div key={question.questionId || index} className="review-item">
                  <div
                    className={`review-number ${
                      isUnanswered
                        ? "unanswered"
                        : isCorrect
                          ? "correct"
                          : "wrong"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="review-question">
                    <h3>{question.question}</h3>

                    <div className="review-answer">
                      <span>Your answer:</span>
                      <strong
                        className={
                          isUnanswered
                            ? "answer-unanswered"
                            : isCorrect
                              ? "answer-correct"
                              : "answer-wrong"
                        }
                      >
                        {question.userAnswer || "Not answered"}
                      </strong>
                    </div>

                    {!isCorrect && !isUnanswered && (
                      <div className="correct-answer">
                        Correct answer: <strong>{question.correctAnswer}</strong>
                      </div>
                    )}
                  </div>

                  <div className="review-status">
                    {isUnanswered ? (
                      <span className="status-unanswered">Not Answered</span>
                    ) : isCorrect ? (
                      <span className="status-correct">✓ Correct</span>
                    ) : (
                      <span className="status-wrong">× Wrong</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="result-actions">
          <button
            type="button"
            className="retake-btn"
            onClick={() =>
              navigate(
                attempt.quizId
                  ? `/student/attempt/${attempt.quizId}`
                  : "/student"
              )
            }
          >
            Retake Quiz
          </button>

          <Link to="/student" className="dashboard-btn">
            Back to Dashboard
          </Link>
        </section>
      </main>
    </div>
  );
}

export default QuizResult;
