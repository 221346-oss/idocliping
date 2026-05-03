import { useAuth, roleHomePath } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Landing from "./Landing";

const Index = () => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={roleHomePath(role)} replace />;
  return <Landing />;
};

export default Index;
