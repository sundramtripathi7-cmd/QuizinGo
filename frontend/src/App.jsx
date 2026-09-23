import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentDashboard from "./pages/student/StudentDashboard";
import AttemptQuiz from "./pages/student/AttemptQuiz";
import QuizResult from "./pages/student/QuizResult";
import StudentResults from "./pages/student/StudentResults";
import StudentProfile from "./pages/student/StudentProfile";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateQuiz from "./pages/teacher/CreateQuiz";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <Home />
              </>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/quizzes"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/results"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentResults />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/profile"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/attempt/:id"
            element={
              <ProtectedRoute roles={["student"]}>
                <AttemptQuiz />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/result/:id"
            element={
              <ProtectedRoute roles={["student"]}>
                <QuizResult />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/create"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <CreateQuiz />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
