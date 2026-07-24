import { useEffect, useState } from "react";
import { apiFetch } from "../services/api.js";
import { useAuth } from "../services/auth.jsx";

export default function Profile() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <div className="max-w-md space-y-3" aria-busy="true">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-slate-900">
        Profile
      </h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}{" "}
          <button onClick={load} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Email
          </label>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {user?.email}
          </p>
        </div>

        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            maxLength={120}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label
            htmlFor="currency"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
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
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved</span>}
        </div>
      </form>

      {profile && (
        <p className="mt-3 text-xs text-slate-400">
          Account created {new Date(profile.created_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
