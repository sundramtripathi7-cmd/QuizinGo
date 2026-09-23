import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import "./AttemptQuiz.css";

function AttemptQuiz() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .getQuiz(id)
      .then((data) => {
        if (!active) return;
        setQuiz(data.quiz);
        setTimeLeft((data.quiz.duration || 30) * 60);
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

  useEffect(() => {
    if (!quiz || timeLeft <= 0) {
      if (quiz && timeLeft <= 0) setShowSubmitModal(true);
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeLeft]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spin" />
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="page-loader">
        <p>{error || "Quiz not found"}</p>
        <button type="button" className="primary-btn" onClick={() => navigate("/student")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const question = questions[currentQuestion];

  const handleAnswer = (option) => {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: option,
    }));
  };

  const goNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    }
  };

  const goPrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    setError("");

    try {
      const data = await api.submitAttempt(id, answers);
      navigate(`/student/result/${data.attempt.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setShowSubmitModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="attempt-page">
      <header className="attempt-header">
        <div className="attempt-logo">
          Quiz<span>InGo</span>
        </div>

        <div className="attempt-title">
          <strong>{quiz.title}</strong>
          <span>
            {quiz.category} • {quiz.marks} Marks
          </span>
        </div>

        <div className="attempt-header-right">
          <div className="live-status">
            <span></span>
            In Progress
          </div>

          <div className={`quiz-timer ${timeLeft < 300 ? "danger" : ""}`}>
            <span>◷</span>
            {formatTime()}
          </div>
        </div>
      </header>

      <main className="attempt-main">
        <section className="question-section">
          <div className="question-top">
            <div>
              <span className="question-label">
                QUESTION {currentQuestion + 1} OF {questions.length}
              </span>
              <div className="question-progress">
                <div style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <span className="answered-count">
              {answeredCount}/{questions.length} Answered
            </span>
          </div>

          <div className="question-card">
            <h1>{question.question}</h1>
            <p className="question-instruction">Select one correct answer.</p>

            <div className="options-list">
              {question.options.map((option, index) => {
                const isSelected = answers[question.id] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`answer-option ${isSelected ? "selected" : ""}`}
                    onClick={() => handleAnswer(option)}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
                    <span className="option-check">{isSelected ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="question-navigation">
            <button
              type="button"
              className="previous-btn"
              onClick={goPrevious}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </button>

            <span>
              {currentQuestion + 1} / {questions.length}
            </span>

            {currentQuestion === questions.length - 1 ? (
              <button
                type="button"
                className="next-btn submit-small"
                onClick={() => setShowSubmitModal(true)}
              >
                Submit Quiz ✓
              </button>
            ) : (
              <button type="button" className="next-btn" onClick={goNext}>
                Next →
              </button>
            )}
          </div>
        </section>

        <aside className="question-sidebar">
          <div className="palette-card">
            <div className="palette-heading">
              <h3>Question Palette</h3>
              <span>{answeredCount} answered</span>
            </div>

            <div className="palette-grid">
              {questions.map((item, index) => {
                const isAnswered = answers[item.id] !== undefined;
                const isCurrent = currentQuestion === index;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    className={`palette-number ${isAnswered ? "answered" : ""} ${
                      isCurrent ? "current" : ""
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="palette-legend">
              <div>
                <span className="legend-box answered"></span>
                Answered
              </div>
              <div>
                <span className="legend-box current"></span>
                Current
              </div>
              <div>
                <span className="legend-box"></span>
                Not Answered
              </div>
            </div>

            <div className="submit-container">
              <button
                type="button"
                className="submit-btn"
                onClick={() => setShowSubmitModal(true)}
              >
                Submit Quiz
              </button>
              <p>You can review your answers before submitting.</p>
            </div>
          </div>
        </aside>
      </main>

      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <div className="modal-icon">✓</div>
            <h2>Submit Quiz?</h2>
            <p>
              You have answered <strong>{answeredCount}</strong> out of{" "}
              <strong>{questions.length}</strong> questions.
            </p>

            {answeredCount < questions.length && (
              <div className="warning-message">
                You still have unanswered questions.
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Continue Quiz
              </button>
              <button
                type="button"
                className="confirm-submit-btn"
                onClick={submitQuiz}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttemptQuiz;
