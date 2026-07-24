import { FormEvent, useState } from "react";
import { Bell, BellRing, Pause, Play, Plus, Receipt, Trash2 } from "lucide-react";
import { Modal, StateMessage } from "../components/ui";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import type { Subscription } from "../types";
import { money } from "../utils/format";

export function SubscriptionsPage() {
  const { data, loading, error, refresh } = useResource<Subscription>("/subscriptions");
  const [open, setOpen] = useState(false);
  const monthly = data.filter(item => item.is_active).reduce((sum, item) => sum + Number(item.monthly_cost), 0);
  const due = data.filter(item => item.is_active && daysUntil(item.next_billing_date) <= item.reminder_days_before).length;
  const [notice, setNotice] = useState("Browser reminders are optional.");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await api("/subscriptions", { method: "POST", body: JSON.stringify({ name: form.get("name"), amount: Number(form.get("amount")), billing_cycle: form.get("billing_cycle"), next_billing_date: form.get("next_billing_date"), category: form.get("category"), reminder_days_before: Number(form.get("reminder_days_before")) }) });
    setOpen(false); await refresh();
  }

  async function toggle(item: Subscription) {
    await api(`/subscriptions/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) }); await refresh();
  }

  async function remove(id: string) {
    if (confirm("Delete this subscription?")) { await api(`/subscriptions/${id}`, { method: "DELETE" }); await refresh(); }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setNotice("Notifications are not supported by this browser."); return; }
    const permission = await Notification.requestPermission();
    setNotice(permission === "granted" ? "Reminders enabled for this browser." : "Notifications were not enabled.");
    if (permission === "granted" && due) new Notification("Budget Buddy", { body: `${due} subscription${due === 1 ? "" : "s"} renewing soon.` });
  }

  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Recurring costs</p><h1 className="display text-3xl font-extrabold sm:text-4xl">Subscriptions</h1><p className="mt-2 text-slate-500">Catch renewals early and keep only what earns its place.</p></div><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} />Add subscription</button></div>
    <div className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-emerald-300/10 bg-gradient-to-br from-emerald-400/10 to-transparent p-6"><p className="text-sm text-slate-500">Active subscription cost</p><p className="display mt-1 text-4xl font-extrabold">{money(monthly)}<span className="text-base font-medium text-slate-600"> / month</span></p><p className="mt-3 text-sm text-emerald-300">{money(monthly * 12)} projected per year</p></section><section className="card flex flex-col justify-between"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Renewing soon</p><p className="display mt-1 text-3xl font-extrabold text-amber-300">{due}</p></div>{due ? <BellRing className="text-amber-300" /> : <Bell className="text-slate-600" />}</div><button className="mt-4 text-left text-xs font-semibold text-slate-500 hover:text-emerald-300" onClick={() => void enableNotifications()}>{notice} Enable →</button></section></div>
    {loading ? <div className="card animate-pulse">Loading subscriptions…</div> : <StateMessage error={error} empty={!data.length}>No recurring charges tracked yet.</StateMessage>}
    <div className="space-y-3">{data.map(item => <article key={item.id} className={`card flex flex-wrap items-center gap-4 ${!item.is_active ? "opacity-45" : ""}`}><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Receipt size={20} /></span><div className="min-w-40 flex-1"><div className="flex items-center gap-2"><h2 className="font-bold">{item.name}</h2>{item.is_active && daysUntil(item.next_billing_date) <= item.reminder_days_before && <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">Due soon</span>}</div><p className="text-sm capitalize text-slate-500">{item.category} · {item.billing_cycle}</p></div><div className="text-right"><p className="font-bold">{money(Number(item.amount))}</p><p className="text-xs text-slate-500">Next: {new Date(`${item.next_billing_date}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</p></div><div className="flex"><button className="btn-ghost" onClick={() => void toggle(item)} aria-label={item.is_active ? "Pause" : "Resume"}>{item.is_active ? <Pause size={17} /> : <Play size={17} />}</button><button className="btn-ghost" onClick={() => void remove(item.id)} aria-label="Delete"><Trash2 size={17} /></button></div></article>)}</div>
    {open && <Modal title="Add a subscription" onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={create}><label className="block text-sm font-semibold">Name<input className="field mt-1.5" name="name" required placeholder="Netflix" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Amount<input className="field mt-1.5" name="amount" type="number" min=".01" step=".01" required /></label><label className="block text-sm font-semibold">Billing cycle<select className="field mt-1.5" name="billing_cycle"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label></div><label className="block text-sm font-semibold">Next billing date<input className="field mt-1.5" name="next_billing_date" type="date" required /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Category<input className="field mt-1.5" name="category" defaultValue="Subscriptions" required /></label><label className="block text-sm font-semibold">Remind before<input className="field mt-1.5" name="reminder_days_before" type="number" min="0" max="30" defaultValue="3" required /></label></div><button className="btn-primary w-full">Add subscription</button></form></Modal>}
  </>;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86_400_000);
}
