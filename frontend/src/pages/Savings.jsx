import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatAmount } from "../services/categories";

export default function Savings() {
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
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
    return <p className="text-sm text-slate-500">Loading savings goals…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Savings goals</h1>
        <p className="text-sm text-slate-500">Track progress toward what you're saving for.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Goal name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emergency fund"
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Target amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="5000.00"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Target date (optional)</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add goal
        </button>
      </form>

      {goals && goals.length === 0 && (
        <p className="text-sm text-slate-500">No savings goals yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {goals?.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{g.name}</span>
              <button
                onClick={() => handleDelete(g.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(g.progress_percent, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {formatAmount(g.current_amount)} of {formatAmount(g.target_amount)}
                {g.target_date ? ` · by ${g.target_date}` : ""}
              </span>
              <span>{g.progress_percent}%</span>
            </div>
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
                className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => handleContribute(g.id)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Contribute
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
