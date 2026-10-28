import { useState } from "react";
import { api } from "../api";
import "./Classes.css";

function JoinClassForm({ onJoined, compact = false }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const { classroom } = await api.joinClass(code);
      setCode("");
      setSuccess(`You joined ${classroom.name}`);
      onJoined?.(classroom);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`join-class ${compact ? "compact" : ""}`} onSubmit={handleSubmit}>
      {!compact && (
        <div className="join-class-text">
          <strong>Join a class</strong>
          <span>Ask your teacher for the 6-character class code.</span>
        </div>
      )}
      <div className="join-class-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. CSE5QZ"
          maxLength={12}
          aria-label="Class code"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="primary-btn small" disabled={busy || !code.trim()}>
          {busy ? "Joining…" : "Join"}
        </button>
      </div>
      {error && <p className="join-class-msg error">{error}</p>}
      {success && <p className="join-class-msg success">{success}</p>}
    </form>
  );
}

export default JoinClassForm;
