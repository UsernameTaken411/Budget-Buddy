import { ArrowDownRight, ArrowUpRight, Camera, PiggyBank, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import type { Budget, Transaction } from "../types";

export function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  useEffect(() => { Promise.all([api<Transaction[]>("/transactions"), api<Budget[]>("/budgets")]).then(([t, b]) => { setTransactions(t); setBudgets(b); }); }, []);
  const totals = useMemo(() => transactions.reduce((sum, t) => {
    sum[t.transaction_type] += Number(t.amount);
    return sum;
  }, { income: 0, expense: 0 }), [transactions]);
  const categories = useMemo(() => Object.entries(transactions.filter(t => t.transaction_type === "expense").reduce<Record<string, number>>((all, t) => {
    all[t.category || "Other"] = (all[t.category || "Other"] ?? 0) + Number(t.amount);
    return all;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5), [transactions]);
  const largest = Math.max(...categories.map(([, value]) => value), 1);

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Overview</p><h1 className="page-title">Your money at a glance</h1><p className="page-copy">A clear view of what came in, went out, and needs attention.</p></div>
      <Link className="btn-primary" to="/receipts"><Camera size={17} /> Scan a receipt</Link>
    </div>
    <section className="grid gap-4 md:grid-cols-3">
      <Metric label="Available balance" value={totals.income - totals.expense} icon={WalletCards} />
      <Metric label="Income" value={totals.income} icon={ArrowUpRight} positive />
      <Metric label="Expenses" value={totals.expense} icon={ArrowDownRight} />
    </section>
    <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="card p-6"><h2 className="section-title">Spending by category</h2><div className="mt-6 space-y-5">
        {categories.length ? categories.map(([name, value]) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{name}</span><span className="text-slate-400">${value.toFixed(2)}</span></div><div className="h-2 rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${value / largest * 100}%` }} /></div></div>) : <p className="text-sm text-slate-500">Add a transaction or scan a receipt to see your pattern.</p>}
      </div></div>
      <div className="card p-6"><div className="flex items-center gap-3"><PiggyBank className="text-emerald-300" /><h2 className="section-title">Budget health</h2></div><div className="mt-5 space-y-4">
        {budgets.slice(0, 4).map(b => <div key={b.id}><div className="flex justify-between text-sm"><span>{b.category}</span><span className="text-slate-500">${b.spent.toFixed(0)} / ${b.amount.toFixed(0)}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${b.spent > b.amount ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(b.spent / b.amount * 100, 100)}%` }} /></div></div>)}
      </div></div>
    </section>
    <section className="card overflow-hidden"><div className="border-b border-white/[0.06] p-6"><h2 className="section-title">Recent activity</h2></div>{transactions.slice(0, 6).map(t => <div key={t.id} className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4 last:border-0"><div><p className="font-semibold">{t.merchant}</p><p className="text-xs text-slate-500">{t.category} · {t.transaction_date || "No date"}</p></div><p className={t.transaction_type === "income" ? "text-emerald-300" : "text-slate-100"}>{t.transaction_type === "income" ? "+" : "-"}${Number(t.amount).toFixed(2)}</p></div>)}</section>
  </div>;
}

function Metric({ label, value, icon: Icon, positive = false }: { label: string; value: number; icon: typeof WalletCards; positive?: boolean }) {
  return <div className="card p-6"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={18} className={positive ? "text-emerald-300" : "text-slate-400"} /></div><p className="display mt-4 text-3xl font-extrabold">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>;
}
