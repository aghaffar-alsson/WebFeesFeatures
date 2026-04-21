import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}