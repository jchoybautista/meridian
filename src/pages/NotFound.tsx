import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-muted">That page doesn’t exist or has moved.</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
