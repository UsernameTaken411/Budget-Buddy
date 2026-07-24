import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, LoaderCircle, RotateCcw, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { api, upload } from "../services/api";
import { useResource } from "../hooks/useResource";
import type { Budget, ReceiptExtraction } from "../types";
import { money } from "../utils/format";
import { findBestBudgetMatch } from "../utils/budgetMatching";

const categories = ["Food", "Transport", "Shopping", "Groceries", "Entertainment", "Health", "Housing", "Utilities", "Travel", "Education", "Other"];

interface SavedReceipt extends ReceiptExtraction {
  id: string;
}

export function ReceiptScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<ReceiptExtraction | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "review" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const { data: savedReceipts, refresh: refreshSavedReceipts } = useResource<SavedReceipt>("/receipts");
  const { data: budgets, refresh: refreshBudgets } = useResource<Budget>("/budgets");
  const [budgetCategory, setBudgetCategory] = useState("");
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetLimit, setNewBudgetLimit] = useState("");
  const [matchedAutomatically, setMatchedAutomatically] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected); setResult(null); setStatus("idle"); setError("");
  }

  async function scan() {
    if (!file) return;
    setStatus("scanning"); setError("");
    const form = new FormData();
    form.append("image", file);
    form.append("budget_categories", JSON.stringify(budgets.map(budget => budget.category)));
    try {
      const extracted = await upload<ReceiptExtraction>("/receipts/scan", form);
      const aiRecommendation = budgets.find(
        budget => budget.category === extracted.recommended_budget_category,
      )?.category;
      const match = aiRecommendation
        ? { category: aiRecommendation, score: 100 }
        : findBestBudgetMatch(extracted, budgets);
      setBudgetCategory(match?.category ?? "");
      setMatchedAutomatically(Boolean(match));
      setResult(extracted); setStatus("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to scan this receipt.");
      setStatus("idle");
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    if (!budgetCategory) {
      setError("Choose a budget category for this expense.");
      return;
    }
    setStatus("saving"); setError("");
    try {
      let destinationCategory = budgetCategory;
      if (budgetCategory === "__new__") {
        const name = newBudgetName.trim();
        const limit = Number(newBudgetLimit);
        if (!name || !Number.isFinite(limit) || limit <= 0) {
          setError("Enter a category name and a monthly budget greater than zero.");
          setStatus("review");
          return;
        }
        await api("/budgets", {
          method: "POST",
          body: JSON.stringify({ category: name, amount: limit }),
        });
        destinationCategory = name;
        await refreshBudgets();
      }
      await api("/receipts/confirm", {
        method: "POST",
        body: JSON.stringify({
          ...result,
          category: destinationCategory,
          transaction_type: "expense",
        }),
      });
      await refreshSavedReceipts();
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this expense.");
      setStatus("review");
    }
  }

  function reset() {
    setFile(null); setPreview(""); setResult(null); setStatus("idle"); setError("");
    setBudgetCategory(""); setNewBudgetName(""); setNewBudgetLimit(""); setMatchedAutomatically(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeExpenseCategory(category: ReceiptExtraction["category"]) {
    if (!result) return;
    const updated = { ...result, category };
    const match = findBestBudgetMatch(updated, budgets);
    setResult(updated);
    setBudgetCategory(match?.category ?? "");
    setMatchedAutomatically(Boolean(match));
  }

  return (
    <>
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-400">AI receipt capture</p>
        <h1 className="display text-3xl font-extrabold sm:text-4xl">Snap it. Check it. Done.</h1>
        <p className="mt-2 max-w-2xl text-slate-500">Take a receipt photo and Budget Buddy will find the merchant, date, total and expense category. You stay in control before anything is saved.</p>
      </div>

      {status === "saved" ? (
        <section className="card mx-auto max-w-xl py-12 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><Check size={30} /></span>
          <h2 className="display mt-5 text-2xl font-extrabold">Expense added</h2>
          <p className="mt-2 text-slate-500">{result?.merchant} · {money(Number(result?.amount ?? 0))}</p>
          <button className="btn-primary mt-7" onClick={reset}><Camera size={18} />Scan another receipt</button>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="card">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-bold">Receipt image</h2><p className="mt-1 text-sm text-slate-500">JPEG, PNG or WebP · max 10 MB</p></div>
              <ScanLine className="text-emerald-300" />
            </div>
            <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={selectImage} />
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                <img className="max-h-[480px] w-full object-contain" src={preview} alt="Selected receipt" />
                {status === "scanning" && <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-emerald-300" size={34} /><p className="mt-3 font-bold">Reading your receipt…</p><p className="mt-1 text-xs text-slate-400">Finding total, date and category</p></div></div>}
              </div>
            ) : (
              <button className="grid min-h-72 w-full place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.03]" onClick={() => inputRef.current?.click()}>
                <span><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Camera size={26} /></span><b className="mt-4 block">Take a photo or choose an image</b><span className="mt-2 block text-sm text-slate-500">Keep the whole receipt visible and avoid shadows.</span></span>
              </button>
            )}
            {file && status !== "scanning" && <div className="mt-4 flex gap-3"><button className="btn-ghost flex-1 border border-white/10" onClick={() => inputRef.current?.click()}><FileImage size={17} />Replace</button><button className="btn-primary flex-1" onClick={() => void scan()}><Sparkles size={17} />Read receipt</button></div>}
            {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{error}</p>}
          </section>

          <section className="card">
            {result ? (
              <form onSubmit={confirm}>
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div><h2 className="text-xl font-bold">Check the details</h2><p className="mt-1 text-sm text-slate-500">Edit anything the AI got wrong before saving.</p></div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">{Math.round(result.confidence * 100)}% confidence</span>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-semibold">Shop or merchant<input className="field mt-1.5" value={result.merchant} onChange={e => setResult({ ...result, merchant: e.target.value })} required /></label>
                  <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Total amount<input className="field mt-1.5" type="number" min=".01" step=".01" value={result.amount} onChange={e => setResult({ ...result, amount: Number(e.target.value) })} required /></label><label className="block text-sm font-semibold">Currency<input className="field mt-1.5 uppercase" maxLength={3} value={result.currency} onChange={e => setResult({ ...result, currency: e.target.value.toUpperCase() })} required /></label></div>
                  <label className="block text-sm font-semibold">Purchase date <span className="font-normal text-slate-600">(optional if not visible)</span><input className="field mt-1.5" type="date" value={result.transaction_date ?? ""} onChange={e => setResult({ ...result, transaction_date: e.target.value || null })} /></label>
                  <label className="block text-sm font-semibold">AI expense type<select className="field mt-1.5" value={result.category} onChange={e => changeExpenseCategory(e.target.value as ReceiptExtraction["category"])}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
                  <label className="block text-sm font-semibold">Add this cost to
                    <select
                      className="field mt-1.5"
                      value={budgetCategory}
                      onChange={e => {
                        setBudgetCategory(e.target.value);
                        setMatchedAutomatically(false);
                        setError("");
                      }}
                      required
                    >
                      <option value="">Choose a budget category…</option>
                      {budgets.map(budget => <option key={budget.id} value={budget.category}>{budget.category}</option>)}
                      <option value="__new__">＋ Create a new budget category</option>
                    </select>
                    {matchedAutomatically && budgetCategory && <span className="mt-1.5 block text-xs font-normal text-emerald-300">Automatically matched to “{budgetCategory}”. You can change it before saving.</span>}
                    {!matchedAutomatically && !budgetCategory && <span className="mt-1.5 block text-xs font-normal text-amber-300">No similar budget was found. Choose one or create a new category.</span>}
                  </label>
                  {budgetCategory === "__new__" && (
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-4">
                      <label className="block text-sm font-semibold">New category<input className="field mt-1.5" value={newBudgetName} onChange={e => setNewBudgetName(e.target.value)} placeholder="e.g. Rent" maxLength={80} required /></label>
                      <label className="block text-sm font-semibold">Monthly limit<input className="field mt-1.5" type="number" min=".01" step=".01" value={newBudgetLimit} onChange={e => setNewBudgetLimit(e.target.value)} placeholder="500.00" required /></label>
                    </div>
                  )}
                  <label className="block text-sm font-semibold">Note <span className="font-normal text-slate-600">(optional)</span><textarea className="field mt-1.5 min-h-20 resize-none" value={result.notes} onChange={e => setResult({ ...result, notes: e.target.value })} /></label>
                </div>
                <div className="mt-6 flex gap-3"><button type="button" className="btn-ghost" onClick={reset}><RotateCcw size={17} />Start over</button><button className="btn-primary flex-1" disabled={status === "saving"}>{status === "saving" ? <><LoaderCircle className="animate-spin" size={17} />Saving…</> : <><Check size={17} />Yes, add expense</>}</button></div>
              </form>
            ) : (
              <div className="grid min-h-[420px] place-items-center text-center">
                <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-slate-500"><ShieldCheck size={26} /></span><h2 className="mt-5 font-bold">Nothing is saved automatically</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">After Azure scans the receipt, review the details before saving them to your synced Supabase account.</p></div>
              </div>
            )}
          </section>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Recent receipt expenses</h2>
          <p className="mt-1 text-sm text-slate-500">Confirmed receipts stay here and are included in your budget spending.</p>
        </div>
        {savedReceipts.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {savedReceipts.map(receipt => (
              <article className="card" key={receipt.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{receipt.merchant}</h3>
                    <p className="mt-1 text-sm text-slate-500">{receipt.category} · {receipt.transaction_date ? new Date(`${receipt.transaction_date}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "Date not provided"}</p>
                  </div>
                  <p className="font-bold text-emerald-300">{money(Number(receipt.amount))}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center text-sm text-slate-500">No confirmed receipts yet.</div>
        )}
      </section>
    </>
  );
}
