import { Download, Plus, Trash2, Upload } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, upload } from "../services/api";
import type { Transaction } from "../types";

type TransactionForm = { merchant: string; amount: string; transaction_date: string; category: string; transaction_type: "income" | "expense"; currency: string; notes: string };
const empty: TransactionForm = { merchant: "", amount: "", transaction_date: new Date().toISOString().slice(0, 10), category: "Other", transaction_type: "expense", currency: "SGD", notes: "" };

export function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
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
    const data = new FormData(); data.append("file", selected);
    await upload("/transactions/import", data); load();
  }
  function exportCsv() {
    const rows = [["date", "merchant", "category", "type", "amount", "currency"], ...items.map(t => [t.transaction_date ?? "", t.merchant, t.category, t.transaction_type, String(t.amount), t.currency])];
    const blob = new Blob([rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = "budget-buddy-transactions.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Money log</p><h1 className="page-title">Transactions</h1><p className="page-copy">Review every expense and income entry in one place.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => file.current?.click()}><Upload size={16} /> Import CSV</button><button className="btn-secondary" onClick={exportCsv}><Download size={16} /> Export</button><button className="btn-primary" onClick={() => setOpen(!open)}><Plus size={16} /> Add</button><input ref={file} className="hidden" type="file" accept=".csv,text/csv" onChange={e => importCsv(e.target.files?.[0])} /></div></div>
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
