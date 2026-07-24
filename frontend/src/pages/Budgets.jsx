import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { CATEGORIES, CATEGORY_LABELS, formatAmount } from "../services/categories";

const BUDGET_CATEGORIES = CATEGORIES.filter((c) => c !== "income" && c !== "transfer");

export default function Budgets() {
  const [budgets, setBudgets] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setBudgets(await apiFetch("/budgets"));
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/budgets", {
        method: "POST",
        body: { category, amount: Number(amount) },
      });
      setAmount("");
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/budgets/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  if (budgets === null && !error) {
    return <p className="text-sm text-slate-500">Loading budgets…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Budgets</h1>
        <p className="text-sm text-slate-500">Monthly spending caps by category.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Monthly limit</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="400.00"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add budget
        </button>
      </form>

      {budgets && budgets.length === 0 && (
        <p className="text-sm text-slate-500">No budgets yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {budgets?.map((b) => {
          const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
          const over = b.spent > b.amount;
          return (
            <div
              key={b.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {CATEGORY_LABELS[b.category] ?? b.category}
                </span>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : "bg-slate-900"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>
                  {formatAmount(b.spent)} spent of {formatAmount(b.amount)}
                </span>
                <span className={over ? "font-medium text-red-600" : ""}>
                  {over
                    ? `${formatAmount(b.spent - b.amount)} over`
                    : `${formatAmount(b.remaining)} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
