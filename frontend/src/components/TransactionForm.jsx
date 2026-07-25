import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "../services/categories.js";
import DatePicker from "./DatePicker.jsx";
import Select from "./Select.jsx";

// The UI takes a POSITIVE magnitude plus an expense/income toggle, and converts
// to the signed value the API expects (SCHEMA.md §1). Users think in
// "I spent $12.50", not "-12.50" — but the database must store the sign.

const today = () => new Date().toISOString().slice(0, 10);

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-400/50";

export default function TransactionForm({ initial, onSubmit, onCancel, busy }) {
  const editing = Boolean(initial);

  const [direction, setDirection] = useState("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initial) return;
    setDirection(initial.amount >= 0 ? "income" : "expense");
    setAmount(String(Math.abs(initial.amount)));
    setDate(initial.date);
    setCategory(initial.category);
    setDescription(initial.description || "");
  }, [initial]);

  function handleDirection(next) {
    setDirection(next);
    // Nudge the category so income rows don't stay tagged "food".
    if (next === "income" && category !== "income") setCategory("income");
    if (next === "expense" && category === "income") setCategory("food");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const magnitude = Number.parseFloat(amount);
    if (!Number.isFinite(magnitude) || magnitude <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const signed = direction === "expense" ? -magnitude : magnitude;

    try {
      await onSubmit({
        amount: Math.round(signed * 100) / 100,
        date,
        category,
        description: description.trim(),
      });
      if (!editing) {
        setAmount("");
        setDescription("");
      }
    } catch (err) {
      setError(err.detail || err.message || "Could not save.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => handleDirection("expense")}
          className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            direction === "expense"
              ? "bg-rose-500 text-white"
              : "bg-white/5 text-neutral-400 hover:bg-white/10"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => handleDirection("income")}
          className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
            direction === "income"
              ? "bg-emerald-400 text-neutral-950"
              : "bg-white/5 text-neutral-400 hover:bg-white/10"
          }`}
        >
          Income
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Amount (SGD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Date
          </label>
          <DatePicker value={date} onChange={setDate} className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Category
          </label>
          <Select
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS}
            className={`${inputClass} bg-[#0b0f0f]`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Description
          </label>
          <input
            type="text"
            maxLength={500}
            placeholder="Kopitiam lunch"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
