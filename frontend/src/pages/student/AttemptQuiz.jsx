import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { TYPE_INSTRUCTIONS, isAnswered, typeLabel } from "../../utils/questionTypes";
import "./AttemptQuiz.css";

const AUTOSAVE_DELAY = 800;

function QuestionInput({ question, value, onChange }) {
  if (question.type === "mcq" || question.type === "truefalse" || question.type === "multi") {
    const isMulti = question.type === "multi";
    const selected = isMulti ? value || [] : value;

    const choose = (option) => {
      if (!isMulti) {
        onChange(option);
        return;
      }
      onChange(
        selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option]
      );
    };

    return (
      <div className={`options-list ${question.type === "truefalse" ? "tf" : ""}`}>
        {question.options.map((option, index) => {
          const isSelected = isMulti ? selected.includes(option) : selected === option;
          return (
            <button
              key={option}
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={isSelected}
              className={`answer-option ${isSelected ? "selected" : ""} ${isMulti ? "multi" : ""}`}
              onClick={() => choose(option)}
            >
              <span className="option-letter">
                {question.type === "truefalse" ? (option === "True" ? "T" : "F") : String.fromCharCode(65 + index)}
              </span>
              <span className="option-text">{option}</span>
              <span className="option-check">{isSelected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "shortanswer" || question.type === "numerical") {
    return (
      <input
        className="text-answer"
        value={value || ""}
        inputMode={question.type === "numerical" ? "decimal" : "text"}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.type === "numerical" ? "Enter a number" : "Type your answer"}
        autoComplete="off"
      />
    );
  }

  if (question.type === "matching") {
    const current = value || {};
    return (
      <div className="matching-list">
        {question.prompts.map((prompt, index) => (
          <div className="matching-row" key={prompt + index}>
            <span className="matching-prompt">{prompt}</span>
            <span className="matching-arrow">→</span>
            <select
              value={current[index] || ""}
              onChange={(e) => onChange({ ...current, [index]: e.target.value })}
              className={current[index] ? "chosen" : ""}
            >
              <option value="">Choose…</option>
              {question.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function AttemptQuiz() {
  const navigate = useNavigate();
  const { id: quizId } = useParams();

  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState("");

  const endAtRef = useRef(null);
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let active = true;

    api
      .startAttempt(quizId)
      .then((data) => {
        if (!active) return;
        const started = data.attempt;
        setAttempt(started);
        setAnswers(started.answers || {});
        answersRef.current = started.answers || {};
        setResumed(Boolean(data.resumed));

        if (started.deadline) {
          const remaining = new Date(started.deadline) - new Date(started.serverNow);
          endAtRef.current = Date.now() + remaining;
          setTimeLeft(Math.max(0, Math.round(remaining / 1000)));
        }
      })
      .catch((err) => active && setFatal(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [quizId]);

  const goToResult = useCallback(
    (attemptId) => navigate(`/student/result/${attemptId}`, { replace: true }),
    [navigate]
  );

  const submitQuiz = useCallback(async () => {
    if (!attempt || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await api.submitAttempt(attempt.id, answersRef.current);
      goToResult(attempt.id);
    } catch (err) {
      if (err.status === 409) {
        goToResult(err.data?.attemptId || attempt.id);
        return;
      }
      submittedRef.current = false;
      setError(err.message);
      setShowSubmitModal(false);
      setSubmitting(false);
    }
  }, [attempt, goToResult]);

  // Countdown based on the server deadline; auto-submits when time runs out.
  useEffect(() => {
    if (!attempt || !endAtRef.current) return undefined;

    const tick = () => {
      const seconds = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setTimeLeft(seconds);
      if (seconds <= 0) submitQuiz();
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, submitQuiz]);

  // Debounced autosave so a refresh or lost connection keeps the answers.
  useEffect(() => {
    if (!attempt || !dirtyRef.current) return undefined;

    setSaveState("pending");
    const timer = setTimeout(() => {
      if (submittedRef.current) return;
      setSaveState("saving");
      api
        .saveAnswers(attempt.id, answersRef.current)
        .then(() => setSaveState("saved"))
        .catch((err) => {
          if (err.status === 409) {
            submittedRef.current = true;
            goToResult(err.data?.attemptId || attempt.id);
            return;
          }
          setSaveState("error");
        });
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [answers, attempt, goToResult]);

  useEffect(() => {
    const warn = (event) => {
      if (!submittedRef.current && saveState !== "saved" && dirtyRef.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spin" />
        <p>Preparing your quiz…</p>
      </div>
    );
  }

  if (fatal || !attempt) {
    return (
      <div className="page-loader">
        <div className="blocked-icon">!</div>
        <p className="blocked-message">{fatal || "Quiz not found"}</p>
        <div className="blocked-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate("/student/results")}>
            My results
          </button>
          <button type="button" className="primary-btn" onClick={() => navigate("/student")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const questions = attempt.quiz.questions;
  const question = questions[currentQuestion];

  const setAnswer = (value) => {
    dirtyRef.current = true;
    setAnswers((previous) => {
      const next = { ...previous, [question.id]: value };
      answersRef.current = next;
      return next;
    });
  };

  const clearAnswer = () => {
    dirtyRef.current = true;
    setAnswers((previous) => {
      const next = { ...previous };
      delete next[question.id];
      answersRef.current = next;
      return next;
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentAnswered = isAnswered(question, answers[question.id]);

  const saveLabel = {
    idle: "",
    pending: "Unsaved changes",
    saving: "Saving…",
    saved: "All answers saved",
    error: "Couldn't save — check your connection",
  }[saveState];

  return (
    <div className="attempt-page">
      <header className="attempt-header">
        <div className="attempt-logo">
          Quiz<span>InGo</span>
        </div>

        <div className="attempt-title">
          <strong>{attempt.quiz.title}</strong>
          <span>
            {attempt.quiz.category} • {attempt.quiz.marks} Marks • Attempt {attempt.attemptNumber}
            {attempt.attemptsAllowed ? ` of ${attempt.attemptsAllowed}` : ""}
          </span>
        </div>

        <div className="attempt-header-right">
          {saveLabel && <div className={`save-indicator ${saveState}`}>{saveLabel}</div>}

          {timeLeft == null ? (
            <div className="quiz-timer no-limit">No time limit</div>
          ) : (
            <div className={`quiz-timer ${timeLeft < 300 ? "danger" : ""}`}>
              <span>◷</span>
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

      <main className="attempt-main">
        <section className="question-section">
          {resumed && (
            <div className="resume-banner">
              Welcome back — we restored your saved answers. The timer kept running while you were away.
              <button type="button" onClick={() => setResumed(false)} aria-label="Dismiss">
                ✕
              </button>
            </div>
          )}

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
            <div className="question-meta">
              <span className="q-type-pill">{typeLabel(question.type)}</span>
              <span>
                {question.marks} mark{question.marks === 1 ? "" : "s"}
              </span>
            </div>

            <h1>{question.question}</h1>
            <p className="question-instruction">{TYPE_INSTRUCTIONS[question.type]}</p>

            <QuestionInput question={question} value={answers[question.id]} onChange={setAnswer} />

            {currentAnswered && (
              <button type="button" className="clear-answer" onClick={clearAnswer}>
                Clear my answer
              </button>
            )}
          </div>

          {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

          <div className="question-navigation">
            <button
              type="button"
              className="previous-btn"
              onClick={() => setCurrentQuestion((i) => Math.max(0, i - 1))}
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
                Finish attempt ✓
              </button>
            ) : (
              <button
                type="button"
                className="next-btn"
                onClick={() => setCurrentQuestion((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next →
              </button>
            )}
          </div>
        </section>

        <aside className="question-sidebar">
          <div className="palette-card">
            <div className="palette-heading">
              <h3>Quiz navigation</h3>
              <span>{answeredCount} answered</span>
            </div>

            <div className="palette-grid">
              {questions.map((item, index) => {
                const answered = isAnswered(item, answers[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    className={`palette-number ${answered ? "answered" : ""} ${
                      currentQuestion === index ? "current" : ""
                    }`}
                    aria-label={`Question ${index + 1}${answered ? ", answered" : ""}`}
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
              <button type="button" className="submit-btn" onClick={() => setShowSubmitModal(true)}>
                Finish attempt
              </button>
              <p>Answers are saved automatically. You can come back before time runs out.</p>
            </div>
          </div>
        </aside>
      </main>

      {(showSubmitModal || (timeLeft === 0 && submitting)) && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <div className="modal-icon">{timeLeft === 0 ? "◷" : "✓"}</div>
            <h2>{timeLeft === 0 ? "Time is up" : "Submit all and finish?"}</h2>
            <p>
              {timeLeft === 0 ? (
                "Submitting your saved answers…"
              ) : (
                <>
                  You have answered <strong>{answeredCount}</strong> out of{" "}
                  <strong>{questions.length}</strong> questions. You can&apos;t change answers after
                  submitting.
                </>
              )}
            </p>

            {timeLeft !== 0 && answeredCount < questions.length && (
              <div className="warning-message">
                {questions.length - answeredCount} question(s) are not answered yet.
              </div>
            )}

            {timeLeft !== 0 && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                >
                  Return to attempt
                </button>
                <button
                  type="button"
                  className="confirm-submit-btn"
                  onClick={submitQuiz}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit all"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttemptQuiz;
