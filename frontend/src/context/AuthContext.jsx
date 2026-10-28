import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("quizingo_token"))
  );

  useEffect(() => {
    if (!localStorage.getItem("quizingo_token")) return;

    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("quizingo_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = (data) => {
    localStorage.setItem("quizingo_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => applySession(await api.login({ email, password }));

  const requestOtp = (payload) => api.requestOtp(payload);

  const verifyOtp = async (payload) => applySession(await api.verifyOtp(payload));

  const register = async (payload) => applySession(await api.register(payload));

  const logout = () => {
    localStorage.removeItem("quizingo_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, requestOtp, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
