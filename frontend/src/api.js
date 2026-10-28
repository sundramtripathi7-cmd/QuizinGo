const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("quizingo_token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Something went wrong");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  register: (body) => request("/auth/register", json("POST", body)),
  login: (body) => request("/auth/login", json("POST", body)),
  requestOtp: (body) => request("/auth/otp/request", json("POST", body)),
  verifyOtp: (body) => request("/auth/otp/verify", json("POST", body)),
  me: () => request("/auth/me"),

  getQuizzes: () => request("/quizzes"),
  getMyQuizzes: () => request("/quizzes/mine"),
  getQuizForEdit: (id) => request(`/quizzes/${id}`),
  getQuizAttempts: (id) => request(`/quizzes/${id}/attempts`),
  createQuiz: (body) => request("/quizzes", json("POST", body)),
  updateQuiz: (id, body) => request(`/quizzes/${id}`, json("PUT", body)),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: "DELETE" }),
  getStudentStats: () => request("/quizzes/stats/student"),

  getClasses: () => request("/classes"),
  getClass: (id) => request(`/classes/${id}`),
  createClass: (body) => request("/classes", json("POST", body)),
  updateClass: (id, body) => request(`/classes/${id}`, json("PUT", body)),
  deleteClass: (id) => request(`/classes/${id}`, { method: "DELETE" }),
  regenerateClassCode: (id) => request(`/classes/${id}/code`, { method: "POST" }),
  addClassStudents: (id, emails) => request(`/classes/${id}/students`, json("POST", { emails })),
  removeClassStudent: (id, studentId) =>
    request(`/classes/${id}/students/${studentId}`, { method: "DELETE" }),
  joinClass: (code) => request("/classes/join", json("POST", { code })),
  leaveClass: (id) => request(`/classes/${id}/leave`, { method: "POST" }),

  importFile: (file, format = "auto") => {
    const form = new FormData();
    form.append("file", file);
    form.append("format", format);
    return request("/import", { method: "POST", body: form });
  },
  importText: (text, format = "auto") =>
    request("/import", json("POST", { text, format })),

  getBank: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value)
    ).toString();
    return request(`/questions${query ? `?${query}` : ""}`);
  },
  addToBank: (questions, category) =>
    request("/questions", json("POST", { questions, category })),
  deleteBankQuestions: (ids) => request("/questions/delete", json("POST", { ids })),

  startAttempt: (quizId) => request(`/attempts/start/${quizId}`, { method: "POST" }),
  saveAnswers: (attemptId, answers) =>
    request(`/attempts/${attemptId}/answers`, json("PUT", { answers })),
  submitAttempt: (attemptId, answers) =>
    request(`/attempts/${attemptId}/submit`, json("POST", { answers })),
  getMyAttempts: () => request("/attempts/mine"),
  getAttempt: (id) => request(`/attempts/${id}`),
};
