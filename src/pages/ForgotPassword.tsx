import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <TrendingUp className="h-7 w-7 text-brand" aria-hidden="true" />
        <span className="text-2xl font-extrabold tracking-tight">Meridian</span>
      </div>

      <div className="card p-5">
        <h1 className="mb-1 text-xl font-bold">Reset your password</h1>
        <p className="mb-5 text-sm text-ink-muted">
          Enter your email and we'll send a reset link if an account exists.
        </p>

        {sent ? (
          <div role="status" className="space-y-4">
            <p className="rounded-lg bg-up/10 px-4 py-3 text-sm text-up">
              If an account exists for <strong>{email}</strong>, you'll receive
              a reset link shortly.
            </p>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-brand hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-base px-3 py-2.5 outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Send reset link
            </button>
            <p className="text-center text-sm text-ink-muted">
              <Link to="/login" className="font-medium text-brand hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
