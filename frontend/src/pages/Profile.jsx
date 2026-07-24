import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { useAuth } from "../services/auth.jsx";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("SGD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/profile");
      setProfile(data);
      setDisplayName(data.display_name || "");
      setCurrency(data.currency || "SGD");
    } catch (err) {
      setError(err.detail || err.message || "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const data = await apiFetch("/profile", {
        method: "PATCH",
        body: { display_name: displayName.trim(), currency },
      });
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.detail || err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="max-w-md space-y-3" aria-busy="true">
        <div className="h-6 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
        Account
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Profile &amp; preferences
      </h1>
      <p className="mt-1 mb-6 text-sm text-neutral-400">
        Your settings are stored in Supabase and synced across signed-in devices.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}{" "}
          <button onClick={load} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div>
          <label
            htmlFor="displayName"
            className="mb-1.5 block text-sm text-neutral-300"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            maxLength={120}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
          />
        </div>

        <div>
          <label
            htmlFor="currency"
            className="mb-1.5 block text-sm text-neutral-300"
          >
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50"
          >
            {["SGD", "USD", "MYR", "EUR", "GBP", "AUD"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {saved && <span className="text-sm text-emerald-400">Saved</span>}
        </div>
      </form>

      <button
        onClick={handleSignOut}
        className="mt-4 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
      >
        Sign out
      </button>

      <p className="mt-4 text-xs text-neutral-600">
        Signed in as {user?.email}
        {profile && <> · Account created {new Date(profile.created_at).toLocaleDateString()}</>}
      </p>
    </div>
  );
}
