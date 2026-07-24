import { FormEvent, useState } from "react";
import { Plus, Trash2, WalletCards } from "lucide-react";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";
import type { Budget } from "../types";
import { Modal, Progress, StateMessage } from "../components/ui";
import { money } from "../utils/format";

export function BudgetsPage() {
  const { data, loading, error, refresh } = useResource<Budget>("/budgets");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const spent = data.reduce((sum, item) => sum + Number(item.spent), 0);
  const limit = data.reduce((sum, item) => sum + Number(item.amount), 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/budgets", { method: "POST", body: JSON.stringify({ category: form.get("category"), amount: Number(form.get("amount")) }) });
      setOpen(false); await refresh();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this budget?")) return;
    await api(`/budgets/${id}`, { method: "DELETE" }); await refresh();
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Monthly plan</p><h1 className="display text-3xl font-extrabold sm:text-4xl">Budgets</h1><p className="mt-2 text-slate-500">Set flexible limits and see where your money is going.</p></div>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} />Add budget</button>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Summary label="Total budget" value={money(limit)} accent="text-white" />
        <Summary label="Spent this month" value={money(spent)} accent="text-amber-300" />
        <Summary label="Still available" value={money(Math.max(limit - spent, 0))} accent="text-emerald-300" />
      </div>
      {loading ? <div className="card animate-pulse text-slate-600">Loading budgets…</div> : <StateMessage error={error} empty={!data.length}>No budgets yet. Start with the category you spend on most.</StateMessage>}
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((budget) => {
          const percent = Number(budget.amount) ? (Number(budget.spent) / Number(budget.amount)) * 100 : 0;
          return <article className="card" key={budget.id}>
            <div className="mb-5 flex items-start justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><WalletCards size={19} /></span><div><h2 className="font-bold">{budget.category}</h2><p className="text-sm text-slate-600">Monthly limit</p></div></div><button className="btn-ghost" onClick={() => void remove(budget.id)} aria-label={`Delete ${budget.category}`}><Trash2 size={17} /></button></div>
            <Progress value={percent} danger={percent > 100} />
            <div className="mt-3 flex justify-between gap-3 text-sm"><span><b>{money(Number(budget.spent))}</b> spent</span><span className={percent > 100 ? "text-rose-400" : "text-slate-500"}>{Math.round(percent)}% of {money(Number(budget.amount))}</span></div>
          </article>;
        })}
      </div>
      {open && <Modal title="Add a monthly budget" onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={submit}><label className="block text-sm font-semibold">Category<input className="field mt-1.5" name="category" placeholder="e.g. Food" required maxLength={80} /></label><label className="block text-sm font-semibold">Limit (SGD)<input className="field mt-1.5" name="amount" type="number" min=".01" step=".01" placeholder="500.00" required /></label><button className="btn-primary w-full" disabled={saving}>{saving ? "Saving…" : "Create budget"}</button></form></Modal>}
    </>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="metric"><p className="text-sm text-slate-500">{label}</p><p className={`display mt-1 text-2xl font-extrabold ${accent}`}>{value}</p></div>;
}
