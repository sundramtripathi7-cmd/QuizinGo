const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("quizingo_token");

  const headers = {
    "Content-Type": "application/json",
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
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}

export const api = {
  register: (body) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  getQuizzes: () => request("/quizzes"),
  getQuiz: (id) => request(`/quizzes/${id}`),
  getMyQuizzes: () => request("/quizzes/mine"),
  createQuiz: (body) =>
    request("/quizzes", { method: "POST", body: JSON.stringify(body) }),
  deleteQuiz: (id) => request(`/quizzes/${id}`, { method: "DELETE" }),
  getStudentStats: () => request("/quizzes/stats/student"),
  submitAttempt: (id, answers) =>
    request(`/attempts/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  getMyAttempts: () => request("/attempts/mine"),
  getAttempt: (id) => request(`/attempts/${id}`),
};
