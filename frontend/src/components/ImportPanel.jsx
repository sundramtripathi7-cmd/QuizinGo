import { useRef, useState } from "react";
import { api } from "../api";
import {
  TEMPLATES,
  downloadTemplate,
  summarizeAnswer,
  toEditorQuestion,
  typeLabel,
} from "../utils/questionTypes";

const FORMATS = [
  { value: "auto", label: "Auto-detect" },
  { value: "text", label: "Plain text / Aiken" },
  { value: "gift", label: "Moodle GIFT" },
  { value: "csv", label: "CSV" },
];

const ACCEPT = ".txt,.pdf,.docx,.gift,.csv,.md";

function ImportPanel({ initialMode = "upload", onImport, onCancel, addLabel = "Add to quiz" }) {
  const [mode, setMode] = useState(initialMode);
  const [format, setFormat] = useState("auto");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showGuide, setShowGuide] = useState(false);
  const fileInput = useRef(null);

  const reset = () => {
    setResult(null);
    setSelected(new Set());
    setError("");
  };

  const pickFile = (picked) => {
    if (!picked) return;
    setFile(picked);
    reset();
  };

  const readQuestions = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data =
        mode === "upload" ? await api.importFile(file, format) : await api.importText(text, format);
      setResult(data);
      setSelected(new Set(data.questions.map((_, index) => index)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (index) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addSelected = () => {
    const questions = result.questions
      .filter((_, index) => selected.has(index))
      .map((question) => toEditorQuestion(question));
    onImport(questions, result);
  };

  const warningsFor = (index) =>
    result?.warnings.filter((warning) => warning.index === index) || [];
  const generalWarnings = result?.warnings.filter((warning) => warning.index == null) || [];
  const canRead = mode === "upload" ? Boolean(file) : text.trim().length > 0;

  return (
    <div className="import-panel">
      <div className="import-head">
        <div className="segmented">
          <button
            type="button"
            className={mode === "upload" ? "active" : ""}
            onClick={() => {
              setMode("upload");
              reset();
            }}
          >
            Upload file
          </button>
          <button
            type="button"
            className={mode === "paste" ? "active" : ""}
            onClick={() => {
              setMode("paste");
              reset();
            }}
          >
            Paste text
          </button>
        </div>

        <label className="format-select">
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === "upload" ? (
        <div
          className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <div className="drop-icon">⇪</div>
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span>{(file.size / 1024).toFixed(1)} KB · click to choose another file</span>
            </>
          ) : (
            <>
              <strong>Drop a file here or click to browse</strong>
              <span>PDF, Word (.docx), Text (.txt), Moodle GIFT (.gift) or CSV — up to 10 MB</span>
            </>
          )}
        </div>
      ) : (
        <textarea
          className="paste-area"
          rows={9}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (result) reset();
          }}
          placeholder={TEMPLATES.text.content.split("\n").slice(0, 7).join("\n")}
        />
      )}

      <div className="import-actions">
        <button type="button" className="link-btn" onClick={() => setShowGuide((v) => !v)}>
          {showGuide ? "Hide format guide" : "Format guide & templates"}
        </button>
        <div className="import-actions-right">
          {onCancel && (
            <button type="button" className="secondary-btn small" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="primary-btn small"
            disabled={!canRead || loading}
            onClick={readQuestions}
          >
            {loading ? "Reading…" : "Read questions"}
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="format-guide">
          <p>
            Number each question, list options as <code>A)</code> <code>B)</code>…, and add an{" "}
            <code>Answer:</code> line. Questions without options become True/False, numerical or
            short answer automatically based on the answer. Use <code>item -&gt; match</code> lines
            for matching questions. Optional lines: <code>Marks: 2</code>,{" "}
            <code>Feedback: …</code>.
          </p>
          <pre>{TEMPLATES.text.content.split("\n").slice(0, 16).join("\n")}</pre>
          <div className="template-links">
            <span>Download a template:</span>
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <button type="button" key={key} className="chip-btn" onClick={() => downloadTemplate(key)}>
                {template.label}
              </button>
            ))}
          </div>
          <p className="muted">
            PDFs must contain selectable text — scanned images can&apos;t be read.
          </p>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="import-preview">
          <div className="preview-head">
            <div>
              <strong>
                Found {result.questions.length} question{result.questions.length === 1 ? "" : "s"}
              </strong>
              <span>
                {result.sourceName} · detected format: {FORMATS.find((f) => f.value === result.format)?.label}
              </span>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                setSelected(
                  selected.size === result.questions.length
                    ? new Set()
                    : new Set(result.questions.map((_, index) => index))
                )
              }
            >
              {selected.size === result.questions.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          {generalWarnings.map((warning, i) => (
            <p className="warning-text" key={`general-${i}`}>
              ⚠ {warning.message}
            </p>
          ))}

          <div className="preview-list">
            {result.questions.map((question, index) => {
              const warnings = warningsFor(index);
              return (
                <label
                  key={index}
                  className={`preview-item ${warnings.length ? "has-warning" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(index)}
                    onChange={() => toggle(index)}
                  />
                  <div>
                    <div className="preview-meta">
                      <span className={`type-badge ${question.type}`}>{typeLabel(question.type)}</span>
                      <span>{question.marks || 1} mark{question.marks > 1 ? "s" : ""}</span>
                    </div>
                    <p>{question.question || <em>No question text</em>}</p>
                    {question.type !== "matching" && question.options?.length > 0 && question.type !== "truefalse" && (
                      <small>{question.options.join(" · ")}</small>
                    )}
                    {summarizeAnswer(question) && (
                      <small className="preview-answer">✓ {summarizeAnswer(question)}</small>
                    )}
                    {warnings.map((warning, i) => (
                      <small className="warning-text" key={i}>
                        ⚠ {warning.message}
                      </small>
                    ))}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="preview-footer-bar">
            <span className="muted">Questions with warnings can be fixed in the editor after adding.</span>
            <button
              type="button"
              className="primary-btn small"
              disabled={selected.size === 0}
              onClick={addSelected}
            >
              {addLabel} ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportPanel;
