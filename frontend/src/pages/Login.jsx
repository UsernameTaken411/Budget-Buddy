import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../services/auth.jsx";
import { BankIcon } from "../components/icons.jsx";

// Lets judges/testers open the app with one click during a demo instead of
// typing credentials. Only appears if a demo account has actually been
// configured (see frontend/.env.example) — silently hidden otherwise, so
// this never ships a broken button.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";

export default function Login() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Already signed in? Bounce straight through — don't show a login form
  // to someone who has a valid session.
  if (!loading && session) {
    const dest = location.state?.from?.pathname || "/transactions";
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from?.pathname || "/transactions", {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      navigate(location.state?.from?.pathname || "/transactions", {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Could not start the demo.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06090a] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-emerald-400">
            <BankIcon className="h-5 w-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">
            Sign in
          </h1>
          <p className="mb-6 text-sm text-neutral-400">
            Welcome back. Enter your details to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {DEMO_EMAIL && DEMO_PASSWORD && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-neutral-600">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <button
                type="button"
                onClick={handleDemo}
                disabled={demoLoading}
                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-white/5 disabled:opacity-50"
              >
                {demoLoading ? "Starting demo…" : "Try the demo — no account needed"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          No account?{" "}
          <Link to="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
