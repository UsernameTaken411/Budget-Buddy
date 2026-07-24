import { Download, Plus, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, upload } from "../services/api";
import type { Transaction } from "../types";

type TransactionForm = { merchant: string; amount: string; transaction_date: string; category: string; transaction_type: "income" | "expense"; currency: string; notes: string };
const empty: TransactionForm = { merchant: "", amount: "", transaction_date: new Date().toISOString().slice(0, 10), category: "Other", transaction_type: "expense", currency: "SGD", notes: "" };

export function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const load = () => api<Transaction[]>("/transactions").then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/transactions", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    setForm(empty); setOpen(false); load();
  }
  async function remove(id: string) { await api(`/transactions/${id}`, { method: "DELETE" }); load(); }
  async function importCsv(selected?: File) {
    if (!selected) return;
    setImporting(true); setNotice(""); setError("");
    try {
      const data = new FormData(); data.append("file", selected);
      const result = await upload<{ imported: number; skipped: number }>("/transactions/import", data);
      setNotice(`${result.imported} bank transactions imported and categorized by Azure AI${result.skipped ? `; ${result.skipped} rows skipped` : ""}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The CSV could not be imported.");
    } finally { setImporting(false); if (file.current) file.current.value = ""; }
  }
  function exportCsv() {
    const rows = [["date", "merchant", "category", "type", "amount", "currency"], ...items.map(t => [t.transaction_date ?? "", t.merchant, t.category, t.transaction_type, String(t.amount), t.currency])];
    const blob = new Blob([rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = "budget-buddy-transactions.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Money log</p><h1 className="page-title">Transactions</h1><p className="page-copy">Review every expense and income entry in one place.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => file.current?.click()}><Upload size={16} /> Import CSV</button><button className="btn-secondary" onClick={exportCsv}><Download size={16} /> Export</button><button className="btn-primary" onClick={() => setOpen(!open)}><Plus size={16} /> Add</button><input ref={file} className="hidden" type="file" accept=".csv,text/csv" onChange={e => importCsv(e.target.files?.[0])} /></div></div>
    <section className="card flex flex-wrap items-center justify-between gap-5 border-emerald-300/15 bg-emerald-300/[0.035]"><div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><Upload size={20} /></span><div><h2 className="font-bold">Import bank transaction history</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Upload CSV exports from your bank. Date, description, debit/credit, withdrawal/deposit, amount and currency columns are detected automatically. Azure AI categorizes every valid row.</p></div></div><button className="btn-primary" disabled={importing} onClick={() => file.current?.click()}>{importing ? "Importing with Azure…" : "Choose bank CSV"}</button></section>
    {notice && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><span>{notice}</span><Link className="font-bold underline" to="/insights">Generate analysis report</Link></div>}
    {error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{error}</p>}
    {open && <form className="card grid gap-4 p-6 md:grid-cols-2" onSubmit={submit}>
      <label>Merchant<input className="field mt-2" required value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} /></label>
      <label>Amount<input className="field mt-2" required min="0.01" step="0.01" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <label>Category<input className="field mt-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
      <label>Date<input className="field mt-2" type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></label>
      <label>Type<select className="field mt-2" value={form.transaction_type} onChange={e => setForm({ ...form, transaction_type: e.target.value as "income" | "expense" })}><option value="expense">Expense</option><option value="income">Income</option></select></label>
      <div className="flex items-end"><button className="btn-primary w-full" type="submit">Save transaction</button></div>
    </form>}
    <div className="card overflow-hidden">{items.length ? items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/[0.05] px-5 py-4 last:border-0 md:grid-cols-[1.2fr_.7fr_.7fr_auto]"><div><p className="font-semibold">{item.merchant}</p><p className="text-xs text-slate-500">{item.transaction_date || "Date not supplied"}</p></div><p className="hidden text-sm text-slate-400 md:block">{item.category}</p><p className={`text-right font-bold ${item.transaction_type === "income" ? "text-emerald-300" : ""}`}>{item.transaction_type === "income" ? "+" : "-"}${Number(item.amount).toFixed(2)}</p><button className="text-slate-600 hover:text-rose-300" onClick={() => remove(item.id)} aria-label={`Delete ${item.merchant}`}><Trash2 size={17} /></button></div>) : <p className="p-8 text-center text-slate-500">No transactions yet.</p>}</div>
  </div>;
}
