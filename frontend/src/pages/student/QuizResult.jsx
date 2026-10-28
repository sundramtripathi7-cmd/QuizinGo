import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api";
import { typeLabel } from "../../utils/questionTypes";
import "./QuizResult.css";

const STATUS_TEXT = {
  correct: "✓ Correct",
  partial: "◐ Partially correct",
  wrong: "× Incorrect",
  unanswered: "Not answered",
};

function AnswerValue({ item, value }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) {
    return <span className="answer-unanswered">Not answered</span>;
  }

  if (item.type === "matching" && typeof value === "object" && !Array.isArray(value)) {
    return (
      <ul className="answer-pairs">
        {(item.prompts || []).map((prompt, index) => (
          <li key={index}>
            {prompt} → <strong>{value[index] || "—"}</strong>
          </li>
        ))}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    if (item.type === "matching") {
      return (
        <ul className="answer-pairs">
          {value.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      );
    }
    return <>{value.join(item.type === "shortanswer" ? " / " : ", ")}</>;
  }

  return <>{String(value)}</>;
}

function QuizResult() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;

    api
      .getAttempt(id)
      .then((data) => active && setAttempt(data.attempt))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

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
  const count = (status) => review.filter((item) => item.status === status).length;
  const percentage = attempt.percentage;
  const firstName = user?.name?.split(" ")[0] || "Student";
  const visible = filter === "all" ? review : review.filter((item) => item.status === filter);

  const minutes = attempt.startedAt
    ? Math.max(1, Math.round((new Date(attempt.createdAt) - new Date(attempt.startedAt)) / 60000))
    : null;

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
          <div className={`result-check ${attempt.passed ? "" : "not-passed"}`}>
            {attempt.passed ? "✓" : "!"}
          </div>
          <span className="result-label">QUIZ COMPLETED</span>
          <h1>{attempt.passed ? `Well done, ${firstName}!` : `Keep going, ${firstName}!`}</h1>
          <p>
            You {attempt.passed ? "passed" : "did not reach the pass mark for"}{" "}
            <strong>{attempt.quizTitle}</strong>
            {minutes ? ` in ${minutes} min` : ""}. Pass mark: {attempt.passPercentage}%.
          </p>
        </section>

        <section className="score-card">
          <div
            className="score-circle"
            style={{ "--pct": `${percentage * 3.6}deg` }}
          >
            <div>
              <strong>{percentage}%</strong>
              <span>Grade</span>
            </div>
          </div>

          <div className="score-info">
            <span className="score-label">YOUR MARKS</span>
            <h2>
              {attempt.score} / {attempt.maxScore}
            </h2>
            <p className={attempt.passed ? "excellent" : "needs-work"}>
              <span className={attempt.passed ? "pass-tag" : "fail-tag"}>
                {attempt.passed ? "Passed" : "Not passed"}
              </span>
            </p>
          </div>
        </section>

        <section className="result-stats">
          <div className="result-stat correct">
            <div className="result-stat-icon">✓</div>
            <div>
              <span>Correct</span>
              <strong>{count("correct")}</strong>
            </div>
          </div>
          <div className="result-stat partial">
            <div className="result-stat-icon">◐</div>
            <div>
              <span>Partially correct</span>
              <strong>{count("partial")}</strong>
            </div>
          </div>
          <div className="result-stat wrong">
            <div className="result-stat-icon">×</div>
            <div>
              <span>Incorrect</span>
              <strong>{count("wrong")}</strong>
            </div>
          </div>
          <div className="result-stat unanswered">
            <div className="result-stat-icon">−</div>
            <div>
              <span>Not answered</span>
              <strong>{count("unanswered")}</strong>
            </div>
          </div>
        </section>

        <section className="review-section">
          <div className="review-heading">
            <div>
              <h2>Review</h2>
              <p>
                {attempt.showCorrectAnswers
                  ? "See your answers next to the correct ones."
                  : "Your teacher has hidden the correct answers for this quiz."}
              </p>
            </div>
            <div className="review-filters">
              {["all", "correct", "partial", "wrong", "unanswered"].map((key) => (
                <button
                  type="button"
                  key={key}
                  className={filter === key ? "active" : ""}
                  onClick={() => setFilter(key)}
                >
                  {key === "all" ? `All (${review.length})` : `${STATUS_TEXT[key].replace(/^[^A-Za-z]+/, "")} (${count(key)})`}
                </button>
              ))}
            </div>
          </div>

          <div className="review-list">
            {visible.length === 0 && <p className="review-empty">Nothing to show for this filter.</p>}
            {visible.map((item) => {
              const number = review.indexOf(item) + 1;
              return (
                <div key={item.questionId || number} className="review-item">
                  <div className={`review-number ${item.status}`}>{number}</div>

                  <div className="review-question">
                    <div className="review-meta">
                      <span>{typeLabel(item.type)}</span>
                      <span>
                        {item.earned} / {item.marks} mark{item.marks === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h3>{item.question}</h3>

                    <div className="review-answer">
                      <span>Your answer:</span>
                      <strong className={`answer-${item.status}`}>
                        <AnswerValue item={item} value={item.userAnswer} />
                      </strong>
                    </div>

                    {attempt.showCorrectAnswers && item.status !== "correct" && item.correctAnswer != null && (
                      <div className="correct-answer">
                        Correct answer:{" "}
                        <strong>
                          <AnswerValue item={item} value={item.correctAnswer} />
                        </strong>
                      </div>
                    )}

                    {item.feedback && <p className="review-feedback">{item.feedback}</p>}
                  </div>

                  <div className="review-status">
                    <span className={`status-${item.status}`}>{STATUS_TEXT[item.status]}</span>
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
            onClick={() => navigate(attempt.quizId ? `/student/attempt/${attempt.quizId}` : "/student")}
          >
            ↻ Try again
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
