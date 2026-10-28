import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "../student/StudentExtra.css";
import "./Teacher.css";
import "../../components/Classes.css";

const COLORS = [
  { value: "", label: "Teal" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
];

const emptyForm = { name: "", description: "", icon: "🎓", color: "" };

function TeacherClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .getClasses()
      .then((data) => setClasses(data.classes || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const { classroom } = await api.createClass(form);
      navigate(`/teacher/classes/${classroom.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">MY CLASSES</span>
            <h1>Virtual classrooms</h1>
            <p>
              Quizzes are only visible to students enrolled in their class. Share the class code or
              add students by email.
            </p>
          </div>
        </section>

        <div className="class-page">
          <form className="card-block class-create" onSubmit={handleCreate}>
            <label>
              Class name
              <input value={form.name} onChange={setField("name")} placeholder="e.g. B.Tech CSE · Sem 5" required />
            </label>
            <label>
              Description
              <input value={form.description} onChange={setField("description")} placeholder="Optional" />
            </label>
            <label>
              Icon
              <input value={form.icon} onChange={setField("icon")} maxLength={8} />
            </label>
            <label>
              Colour
              <select value={form.color} onChange={setField("color")}>
                {COLORS.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="primary-btn small" disabled={creating || !form.name.trim()}>
              {creating ? "Creating…" : "+ Create class"}
            </button>
          </form>

          {error && <div className="panel-message error">{error}</div>}
          {loading && <div className="panel-message">Loading classes…</div>}

          {!loading && classes.length === 0 && (
            <div className="no-quizzes">
              <div>🎓</div>
              <h3>No classes yet</h3>
              <p>Create your first class above, then share its code with your students.</p>
            </div>
          )}

          <div className="class-grid">
            {classes.map((item) => (
              <Link to={`/teacher/classes/${item.id}`} className="class-card" key={item.id}>
                <div className={`class-banner ${item.color}`}>
                  <h3>{item.name}</h3>
                  <span>{item.teacher}</span>
                  <div className="class-banner-icon">{item.icon}</div>
                </div>
                <div className="class-body">
                  {item.description && <p>{item.description}</p>}
                  <div className="class-meta">
                    <span>
                      <strong>{item.studentCount}</strong> student{item.studentCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      <strong>{item.quizCount}</strong> quiz{item.quizCount === 1 ? "" : "zes"}
                    </span>
                  </div>
                </div>
                <div className="class-foot">
                  <span className={`class-code-chip ${item.joinEnabled ? "" : "off"}`} title={item.joinEnabled ? "Join code" : "Joining by code is off"}>
                    {item.code}
                  </span>
                  <span className="link-btn">Manage →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherClasses;
