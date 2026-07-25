import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../services/auth.jsx";
import { BankIcon } from "../components/icons.jsx";
import { randomGuest } from "../services/guestAccount.js";

export default function Signup() {
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (!loading && session) return <Navigate to="/transactions" replace />;

  async function handleGuest() {
    setError(null);
    setDemoLoading(true);
    try {
      const { email: guestEmail, password: guestPassword } = randomGuest();
      const result = await signUp(guestEmail, guestPassword, "Guest");
      if (!result.session) {
        setError("Guest mode isn't available right now. Please sign up with an email instead.");
        return;
      }
      navigate("/transactions", { replace: true });
    } catch (err) {
      setError(err.message || "Could not start as a guest.");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await signUp(email.trim(), password, displayName.trim());
      // If "Confirm email" is ON in Supabase, signUp returns a user but no
      // session — the user must click the emailed link before they can log in.
      if (data?.session) {
        navigate("/transactions", { replace: true });
      } else {
        setNeedsConfirm(true);
      }
    } catch (err) {
      setError(err.message || "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (needsConfirm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06090a] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-emerald-400">
              <BankIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
              Check your email
            </h1>
            <p className="mb-6 text-sm text-neutral-400">
              We sent a confirmation link to{" "}
              <span className="font-medium text-neutral-200">{email}</span>. Click it,
              then sign in.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
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
            Create account
          </h1>
          <p className="mb-5 text-sm text-neutral-400">
            Or skip this — jump straight in, no email, no signup.
          </p>

          <button
            type="button"
            onClick={handleGuest}
            disabled={demoLoading}
            className="w-full rounded-xl bg-emerald-400 px-4 py-3.5 text-base font-bold text-neutral-950 shadow-[0_0_0_3px_rgba(52,211,153,0.15)] transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {demoLoading ? "Setting up your guest account…" : "Continue as a guest →"}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-neutral-600">
            <span className="h-px flex-1 bg-white/10" />
            or create an account
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
              />
              <p className="mt-1 text-xs text-neutral-500">At least 6 characters.</p>
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
              className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/5 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
