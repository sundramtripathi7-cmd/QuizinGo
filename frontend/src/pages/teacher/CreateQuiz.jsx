import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import QuestionEditor from "../../components/QuestionEditor";
import ImportPanel from "../../components/ImportPanel";
import BankPicker from "../../components/BankPicker";
import { api } from "../../api";
import {
  QUESTION_TYPES,
  emptyEditorQuestion,
  fromEditorQuestion,
  toEditorQuestion,
  validateEditorQuestion,
} from "../../utils/questionTypes";
import "../student/StudentDashboard.css";
import "./Teacher.css";

const COLORS = [
  { value: "", label: "Teal" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
];

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const defaultForm = {
  classroom: "",
  title: "",
  category: "",
  description: "",
  icon: "📝",
  color: "",
  duration: 30,
  attemptsAllowed: 0,
  passPercentage: 40,
  openAt: "",
  closeAt: "",
  shuffleQuestions: false,
  shuffleAnswers: true,
  showCorrectAnswers: true,
  isPublished: true,
};

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-switch" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function CreateQuiz() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetClass = searchParams.get("class") || "";

  const [form, setForm] = useState({ ...defaultForm, classroom: presetClass });
  const [classes, setClasses] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [addMode, setAddMode] = useState(null);
  const [manualType, setManualType] = useState("mcq");
  const [notice, setNotice] = useState("");
  const [saveToBank, setSaveToBank] = useState(!isEdit);
  const [bankCategory, setBankCategory] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const noticeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    let active = true;
    api
      .getClasses()
      .then(({ classes: list }) => {
        if (!active) return;
        setClasses(list);
        if (list.length === 1) {
          setForm((previous) => (previous.classroom ? previous : { ...previous, classroom: list[0].id }));
        }
      })
      .catch(() => active && setClasses([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;

    api
      .getQuizForEdit(id)
      .then(({ quiz }) => {
        if (!active) return;
        const { questions: loadedQuestions, ...settings } = quiz;
        setForm({
          ...defaultForm,
          ...settings,
          openAt: toLocalInput(quiz.openAt),
          closeAt: toLocalInput(quiz.closeAt),
        });
        setQuestions(loadedQuestions.map((q) => toEditorQuestion(q, { keepId: true })));
      })
      .catch((err) => active && setFormError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [questions]
  );

  const typeCounts = useMemo(() => {
    const counts = {};
    questions.forEach((q) => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const setField = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const flash = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4000);
  };

  const appendQuestions = (incoming, message) => {
    setQuestions((previous) => [...previous, ...incoming]);
    setAddMode(null);
    if (message) flash(message);
    setTimeout(() => {
      document
        .getElementById(`question-${incoming[0]?.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleImport = (incoming, result) => {
    if (!form.title && result?.sourceName && result.sourceName !== "Pasted text") {
      setForm((previous) => ({
        ...previous,
        title: result.sourceName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      }));
    }
    appendQuestions(incoming, `Added ${incoming.length} question${incoming.length === 1 ? "" : "s"} from ${result?.sourceName || "import"}`);
  };

  const updateQuestion = (key, next) => {
    setQuestions((previous) => previous.map((q) => (q.key === key ? next : q)));
    if (errors[key]) {
      setErrors((previous) => {
        const copy = { ...previous };
        delete copy[key];
        return copy;
      });
    }
  };

  const removeQuestion = (key) => {
    setQuestions((previous) => previous.filter((q) => q.key !== key));
  };

  const duplicateQuestion = (key) => {
    setQuestions((previous) => {
      const index = previous.findIndex((q) => q.key === key);
      const source = previous[index];
      const copy = {
        ...structuredClone(source),
        key: emptyEditorQuestion().key,
        id: undefined,
      };
      return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
    });
  };

  const moveQuestion = (key, direction) => {
    setQuestions((previous) => {
      const index = previous.findIndex((q) => q.key === key);
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const copy = [...previous];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.classroom) {
      setFormError("Choose the class that should see this quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!form.title.trim() || !form.category.trim()) {
      setFormError("Add a title and category for the quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!questions.length) {
      setFormError("Add at least one question");
      return;
    }

    const nextErrors = {};
    questions.forEach((q) => {
      const message = validateEditorQuestion(q);
      if (message) nextErrors[q.key] = message;
    });
    setErrors(nextErrors);

    const firstError = questions.find((q) => nextErrors[q.key]);
    if (firstError) {
      setFormError(`${Object.keys(nextErrors).length} question(s) need attention`);
      document
        .getElementById(`question-${firstError.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        duration: Number(form.duration) || 0,
        attemptsAllowed: Number(form.attemptsAllowed) || 0,
        passPercentage: Number(form.passPercentage) || 0,
        openAt: form.openAt ? new Date(form.openAt).toISOString() : null,
        closeAt: form.closeAt ? new Date(form.closeAt).toISOString() : null,
        questions: questions.map(fromEditorQuestion),
        saveToBank,
        bankCategory: bankCategory.trim() || form.category.trim(),
      };

      if (isEdit) await api.updateQuiz(id, payload);
      else await api.createQuiz(payload);

      navigate("/teacher");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spin" />
        <p>Loading quiz…</p>
      </div>
    );
  }

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">{isEdit ? "EDIT QUIZ" : "CREATE QUIZ"}</span>
            <h1>{isEdit ? form.title || "Edit quiz" : "Build a new assessment"}</h1>
            <p>Upload a question paper, reuse saved questions, or write them yourself.</p>
          </div>
          <Link to="/teacher" className="secondary-btn">
            ← Back
          </Link>
        </section>

        <form className="create-layout" onSubmit={handleSubmit}>
          <section className="card-block">
            <h2 className="block-title">Quiz details</h2>
            <div className="create-grid">
              <label className="span-2">
                Class
                {classes && classes.length === 0 ? (
                  <span className="class-needed">
                    You need a class before students can see a quiz.{" "}
                    <Link to="/teacher/classes">Create a class →</Link>
                  </span>
                ) : (
                  <select value={form.classroom} onChange={setField("classroom")} disabled={!classes}>
                    <option value="">{classes ? "Choose a class…" : "Loading classes…"}</option>
                    {(classes || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.studentCount} student{item.studentCount === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                )}
                <small>Only students enrolled in this class can see and attempt the quiz.</small>
              </label>
              <label>
                Title
                <input value={form.title} onChange={setField("title")} placeholder="e.g. DBMS Fundamentals" />
              </label>
              <label>
                Category
                <input value={form.category} onChange={setField("category")} placeholder="e.g. Database" />
              </label>
              <label className="span-2">
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={setField("description")}
                  placeholder="Short description students see before starting"
                />
              </label>
              <label>
                Icon
                <input value={form.icon} onChange={setField("icon")} placeholder="📝" maxLength={8} />
              </label>
              <label>
                Card colour
                <select value={form.color} onChange={setField("color")}>
                  {COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="card-block">
            <h2 className="block-title">Quiz settings</h2>
            <div className="create-grid three">
              <label>
                Time limit (minutes)
                <input type="number" min="0" value={form.duration} onChange={setField("duration")} />
                <small>0 = no time limit</small>
              </label>
              <label>
                Attempts allowed
                <select value={form.attemptsAllowed} onChange={setField("attemptsAllowed")}>
                  <option value={0}>Unlimited</option>
                  {[1, 2, 3, 4, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Grade to pass (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.passPercentage}
                  onChange={setField("passPercentage")}
                />
              </label>
              <label>
                Open the quiz
                <input type="datetime-local" value={form.openAt} onChange={setField("openAt")} />
                <small>Leave empty to open immediately</small>
              </label>
              <label>
                Close the quiz
                <input type="datetime-local" value={form.closeAt} onChange={setField("closeAt")} />
                <small>Open attempts are submitted at this time</small>
              </label>
            </div>

            <div className="toggle-grid">
              <Toggle
                checked={form.shuffleQuestions}
                onChange={setField("shuffleQuestions")}
                label="Shuffle questions"
                hint="Each student gets a different order"
              />
              <Toggle
                checked={form.shuffleAnswers}
                onChange={setField("shuffleAnswers")}
                label="Shuffle answer options"
                hint="Within multiple choice questions"
              />
              <Toggle
                checked={form.showCorrectAnswers}
                onChange={setField("showCorrectAnswers")}
                label="Show correct answers in review"
                hint="After the student submits"
              />
              <Toggle
                checked={form.isPublished}
                onChange={setField("isPublished")}
                label="Visible to the class"
                hint="Turn off to keep it as a draft"
              />
            </div>
          </section>

          <section className="card-block">
            <div className="block-title-row">
              <h2 className="block-title">Add questions</h2>
              <span className="muted">Pick any method — you can mix them</span>
            </div>

            <div className="add-tiles">
              <button
                type="button"
                className={`add-tile ${addMode === "upload" ? "active" : ""}`}
                onClick={() => setAddMode(addMode === "upload" ? null : "upload")}
              >
                <span className="tile-icon">⇪</span>
                <strong>Upload a file</strong>
                <small>PDF, Word, TXT, GIFT or CSV</small>
              </button>
              <button
                type="button"
                className={`add-tile ${addMode === "paste" ? "active" : ""}`}
                onClick={() => setAddMode(addMode === "paste" ? null : "paste")}
              >
                <span className="tile-icon">⎘</span>
                <strong>Paste text</strong>
                <small>Copy questions from anywhere</small>
              </button>
              <button
                type="button"
                className={`add-tile ${addMode === "bank" ? "active" : ""}`}
                onClick={() => setAddMode("bank")}
              >
                <span className="tile-icon">▤</span>
                <strong>Question bank</strong>
                <small>Reuse saved questions</small>
              </button>
              <div className={`add-tile manual ${addMode === "manual" ? "active" : ""}`}>
                <span className="tile-icon">✎</span>
                <strong>Write manually</strong>
                <div className="manual-row">
                  <select value={manualType} onChange={(e) => setManualType(e.target.value)}>
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="primary-btn small"
                    onClick={() => appendQuestions([emptyEditorQuestion(manualType)])}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {(addMode === "upload" || addMode === "paste") && (
              <ImportPanel
                key={addMode}
                initialMode={addMode}
                onImport={handleImport}
                onCancel={() => setAddMode(null)}
              />
            )}

            {notice && <div className="notice">{notice}</div>}
          </section>

          <section className="card-block">
            <div className="block-title-row">
              <h2 className="block-title">Questions</h2>
              <div className="question-summary">
                <span>
                  <strong>{questions.length}</strong> questions
                </span>
                <span>
                  <strong>{totalMarks}</strong> marks
                </span>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <span key={type} className={`type-badge ${type}`}>
                    {QUESTION_TYPES.find((t) => t.value === type)?.label} × {count}
                  </span>
                ))}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="empty-questions">
                <p>No questions yet. Upload a file, paste text, pick from the bank or write one manually.</p>
              </div>
            ) : (
              <div className="question-editor-list">
                {questions.map((question, index) => (
                  <QuestionEditor
                    key={question.key}
                    value={question}
                    index={index}
                    total={questions.length}
                    error={errors[question.key]}
                    onChange={(next) => updateQuestion(question.key, next)}
                    onRemove={() => removeQuestion(question.key)}
                    onDuplicate={() => duplicateQuestion(question.key)}
                    onMove={(direction) => moveQuestion(question.key, direction)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="save-bar">
            <label className="bank-save">
              <input type="checkbox" checked={saveToBank} onChange={(e) => setSaveToBank(e.target.checked)} />
              Save questions to my question bank
              {saveToBank && (
                <input
                  className="bank-category-input"
                  value={bankCategory}
                  onChange={(e) => setBankCategory(e.target.value)}
                  placeholder={`Category (default: ${form.category || "quiz category"})`}
                />
              )}
            </label>

            <div className="save-bar-right">
              {formError && <span className="save-error">{formError}</span>}
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save changes" : form.isPublished ? "Publish quiz" : "Save draft"}
              </button>
            </div>
          </div>
        </form>

        {addMode === "bank" && (
          <BankPicker
            onClose={() => setAddMode(null)}
            excludeTexts={questions.map((q) => q.question)}
            onAdd={(incoming) =>
              appendQuestions(incoming, `Added ${incoming.length} question${incoming.length === 1 ? "" : "s"} from the bank`)
            }
          />
        )}
      </main>
    </div>
  );
}

export default CreateQuiz;
