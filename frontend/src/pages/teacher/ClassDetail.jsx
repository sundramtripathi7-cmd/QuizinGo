import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "../student/StudentExtra.css";
import "./Teacher.css";
import "../../components/Classes.css";

function AddResult({ result }) {
  if (!result) return null;
  const lines = [];
  if (result.added.length) {
    lines.push(["ok", `Added ${result.added.map((s) => s.name).join(", ")}`]);
  }
  if (result.alreadyEnrolled.length) {
    lines.push(["info", `Already in this class: ${result.alreadyEnrolled.join(", ")}`]);
  }
  if (result.notFound.length) {
    lines.push(["warn", `No account yet: ${result.notFound.join(", ")} — ask them to register, then add them again or share the class code.`]);
  }
  if (result.notStudent.length) {
    lines.push(["warn", `Not student accounts: ${result.notStudent.join(", ")}`]);
  }
  if (result.invalid.length) {
    lines.push(["warn", `Not valid emails: ${result.invalid.join(", ")}`]);
  }
  return (
    <div className="add-result">
      {lines.map(([kind, text]) => (
        <div key={text} className={kind}>
          {text}
        </div>
      ))}
    </div>
  );
}

function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState("");
  const [addResult, setAddResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState({ name: "", description: "" });

  useEffect(() => {
    api
      .getClass(id)
      .then(({ classroom }) => setData(classroom))
      .catch((err) => setError(err.message));
  }, [id]);

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data?.students || [];
    return term
      ? list.filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(term))
      : list;
  }, [data, search]);

  const run = async (key, action) => {
    setError("");
    setBusy(key);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy — select the code and copy it manually");
    }
  };

  const newCode = () =>
    run("code", async () => {
      if (!window.confirm("Generate a new code? The old code will stop working.")) return;
      const { code } = await api.regenerateClassCode(id);
      setData((previous) => ({ ...previous, code }));
    });

  const toggleJoin = (joinEnabled) =>
    run("join", async () => {
      await api.updateClass(id, { joinEnabled });
      setData((previous) => ({ ...previous, joinEnabled }));
    });

  const addStudents = (event) => {
    event.preventDefault();
    run("add", async () => {
      const result = await api.addClassStudents(id, emails);
      setAddResult(result);
      if (result.added.length) {
        setEmails("");
        setData((previous) => ({
          ...previous,
          students: [...previous.students, ...result.added].sort((a, b) => a.name.localeCompare(b.name)),
          studentCount: result.studentCount,
        }));
      }
    });
  };

  const removeStudent = (student) =>
    run(`remove-${student.id}`, async () => {
      if (!window.confirm(`Remove ${student.name} from this class? They will lose access to its quizzes.`)) return;
      const { studentCount } = await api.removeClassStudent(id, student.id);
      setData((previous) => ({
        ...previous,
        studentCount,
        students: previous.students.filter((s) => s.id !== student.id),
      }));
    });

  const saveDetails = (event) => {
    event.preventDefault();
    run("details", async () => {
      const { classroom } = await api.updateClass(id, details);
      setData((previous) => ({ ...previous, name: classroom.name, description: classroom.description }));
      setEditing(false);
    });
  };

  const deleteClass = () =>
    run("delete", async () => {
      const quizNote = data.quizCount
        ? ` Its ${data.quizCount} quiz(zes) will be kept but hidden from students until you move them to another class.`
        : "";
      if (!window.confirm(`Delete "${data.name}"?${quizNote}`)) return;
      await api.deleteClass(id);
      navigate("/teacher/classes");
    });

  if (!data) {
    return (
      <div className="student-layout">
        <Sidebar role="teacher" />
        <main className="student-main">
          <div className="class-page class-page-loading">
            {error ? <div className="panel-message error">{error}</div> : <div className="panel-message">Loading class…</div>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">CLASS</span>
            {editing ? (
              <form className="detail-edit" onSubmit={saveDetails}>
                <input
                  value={details.name}
                  onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Class name"
                  required
                />
                <input
                  value={details.description}
                  onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Description"
                />
                <div>
                  <button type="submit" className="primary-btn small" disabled={busy === "details"}>
                    Save
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1>
                  {data.icon} {data.name}
                </h1>
                <p>{data.description || "No description"}</p>
              </>
            )}
          </div>
          <div className="header-buttons">
            {!editing && (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setDetails({ name: data.name, description: data.description });
                  setEditing(true);
                }}
              >
                Edit details
              </button>
            )}
            <button type="button" className="danger-btn" onClick={deleteClass} disabled={busy === "delete"}>
              Delete class
            </button>
            <Link to="/teacher/classes" className="ghost-btn">
              ← Classes
            </Link>
          </div>
        </section>

        <div className="class-page">
          {error && <div className="panel-message error">{error}</div>}

          <div className="class-detail-grid">
            <div className="class-side">
              <section className="card-block code-card">
                <span className="welcome-label">CLASS CODE</span>
                <div className={`code-value ${data.joinEnabled ? "" : "off"}`}>{data.code}</div>
                <p>
                  {data.joinEnabled
                    ? "Students enter this code on their “My Classes” page to join."
                    : "Joining by code is off. Only students you add can access this class."}
                </p>
                <div className="code-actions">
                  <button type="button" className="ghost-btn" onClick={copyCode}>
                    {copied ? "Copied ✓" : "Copy code"}
                  </button>
                  <button type="button" className="ghost-btn" onClick={newCode} disabled={busy === "code"}>
                    New code
                  </button>
                </div>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={data.joinEnabled}
                    disabled={busy === "join"}
                    onChange={(e) => toggleJoin(e.target.checked)}
                  />
                  <span className="toggle-switch" aria-hidden="true" />
                  <span>
                    <strong>Allow joining with code</strong>
                    <small>Turn off once everyone has joined</small>
                  </span>
                </label>
              </section>

              <section className="card-block add-students">
                <h2 className="block-title">Add students</h2>
                <form onSubmit={addStudents}>
                  <textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder={"Student emails — one per line or comma separated\nstudent@quizingo.com"}
                  />
                  <div className="add-students-actions">
                    <small className="muted">Students must already have an account.</small>
                    <button type="submit" className="primary-btn small" disabled={busy === "add" || !emails.trim()}>
                      {busy === "add" ? "Adding…" : "Add"}
                    </button>
                  </div>
                </form>
                <AddResult result={addResult} />
              </section>
            </div>

            <div className="class-side">
              <section className="card-block">
                <div className="section-head">
                  <h2>Students</h2>
                  <span>{data.studentCount} enrolled</span>
                </div>
                {data.students.length > 5 && (
                  <input
                    className="roster-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search students…"
                  />
                )}
                {data.students.length === 0 ? (
                  <div className="empty-questions">
                    <p>No students yet. Share the code <strong>{data.code}</strong> or add them by email.</p>
                  </div>
                ) : (
                  <div className="roster">
                    {students.map((student) => (
                      <div className="roster-row" key={student.id}>
                        <div className="roster-avatar">{student.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{student.name}</strong>
                          <small>{student.email}</small>
                        </div>
                        <button
                          type="button"
                          className="link-btn danger"
                          onClick={() => removeStudent(student)}
                          disabled={busy === `remove-${student.id}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {students.length === 0 && <p className="muted">No students match “{search}”.</p>}
                  </div>
                )}
              </section>

              <section className="card-block">
                <div className="section-head">
                  <h2>Quizzes in this class</h2>
                  <Link to={`/teacher/create?class=${data.id}`} className="primary-btn small">
                    + New quiz
                  </Link>
                </div>
                {data.quizzes.length === 0 ? (
                  <div className="empty-questions">
                    <p>No quizzes yet. Create one and only this class's students will see it.</p>
                  </div>
                ) : (
                  <div className="roster">
                    {data.quizzes.map((quiz) => (
                      <Link to={`/teacher/edit/${quiz.id}`} className="class-quiz-row" key={quiz.id}>
                        <span className={`class-quiz-icon ${quiz.color}`}>{quiz.icon}</span>
                        <strong>{quiz.title}</strong>
                        <small>{quiz.questions} questions</small>
                        <span className={`status-pill ${quiz.isPublished ? "open" : "draft"}`}>
                          {quiz.isPublished ? "Visible" : "Draft"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClassDetail;
