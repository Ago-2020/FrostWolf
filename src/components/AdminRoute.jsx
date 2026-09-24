import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoadingSkeleton } from "./Skeletons";

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <PageLoadingSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}

export default AdminRoute;
