import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "../services/categories.js";

// The UI takes a POSITIVE magnitude plus an expense/income toggle, and converts
// to the signed value the API expects (SCHEMA.md §1). Users think in
// "I spent $12.50", not "-12.50" — but the database must store the sign.

const today = () => new Date().toISOString().slice(0, 10);

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
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => handleDirection("expense")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            direction === "expense"
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => handleDirection("income")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            direction === "income"
              ? "bg-green-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Income
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Description
          </label>
          <input
            type="text"
            maxLength={500}
            placeholder="Kopitiam lunch"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
