import { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import ImportPanel from "../../components/ImportPanel";
import QuestionEditor from "../../components/QuestionEditor";
import { api } from "../../api";
import {
  QUESTION_TYPES,
  emptyEditorQuestion,
  fromEditorQuestion,
  summarizeAnswer,
  typeLabel,
  validateEditorQuestion,
} from "../../utils/questionTypes";
import "../student/StudentDashboard.css";
import "./Teacher.css";

function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ category: "", type: "", search: "" });
  const [selected, setSelected] = useState(new Set());
  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState("");
  const [saveCategory, setSaveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    return api
      .getBank(filters)
      .then((data) => {
        setQuestions(data.questions);
        setCategories(data.categories);
        setSelected(new Set());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const setFilter = (field) => (e) =>
    setFilters((previous) => ({ ...previous, [field]: e.target.value }));

  const category = saveCategory.trim() || "General";

  const saveImported = async (incoming) => {
    setError("");
    try {
      const invalid = incoming.filter((q) => validateEditorQuestion(q));
      const valid = incoming.filter((q) => !validateEditorQuestion(q));
      if (!valid.length) {
        setError("None of the selected questions are complete. Fix them in a quiz editor or the source file.");
        return;
      }
      const { saved } = await api.addToBank(valid.map(fromEditorQuestion), category);
      setPanel(null);
      setNotice(
        `Saved ${saved} question${saved === 1 ? "" : "s"} to "${category}"` +
          (invalid.length ? ` · skipped ${invalid.length} incomplete` : "")
      );
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveDraft = async () => {
    const message = validateEditorQuestion(draft);
    if (message) {
      setDraftError(message);
      return;
    }
    try {
      await api.addToBank([fromEditorQuestion(draft)], category);
      setDraft(null);
      setDraftError("");
      setNotice(`Question saved to "${category}"`);
      load();
    } catch (err) {
      setDraftError(err.message);
    }
  };

  const deleteSelected = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} question(s) from the bank?`)) return;
    try {
      await api.deleteBankQuestions([...selected]);
      setNotice(`Deleted ${selected.size} question(s)`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = (id) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">QUESTION BANK</span>
            <h1>Your reusable questions</h1>
            <p>Save questions once, organise them by category, and reuse them in any quiz.</p>
          </div>
        </section>

        <div className="bank-page">
          <section className="card-block">
            <div className="block-title-row">
              <h2 className="block-title">Add to bank</h2>
              <label className="format-select">
                Category
                <input
                  list="bank-categories"
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  placeholder="General"
                />
                <datalist id="bank-categories">
                  {categories.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="bank-toolbar">
              <button type="button" className="ghost-btn" onClick={() => setPanel(panel === "upload" ? null : "upload")}>
                ⇪ Upload file
              </button>
              <button type="button" className="ghost-btn" onClick={() => setPanel(panel === "paste" ? null : "paste")}>
                ⎘ Paste text
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setDraft(emptyEditorQuestion("mcq"));
                  setDraftError("");
                  setPanel(null);
                }}
              >
                ✎ Write a question
              </button>
            </div>

            {panel && (
              <ImportPanel
                key={panel}
                initialMode={panel}
                addLabel="Save to bank"
                onImport={saveImported}
                onCancel={() => setPanel(null)}
              />
            )}

            {draft && (
              <div className="bank-add-editor" style={{ marginTop: 16 }}>
                <QuestionEditor
                  value={draft}
                  index={0}
                  total={1}
                  error={draftError}
                  onChange={(next) => {
                    setDraft(next);
                    setDraftError("");
                  }}
                  onRemove={() => setDraft(null)}
                  onDuplicate={() => {}}
                  onMove={() => {}}
                />
                <div className="bank-add-editor-foot">
                  <button type="button" className="secondary-btn small" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                  <button type="button" className="primary-btn small" onClick={saveDraft}>
                    Save question
                  </button>
                </div>
              </div>
            )}

            {notice && <div className="notice">{notice}</div>}
            {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
          </section>

          <section className="card-block">
            <div className="block-title-row">
              <h2 className="block-title">
                Questions <span className="muted">({questions.length})</span>
              </h2>
              {selected.size > 0 && (
                <button type="button" className="danger-btn" onClick={deleteSelected}>
                  Delete selected ({selected.size})
                </button>
              )}
            </div>

            <div className="bank-toolbar" style={{ marginBottom: 14 }}>
              <input placeholder="Search questions…" value={filters.search} onChange={setFilter("search")} />
              <select value={filters.category} onChange={setFilter("category")}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select value={filters.type} onChange={setFilter("type")}>
                <option value="">All types</option>
                {QUESTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bank-list">
              {loading && <p className="muted">Loading…</p>}
              {!loading && questions.length === 0 && (
                <div className="empty-questions">
                  <p>No questions here yet. Upload a file or write a question above.</p>
                </div>
              )}
              {!loading &&
                questions.map((question) => (
                  <label key={question.id} className="preview-item">
                    <input
                      type="checkbox"
                      checked={selected.has(question.id)}
                      onChange={() => toggle(question.id)}
                    />
                    <div>
                      <div className="preview-meta">
                        <span className={`type-badge ${question.type}`}>{typeLabel(question.type)}</span>
                        <span>{question.category}</span>
                        <span>
                          {question.marks} mark{question.marks === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p>{question.question}</p>
                      {(question.type === "mcq" || question.type === "multi") && (
                        <small>{question.options.join(" · ")}</small>
                      )}
                      <small className="preview-answer">✓ {summarizeAnswer(question)}</small>
                    </div>
                  </label>
                ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default QuestionBank;
