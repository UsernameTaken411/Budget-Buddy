import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { formatAmount } from "../services/categories";
import { BellIcon, ExclamationCircleIcon, PlusIcon, TrashIcon } from "../components/icons.jsx";
import DatePicker from "../components/DatePicker.jsx";
import Select from "../components/Select.jsx";

const CYCLES = ["weekly", "monthly", "quarterly", "yearly"];
const CYCLE_OPTIONS = CYCLES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }));

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

export default function Subscriptions() {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  function requestReminders() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  if (subs === null && !error) {
    return <p className="text-sm text-neutral-400">Loading subscriptions…</p>;
  }

  const list = subs ?? [];
  const activeList = list.filter((s) => s.is_active);
  const monthlyTotal = activeList.reduce((sum, s) => sum + Number(s.monthly_cost), 0);
  const renewingSoon = activeList.filter((s) => {
    const d = daysUntil(s.next_billing_date);
    return d >= 0 && d <= 7;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Recurring costs
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Catch renewals early and keep only what earns its place.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
        >
          <PlusIcon className="h-4 w-4" />
          Add subscription
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-neutral-400">Active subscription cost</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {formatAmount(monthlyTotal)}
            <span className="text-base font-normal text-neutral-500"> / month</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            {formatAmount(monthlyTotal * 12)} projected per year
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between">
            <p className="text-sm text-neutral-400">Renewing soon</p>
            <BellIcon className="h-4 w-4 text-neutral-500" />
          </div>
          <p className="mt-1 text-3xl font-bold text-amber-400">{renewingSoon}</p>
          <button
            type="button"
            onClick={requestReminders}
            className="mt-1 text-xs font-medium text-neutral-500 hover:text-emerald-400"
          >
            Browser reminders are optional. Enable →
          </button>
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
            <label className="text-xs font-medium text-neutral-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Netflix"
              className="w-40 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="17.98"
              className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Billing cycle</label>
            <Select
              value={cycle}
              onChange={setCycle}
              options={CYCLE_OPTIONS}
              className="rounded-xl border border-white/10 bg-[#0b0f0f] px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-400">Next billing date</label>
            <DatePicker
              value={nextDate}
              onChange={setNextDate}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save subscription"}
          </button>
        </form>
      )}

      {list.length === 0 && !error && (
        <p className="text-sm text-neutral-500">No subscriptions tracked yet. Add one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {list.map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${
              s.is_active ? "" : "opacity-50"
            }`}
          >
            <div>
              <div className="font-medium text-neutral-100">{s.name}</div>
              <div className="text-xs text-neutral-500">
                {formatAmount(s.amount)} / {s.billing_cycle} · next {s.next_billing_date} ·{" "}
                {formatAmount(s.monthly_cost)}/mo
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePause(s)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/5"
              >
                {s.is_active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-neutral-500 hover:text-rose-400"
                aria-label="Remove subscription"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
