import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { CATEGORIES, CATEGORY_LABELS, formatAmount } from "../services/categories";
import { ExclamationCircleIcon, PlusIcon, TrashIcon } from "../components/icons.jsx";
import Select from "../components/Select.jsx";

const BUDGET_CATEGORIES = CATEGORIES.filter((c) => c !== "income" && c !== "transfer");
const BUDGET_CATEGORY_OPTIONS = BUDGET_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

export default function Budgets() {
  const [budgets, setBudgets] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
    return <p className="text-sm text-neutral-400">Loading budgets…</p>;
  }

  const list = budgets ?? [];
  const totalBudget = list.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = list.reduce((s, b) => s + Number(b.spent), 0);
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Monthly plan
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Set flexible limits and see where your money is going.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
        >
          <PlusIcon className="h-4 w-4" />
          Add budget
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Total budget</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatAmount(totalBudget)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Spent this month</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{formatAmount(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Still available</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatAmount(totalRemaining)}</p>
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
            <label className="text-xs font-medium text-neutral-400">Category</label>
            <Select
              value={category}
              onChange={setCategory}
              options={BUDGET_CATEGORY_OPTIONS}
              className="rounded-xl border border-white/10 bg-[#0b0f0f] px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Monthly limit</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="400.00"
              className="w-32 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save budget"}
          </button>
        </form>
      )}

      {list.length === 0 && !error && (
        <p className="text-sm text-neutral-500">No budgets yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {list.map((b) => {
          const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
          const over = b.spent > b.amount;
          return (
            <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-100">
                  {CATEGORY_LABELS[b.category] ?? b.category}
                </span>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-neutral-500 hover:text-rose-400"
                  aria-label="Remove budget"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${over ? "bg-rose-400" : "bg-emerald-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-neutral-500">
                <span>
                  {formatAmount(b.spent)} spent of {formatAmount(b.amount)}
                </span>
                <span className={over ? "font-medium text-rose-400" : ""}>
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
