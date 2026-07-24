import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatAmount } from "../services/categories";
import { ExclamationCircleIcon, PlusIcon, ShieldCheckIcon, TrashIcon } from "../components/icons.jsx";

export default function Savings() {
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [contribution, setContribution] = useState({});

  async function load() {
    try {
      setGoals(await apiFetch("/savings-goals"));
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !target || Number(target) <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/savings-goals", {
        method: "POST",
        body: {
          name: name.trim(),
          target_amount: Number(target),
          target_date: targetDate || null,
        },
      });
      setName("");
      setTarget("");
      setTargetDate("");
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleContribute(goalId) {
    const amount = Number(contribution[goalId]);
    if (!amount || amount <= 0) return;
    try {
      await apiFetch(`/savings-goals/${goalId}/contributions`, {
        method: "POST",
        body: { amount },
      });
      setContribution((c) => ({ ...c, [goalId]: "" }));
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/savings-goals/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  if (goals === null && !error) {
    return <p className="text-sm text-neutral-400">Loading savings goals…</p>;
  }

  const list = goals ?? [];
  const saved = list.reduce((s, g) => s + Number(g.current_amount), 0);
  const targets = list.reduce((s, g) => s + Number(g.target_amount), 0);
  const overall = targets > 0 ? Math.min(Math.round((saved / targets) * 100), 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Build momentum
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Savings goals
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Give every future plan a clear path forward.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
        >
          <PlusIcon className="h-4 w-4" />
          New goal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Saved so far</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatAmount(saved)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Combined targets</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatAmount(targets)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Overall progress</p>
          <p className="mt-1 text-2xl font-bold text-sky-400">{overall}%</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Goal name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
              className="w-48 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Target amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="5000.00"
              className="w-32 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
        </form>
      )}

      {list.length === 0 && !error && (
        <p className="text-sm text-neutral-500">No savings goals yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {list.map((g) => {
          const reached = g.progress_percent >= 100;
          return (
            <div
              key={g.id}
              className={`rounded-2xl border p-4 ${
                reached ? "border-emerald-400/30 bg-emerald-400/[0.04]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-neutral-100">
                  {g.name}
                  {reached && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      <ShieldCheckIcon className="h-3.5 w-3.5" />
                      Goal reached
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-neutral-500 hover:text-rose-400"
                  aria-label="Remove goal"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${reached ? "bg-sky-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  {formatAmount(g.current_amount)} of {formatAmount(g.target_amount)}
                  {g.target_date ? ` · by ${g.target_date}` : ""}
                </span>
                <span className={reached ? "font-semibold text-sky-400" : ""}>
                  {g.progress_percent}%
                </span>
              </div>
              {reached ? (
                <p className="mt-3 text-xs text-neutral-500">
                  This goal is fully funded — contributions are closed. Remove it or raise the
                  target to keep adding.
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Add contribution"
                    value={contribution[g.id] ?? ""}
                    onChange={(e) =>
                      setContribution((c) => ({ ...c, [g.id]: e.target.value }))
                    }
                    className="w-40 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-neutral-600"
                  />
                  <button
                    onClick={() => handleContribute(g.id)}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/5"
                  >
                    Contribute
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
