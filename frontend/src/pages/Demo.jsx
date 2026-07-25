// /demo — the QR-code / "scan to try our app" landing page. Signs straight
// into the shared demo account with zero clicks and zero typing, then drops
// the visitor onto the dashboard. Reuses the exact same signIn() path as a
// normal login — nothing about auth/RLS is bypassed, this just automates the
// button click on Login.jsx so a QR scan alone is enough.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../services/auth.jsx";
import { BankIcon } from "../components/icons.jsx";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";

export default function Demo() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading || session) return;
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      setError("Demo mode isn't configured yet.");
      return;
    }
    signIn(DEMO_EMAIL, DEMO_PASSWORD)
      .then(() => navigate("/transactions", { replace: true }))
      .catch((err) => setError(err.message || "Could not start the demo."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

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
              <p className="text-sm font-medium text-neutral-200">Starting your demo…</p>
              <p className="mt-1 text-xs text-neutral-500">One moment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
