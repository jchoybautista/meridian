import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

/** Wraps protected routes; redirects unauthenticated users to /login. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div role="status" className="flex min-h-[50vh] items-center justify-center text-ink-muted">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
