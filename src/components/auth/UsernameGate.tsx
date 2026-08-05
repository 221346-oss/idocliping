import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const EXEMPT = ["/onboarding/username", "/auth"];

/**
 * Forces a signed-in creator without a username to pick one before using the app.
 */
export function UsernameGate() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.profile_slug) return;
    if (EXEMPT.some((p) => location.pathname.startsWith(p))) return;
    navigate("/onboarding/username", { replace: true });
  }, [loading, user, profile, location.pathname, navigate]);

  return null;
}
