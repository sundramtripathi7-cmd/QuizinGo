import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { api } from "../../api";
import "../student/StudentDashboard.css";
import "./Teacher.css";

const emptyQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  answer: "",
});

function CreateQuiz() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    duration: 30,
    icon: "📝",
    color: "",
  });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions((previous) =>
      previous.map((item, i) => {
        if (i !== qIndex) return item;
        const options = [...item.options];
        options[oIndex] = value;
        return { ...item, options };
      })
    );
  };

  const addQuestion = () => {
    setQuestions((previous) => [...previous, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    setQuestions((previous) =>
      previous.length === 1 ? previous : previous.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        duration: Number(form.duration) || 30,
        questions: questions.map((item) => ({
          question: item.question.trim(),
          options: item.options.map((opt) => opt.trim()).filter(Boolean),
          answer: item.answer.trim(),
        })),
      };

      await api.createQuiz(payload);
      navigate("/teacher");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-layout">
      <Sidebar role="teacher" />

      <main className="student-main">
        <section className="welcome-section">
          <div>
            <span className="welcome-label">CREATE QUIZ</span>
            <h1>Build a new assessment</h1>
            <p>Add details and questions, then publish for students.</p>
          </div>
          <Link to="/teacher" className="secondary-btn">
            ← Back
          </Link>
        </section>

        <form className="create-form" onSubmit={handleSubmit}>
          <div className="create-grid">
            <label>
              Title
              <input
                value={form.title}
                onChange={updateForm("title")}
                required
                placeholder="e.g. DBMS Fundamentals"
              />
            </label>

            <label>
              Category
              <input
                value={form.category}
                onChange={updateForm("category")}
                required
                placeholder="e.g. Database"
              />
            </label>

            <label>
              Duration (minutes)
              <input
                type="number"
                min="5"
                value={form.duration}
                onChange={updateForm("duration")}
                required
              />
            </label>

            <label>
              Icon
              <input
                value={form.icon}
                onChange={updateForm("icon")}
                placeholder="📝"
              />
            </label>
          </div>

          <label className="full-label">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={updateForm("description")}
              placeholder="Short description for students"
            />
          </label>

          <div className="questions-block">
            <div className="teacher-heading">
              <h2>Questions</h2>
              <button type="button" className="filter-btn" onClick={addQuestion}>
                + Add Question
              </button>
            </div>

            {questions.map((item, index) => (
              <div className="question-editor" key={index}>
                <div className="question-editor-top">
                  <strong>Question {index + 1}</strong>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeQuestion(index)}
                  >
                    Remove
                  </button>
                </div>

                <input
                  value={item.question}
                  onChange={(e) =>
                    updateQuestion(index, "question", e.target.value)
                  }
                  placeholder="Enter question text"
                  required
                />

                <div className="option-editor-grid">
                  {item.options.map((option, oIndex) => (
                    <input
                      key={oIndex}
                      value={option}
                      onChange={(e) =>
                        updateOption(index, oIndex, e.target.value)
                      }
                      placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                      required={oIndex < 2}
                    />
                  ))}
                </div>

                <label>
                  Correct answer (must match an option)
                  <input
                    value={item.answer}
                    onChange={(e) =>
                      updateQuestion(index, "answer", e.target.value)
                    }
                    required
                    placeholder="Paste the correct option text"
                  />
                </label>
              </div>
            ))}
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Publishing..." : "Publish Quiz"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default CreateQuiz;
