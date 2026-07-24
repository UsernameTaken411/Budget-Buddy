import { useRef, useState } from "react";
import { apiFetch, ApiError } from "../services/api";
import { CATEGORIES, CATEGORY_LABELS, formatAmount } from "../services/categories";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RECEIPT_CATEGORIES = CATEGORIES.filter((c) => c !== "income" && c !== "transfer");

export default function ReceiptScan() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | scanning | review | saving | saved
  const [error, setError] = useState("");

  function selectImage(e) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setStatus("idle");
    setError("");
    setPreview(selected ? URL.createObjectURL(selected) : "");
  }

  async function scan() {
    if (!file) return;
    setStatus("scanning");
    setError("");
    const form = new FormData();
    form.append("image", file);
    try {
      const extracted = await apiFetch("/receipts/scan", { method: "POST", body: form });
      setResult(extracted);
      setStatus("review");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Unable to scan this receipt.");
      setStatus("idle");
    }
  }

  async function confirm(e) {
    e.preventDefault();
    if (!result) return;
    setStatus("saving");
    setError("");
    try {
      await apiFetch("/receipts/confirm", {
        method: "POST",
        body: {
          amount: -Math.abs(Number(result.amount)),
          date: result.date || new Date().toISOString().slice(0, 10),
          category: result.category,
          description: result.notes ? `${result.merchant} — ${result.notes}` : result.merchant,
        },
      });
      setStatus("saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Unable to save this expense.");
      setStatus("review");
    }
  }

  function reset() {
    setFile(null);
    setPreview("");
    setResult(null);
    setStatus("idle");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Scan a receipt</h1>
        <p className="text-sm text-slate-500">
          Azure AI reads the merchant, total, date, and category. Nothing saves until you confirm.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {status === "saved" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-emerald-700">Expense added</p>
          <p className="mt-1 text-sm text-slate-500">
            {result.merchant} · {formatAmount(-Math.abs(Number(result.amount)))}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Scan another
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={selectImage}
              className="text-sm"
            />
            {preview && (
              <img
                src={preview}
                alt="Selected receipt"
                className="mt-3 max-h-72 w-full rounded-lg border border-slate-200 object-contain"
              />
            )}
            {file && status !== "scanning" && (
              <button
                onClick={scan}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Read receipt
              </button>
            )}
            {status === "scanning" && (
              <p className="mt-3 text-sm text-slate-500">Reading your receipt…</p>
            )}
          </div>

          {result && (
            <form
              onSubmit={confirm}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-900">Check the details</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {Math.round(result.confidence * 100)}% confidence
                </span>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-600">Merchant</span>
                <input
                  value={result.merchant}
                  onChange={(e) => setResult({ ...result, merchant: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-600">Amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={result.amount}
                    onChange={(e) => setResult({ ...result, amount: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-600">Date</span>
                  <input
                    type="date"
                    value={result.date ?? ""}
                    onChange={(e) => setResult({ ...result, date: e.target.value || null })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-600">Category</span>
                <select
                  value={result.category}
                  onChange={(e) => setResult({ ...result, category: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                >
                  {RECEIPT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-600">Note (optional)</span>
                <textarea
                  value={result.notes}
                  onChange={(e) => setResult({ ...result, notes: e.target.value })}
                  className="min-h-16 resize-none rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Start over
                </button>
                <button
                  type="submit"
                  disabled={status === "saving"}
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {status === "saving" ? "Saving…" : "Add expense"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
