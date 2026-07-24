import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatAmount } from "../services/categories";

const CYCLES = ["weekly", "monthly", "quarterly", "yearly"];

export default function Subscriptions() {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setSubs(await apiFetch("/subscriptions"));
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !amount || Number(amount) <= 0 || !nextDate) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/subscriptions", {
        method: "POST",
        body: {
          name: name.trim(),
          amount: Number(amount),
          billing_cycle: cycle,
          next_billing_date: nextDate,
        },
      });
      setName("");
      setAmount("");
      setNextDate("");
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(sub) {
    try {
      await apiFetch(`/subscriptions/${sub.id}`, {
        method: "PATCH",
        body: { is_active: !sub.is_active },
      });
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/subscriptions/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.detail || err.message);
    }
  }

  if (subs === null && !error) {
    return <p className="text-sm text-slate-500">Loading subscriptions…</p>;
  }

  const monthlyTotal = (subs ?? [])
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.monthly_cost), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Subscriptions</h1>
        <p className="text-sm text-slate-500">
          Recurring charges, normalized to a monthly cost.{" "}
          {subs && subs.length > 0 && (
            <span className="font-medium text-slate-700">
              {formatAmount(monthlyTotal)}/mo active
            </span>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Netflix"
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="17.98"
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Billing cycle</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Next billing date</label>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add subscription
        </button>
      </form>

      {subs && subs.length === 0 && (
        <p className="text-sm text-slate-500">No subscriptions tracked yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {subs?.map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 ${
              s.is_active ? "" : "opacity-50"
            }`}
          >
            <div>
              <div className="font-medium text-slate-900">{s.name}</div>
              <div className="text-xs text-slate-500">
                {formatAmount(s.amount)} / {s.billing_cycle} · next {s.next_billing_date} ·{" "}
                {formatAmount(s.monthly_cost)}/mo
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePause(s)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {s.is_active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
