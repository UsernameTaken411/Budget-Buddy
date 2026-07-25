// /demo — the QR-code / "scan to try our app" landing page. Every scan
// creates a brand-new, throwaway guest account and signs straight into it —
// no shared account, no data collisions between simultaneous visitors, no
// clicks, no typing. Reuses the same signUp() path as the real Signup page,
// nothing about auth/RLS is bypassed.
//
// Requires "Confirm email" to be OFF in Supabase: a made-up guest address
// can never receive or click a real confirmation link, so with Confirm
// email on, every scan would get stuck waiting on an email that never comes.
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../services/auth.jsx";
import { BankIcon } from "../components/icons.jsx";

function randomGuest() {
  const id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(
    /[^a-z0-9]/gi,
    ""
  );
  return {
    email: `guest-${id}@budgetbuddy.demo`,
    password: `Guest-${id}-${Date.now()}`,
  };
}

export default function Demo() {
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (loading || session || started.current) return;
    started.current = true;

    const { email, password } = randomGuest();
    signUp(email, password, "Guest")
      .then((result) => {
        if (!result.session) {
          setError(
            "Guest mode needs email confirmation turned off in Supabase for this project."
          );
          return;
        }
        navigate("/transactions", { replace: true });
      })
      .catch((err) => setError(err.message || "Could not start the demo."));
  }, [loading, session, signUp, navigate]);

  if (!loading && session) return <Navigate to="/transactions" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06090a] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-emerald-400">
            <BankIcon className="h-5 w-5" />
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {error ? (
            <>
              <p className="mb-2 text-sm font-medium text-rose-400">{error}</p>
              <button
                onClick={() => navigate("/login")}
                className="mt-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
              >
                Go to sign in
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-neutral-200">Setting up your guest account…</p>
              <p className="mt-1 text-xs text-neutral-500">One moment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
