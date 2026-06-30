import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface Props {
  mode: "login" | "register";
}

/** Shared email/password form for both login and registration. */
export function AuthForm({ mode }: Props) {
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const fn = isLogin ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (isLogin) {
      navigate(from, { replace: true });
    } else {
      setNotice("Account created. Check your email to confirm, then sign in.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <TrendingUp className="h-7 w-7 text-brand" aria-hidden="true" />
        <span className="text-2xl font-extrabold tracking-tight">Meridian</span>
      </div>

      <div className="card p-5">
        <h1 className="mb-1 text-xl font-bold">{isLogin ? "Sign in" : "Create account"}</h1>
        <p className="mb-5 text-sm text-ink-muted">
          {isLogin
            ? "Access your watchlist and portfolio."
            : "Save a watchlist and simulate a portfolio."}
        </p>

        {!configured && (
          <p className="mb-4 rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-ink-muted">
            Supabase isn’t configured yet. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> to enable accounts.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-base px-3 py-2.5 outline-none focus:border-brand"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-down">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-up">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          {isLogin ? (
            <>
              No account?{" "}
              <Link to="/register" className="font-medium text-brand hover:underline">
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-brand hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
