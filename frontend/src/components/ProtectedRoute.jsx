import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spin" />
        <p>Loading QuizInGo...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === "teacher" ? "/teacher" : "/student";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

export default ProtectedRoute;
