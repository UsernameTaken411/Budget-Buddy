import { FormEvent, useState } from "react";
import { CalendarDays, Plus, Sparkles, Trash2 } from "lucide-react";
import { Modal, Progress, StateMessage } from "../components/ui";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import type { SavingsGoal } from "../types";
import { money } from "../utils/format";

export function SavingsPage() {
  const { data, loading, error, refresh } = useResource<SavingsGoal>("/savings-goals");
  const [modal, setModal] = useState<"create" | "contribute" | null>(null);
  const [selected, setSelected] = useState<SavingsGoal | null>(null);
  const saved = data.reduce((sum, goal) => sum + Number(goal.current_amount), 0);
  const target = data.reduce((sum, goal) => sum + Number(goal.target_amount), 0);
  const overall = target ? Math.round((saved / target) * 100) : 0;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await api("/savings-goals", { method: "POST", body: JSON.stringify({ name: form.get("name"), target_amount: Number(form.get("target_amount")), target_date: form.get("target_date") || null }) });
    setModal(null); await refresh();
  }

  async function contribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    await api(`/savings-goals/${selected.id}/contributions`, { method: "POST", body: JSON.stringify({ amount: Number(form.get("amount")) }) });
    setModal(null); await refresh();
  }

  async function remove(id: string) {
    if (confirm("Delete this savings goal?")) { await api(`/savings-goals/${id}`, { method: "DELETE" }); await refresh(); }
  }

  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Build momentum</p><h1 className="display text-3xl font-extrabold sm:text-4xl">Savings goals</h1><p className="mt-2 text-slate-500">Give every future plan a clear path forward.</p></div><button className="btn-primary" onClick={() => setModal("create")}><Plus size={18} />New goal</button></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="metric"><p className="text-sm text-slate-500">Saved so far</p><p className="display mt-1 text-2xl font-extrabold text-emerald-300">{money(saved)}</p></div><div className="metric"><p className="text-sm text-slate-500">Combined targets</p><p className="display mt-1 text-2xl font-extrabold">{money(target)}</p></div><div className="metric"><p className="text-sm text-slate-500">Overall progress</p><p className="display mt-1 text-2xl font-extrabold text-sky-300">{overall}%</p></div></div>
    {loading ? <div className="card animate-pulse">Loading goals…</div> : <StateMessage error={error} empty={!data.length}>Your next milestone starts here. Add a savings goal.</StateMessage>}
    <div className="grid gap-5 md:grid-cols-2">
      {data.map(goal => <article className="card" key={goal.id}><div className="mb-6 flex justify-between"><div><span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Sparkles size={19} /></span><h2 className="text-lg font-bold">{goal.name}</h2>{goal.target_date && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays size={15} />Target {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</p>}</div><button className="btn-ghost self-start" onClick={() => void remove(goal.id)}><Trash2 size={17} /></button></div><div className="mb-2 flex items-end justify-between"><p className="display text-2xl font-extrabold">{money(Number(goal.current_amount))}</p><p className="text-sm text-slate-500">of {money(Number(goal.target_amount))}</p></div><Progress value={Number(goal.progress_percent)} /><div className="mt-4 flex items-center justify-between"><span className="text-sm font-bold text-emerald-300">{Number(goal.progress_percent).toFixed(0)}% complete</span><button className="btn-ghost bg-white/[0.04]" onClick={() => { setSelected(goal); setModal("contribute"); }}>Add money</button></div></article>)}
    </div>
    {modal === "create" && <Modal title="Create a savings goal" onClose={() => setModal(null)}><form className="space-y-4" onSubmit={create}><label className="block text-sm font-semibold">Goal name<input className="field mt-1.5" name="name" required placeholder="Japan trip" /></label><label className="block text-sm font-semibold">Target amount<input className="field mt-1.5" name="target_amount" type="number" min=".01" step=".01" required /></label><label className="block text-sm font-semibold">Target date <span className="font-normal text-slate-600">(optional)</span><input className="field mt-1.5" name="target_date" type="date" /></label><button className="btn-primary w-full">Create goal</button></form></Modal>}
    {modal === "contribute" && selected && <Modal title={`Add to ${selected.name}`} onClose={() => setModal(null)}><form className="space-y-4" onSubmit={contribute}><label className="block text-sm font-semibold">Contribution amount<input className="field mt-1.5" name="amount" type="number" min=".01" step=".01" required autoFocus /></label><button className="btn-primary w-full">Add contribution</button></form></Modal>}
  </>;
}
