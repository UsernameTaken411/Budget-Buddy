import { Cloud, Landmark, PiggyBank, Sparkles, WalletCards, WifiOff } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { isPreviewMode } from "../services/api";

const links = [
  { to: "/budgets", label: "Budgets", icon: WalletCards },
  { to: "/savings", label: "Savings", icon: PiggyBank },
];

export function Layout() {
  const preview = isPreviewMode();
  return (
    <div className="min-h-screen bg-[#090d0c] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(52,211,153,.11),transparent_32%)]" />
      <header className="relative z-30 border-b border-white/[0.07] bg-[#090d0c]/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-[#07100d]"><Landmark size={19} /></span><p className="display font-extrabold">Budget Buddy</p></div><Status preview={preview} /></div>
      </header>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0b100f]/95 p-5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-2 py-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-[#07100d]"><Landmark /></span><div><p className="display font-extrabold">Budget Buddy</p><p className="text-xs text-slate-500">Financial clarity, daily.</p></div></div>
        <p className="mb-2 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-slate-600">Plan & grow</p>
        <nav className="space-y-1">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-emerald-400/10 text-emerald-300" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}><Icon size={17} />{label}</NavLink>)}</nav>
        <div className="mt-auto rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4"><Sparkles className="mb-3 text-emerald-300" size={18} /><p className="text-sm font-bold">Money, without the mystery.</p><p className="mt-1 text-xs leading-5 text-slate-500">Set limits and fund goals in one place.</p></div>
        <div className="mt-4"><Status preview={preview} /></div>
      </aside>
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-28 pt-8 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10"><Outlet /></main>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-white/10 bg-[#111715]/95 p-2 lg:hidden">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${isActive ? "bg-emerald-400/10 text-emerald-300" : "text-slate-500"}`}><Icon size={18} />{label}</NavLink>)}</nav>
    </div>
  );
}

function Status({ preview }: { preview: boolean }) {
  return <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${preview ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300"}`}>{preview ? <WifiOff size={13} /> : <Cloud size={13} />}{preview ? "Local preview" : "Cloud synced"}</div>;
}
