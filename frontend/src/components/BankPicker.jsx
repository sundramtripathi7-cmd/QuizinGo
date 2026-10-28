import { useEffect, useState } from "react";
import { api } from "../api";
import { QUESTION_TYPES, summarizeAnswer, toEditorQuestion, typeLabel } from "../utils/questionTypes";

function BankPicker({ onClose, onAdd, excludeTexts = [] }) {
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .getBank({ category, type, search })
        .then((data) => {
          if (!active) return;
          setQuestions(data.questions);
          setCategories(data.categories);
        })
        .catch((err) => active && setError(err.message))
        .finally(() => active && setLoading(false));
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, type, search]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const existing = new Set(excludeTexts.map((text) => text.trim().toLowerCase()));

  const toggle = (id) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = () => {
    onAdd(
      questions
        .filter((question) => selected.has(question.id))
        .map((question) => toEditorQuestion(question))
    );
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bank-modal" role="dialog" aria-modal="true" aria-label="Question bank">
        <div className="bank-modal-head">
          <div>
            <h3>Add from question bank</h3>
            <p>Reuse questions you saved earlier.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="bank-filters">
          <input
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {QUESTION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bank-list">
          {loading && <p className="muted pad">Loading…</p>}
          {error && <div className="form-error">{error}</div>}
          {!loading && questions.length === 0 && (
            <p className="muted pad">No questions found. Save questions to the bank when you publish a quiz, or import them on the Question Bank page.</p>
          )}
          {!loading &&
            questions.map((question) => {
              const already = existing.has(question.question.trim().toLowerCase());
              return (
                <label key={question.id} className={`preview-item ${already ? "is-added" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(question.id)}
                    onChange={() => toggle(question.id)}
                  />
                  <div>
                    <div className="preview-meta">
                      <span className={`type-badge ${question.type}`}>{typeLabel(question.type)}</span>
                      <span>{question.category}</span>
                      {already && <span className="added-tag">Already in quiz</span>}
                    </div>
                    <p>{question.question}</p>
                    <small className="preview-answer">✓ {summarizeAnswer(question)}</small>
                  </div>
                </label>
              );
            })}
        </div>

        <div className="bank-modal-foot">
          <span className="muted">{selected.size} selected</span>
          <button type="button" className="primary-btn small" disabled={!selected.size} onClick={add}>
            Add selected
          </button>
        </div>
      </div>
    </div>
  );
}

export default BankPicker;
