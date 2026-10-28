import { QUESTION_TYPES } from "../utils/questionTypes";

const MAX_OPTIONS = 10;

function QuestionEditor({
  value,
  index,
  total,
  error,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}) {
  const update = (patch) => onChange({ ...value, ...patch });

  const changeType = (type) => {
    const patch = { type };
    if (type === "mcq") patch.correct = value.correct.slice(0, 1);
    update(patch);
  };

  const setOption = (optionIndex, text) => {
    const options = [...value.options];
    options[optionIndex] = text;
    update({ options });
  };

  const removeOption = (optionIndex) => {
    if (value.options.length <= 2) return;
    update({
      options: value.options.filter((_, i) => i !== optionIndex),
      correct: value.correct
        .filter((i) => i !== optionIndex)
        .map((i) => (i > optionIndex ? i - 1 : i)),
    });
  };

  const toggleCorrect = (optionIndex) => {
    if (value.type === "mcq") {
      update({ correct: [optionIndex] });
      return;
    }
    update({
      correct: value.correct.includes(optionIndex)
        ? value.correct.filter((i) => i !== optionIndex)
        : [...value.correct, optionIndex],
    });
  };

  const setPair = (pairIndex, field, text) => {
    update({
      pairs: value.pairs.map((pair, i) => (i === pairIndex ? { ...pair, [field]: text } : pair)),
    });
  };

  const typeInfo = QUESTION_TYPES.find((item) => item.value === value.type);

  return (
    <div className={`q-editor ${error ? "has-error" : ""}`} id={`question-${value.key}`}>
      <div className="q-editor-head">
        <span className="q-number">Q{index + 1}</span>

        <select
          className="q-type-select"
          value={value.type}
          onChange={(e) => changeType(e.target.value)}
          aria-label="Question type"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <label className="q-marks">
          Marks
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={value.marks}
            onChange={(e) => update({ marks: e.target.value })}
          />
        </label>

        <div className="q-actions">
          <button type="button" className="icon-btn" title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className="icon-btn" title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" className="icon-btn" title="Duplicate" onClick={onDuplicate}>
            ⧉
          </button>
          <button type="button" className="icon-btn danger" title="Remove" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      {typeInfo && <p className="q-type-hint">{typeInfo.hint}</p>}

      <textarea
        className="q-text"
        rows={2}
        value={value.question}
        onChange={(e) => update({ question: e.target.value })}
        placeholder="Type the question…"
      />

      {(value.type === "mcq" || value.type === "multi") && (
        <div className="q-options">
          <p className="q-sub-label">
            {value.type === "mcq"
              ? "Options — click the circle to mark the correct one"
              : "Options — tick every correct option"}
          </p>
          {value.options.map((option, optionIndex) => (
            <div
              className={`option-row ${value.correct.includes(optionIndex) ? "is-correct" : ""}`}
              key={optionIndex}
            >
              <button
                type="button"
                className={`correct-toggle ${value.type === "multi" ? "square" : ""}`}
                onClick={() => toggleCorrect(optionIndex)}
                aria-label={`Mark option ${String.fromCharCode(65 + optionIndex)} correct`}
              >
                {value.correct.includes(optionIndex) ? "✓" : ""}
              </button>
              <span className="option-letter-sm">{String.fromCharCode(65 + optionIndex)}</span>
              <input
                value={option}
                onChange={(e) => setOption(optionIndex, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
              />
              <button
                type="button"
                className="icon-btn"
                title="Remove option"
                disabled={value.options.length <= 2}
                onClick={() => removeOption(optionIndex)}
              >
                ✕
              </button>
            </div>
          ))}
          {value.options.length < MAX_OPTIONS && (
            <button
              type="button"
              className="link-btn"
              onClick={() => update({ options: [...value.options, ""] })}
            >
              + Add option
            </button>
          )}
        </div>
      )}

      {value.type === "truefalse" && (
        <div className="tf-toggle">
          {["True", "False"].map((option) => (
            <button
              type="button"
              key={option}
              className={value.tfAnswer === option ? "active" : ""}
              onClick={() => update({ tfAnswer: option })}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {value.type === "shortanswer" && (
        <label className="q-field">
          Accepted answers (one per line)
          <textarea
            rows={3}
            value={value.accepted}
            onChange={(e) => update({ accepted: e.target.value })}
            placeholder={"Shakespeare\nWilliam Shakespeare\n*Shakespeare"}
          />
          <small>Not case-sensitive. Use * as a wildcard, e.g. *Shakespeare.</small>
        </label>
      )}

      {value.type === "numerical" && (
        <div className="q-inline-fields">
          <label className="q-field">
            Correct answer
            <input
              inputMode="decimal"
              value={value.numAnswer}
              onChange={(e) => update({ numAnswer: e.target.value })}
              placeholder="e.g. 3.14"
            />
          </label>
          <label className="q-field">
            Accepted error ±
            <input
              inputMode="decimal"
              value={value.tolerance}
              onChange={(e) => update({ tolerance: e.target.value })}
              placeholder="0"
            />
          </label>
        </div>
      )}

      {value.type === "matching" && (
        <div className="q-options">
          <p className="q-sub-label">Pairs — students match each item to its answer</p>
          {value.pairs.map((pair, pairIndex) => (
            <div className="pair-row" key={pairIndex}>
              <input
                value={pair.prompt}
                onChange={(e) => setPair(pairIndex, "prompt", e.target.value)}
                placeholder={`Item ${pairIndex + 1}`}
              />
              <span>→</span>
              <input
                value={pair.match}
                onChange={(e) => setPair(pairIndex, "match", e.target.value)}
                placeholder="Matching answer"
              />
              <button
                type="button"
                className="icon-btn"
                title="Remove pair"
                disabled={value.pairs.length <= 2}
                onClick={() => update({ pairs: value.pairs.filter((_, i) => i !== pairIndex) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="link-btn"
            onClick={() => update({ pairs: [...value.pairs, { prompt: "", match: "" }] })}
          >
            + Add pair
          </button>
        </div>
      )}

      <input
        className="q-feedback"
        value={value.feedback}
        onChange={(e) => update({ feedback: e.target.value })}
        placeholder="General feedback shown after submission (optional)"
      />

      {error && <p className="q-error">{error}</p>}
    </div>
  );
}

export default QuestionEditor;
