import { Navigate } from "react-router-dom";
import { useAuth, roleHomePath, type AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function RoleRoute({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return null;
  if (!roles.includes(role)) return <Navigate to={roleHomePath(role)} replace />;
  return <>{children}</>;
}
