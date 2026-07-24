import { NavLink, Outlet } from "react-router-dom";
import {
  ArchiveIcon,
  BankIcon,
  BriefcaseIcon,
  CameraIcon,
  CloudIcon,
  GridIcon,
  ListIcon,
  PiggyBankIcon,
  ReceiptDollarIcon,
  SparkleIcon,
  UserCircleIcon,
} from "./icons.jsx";

// Shared chrome for every signed-in page. B and C: add your nav links to the
// LINKS array below rather than building your own header.
const LINKS = [
  { to: "/dashboard", label: "Overview", icon: GridIcon },
  { to: "/transactions", label: "Transactions", icon: ListIcon },
  { to: "/receipts/scan", label: "Scan receipt", icon: CameraIcon },
  { to: "/budgets", label: "Budgets", icon: ArchiveIcon },
  { to: "/savings", label: "Savings", icon: PiggyBankIcon },
  { to: "/subscriptions", label: "Subscriptions", icon: ReceiptDollarIcon },
  { to: "/chat", label: "Insights", icon: BriefcaseIcon },
  { to: "/profile", label: "Profile", icon: UserCircleIcon },
];

function SyncedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
      <CloudIcon className="h-3.5 w-3.5" />
      Supabase synced
    </span>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#06090a] text-neutral-100 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10 lg:px-5 lg:py-6">
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-neutral-950">
            <BankIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-white">Budget Buddy</p>
            <p className="text-xs text-neutral-500">Financial clarity, daily.</p>
          </div>
        </div>

        <p className="mb-2 mt-8 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
          Plan &amp; grow
        </p>
        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                }`
              }
            >
              <l.icon className="h-5 w-5 shrink-0" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <SparkleIcon className="h-5 w-5 text-emerald-400" />
          <p className="mt-2 text-sm font-semibold text-white">
            Money, without the mystery.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Set limits, fund goals and catch recurring costs in one place.
          </p>
        </div>

        <div className="mt-4 px-1">
          <SyncedBadge />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-neutral-950">
              <BankIcon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-white">Budget Buddy</span>
          </div>
          <SyncedBadge />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-8 gap-0.5 border-t border-white/10 bg-[#06090a]/95 px-1 py-2 backdrop-blur lg:hidden">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg py-1 text-center text-[9px] font-medium leading-tight ${
                  isActive ? "text-emerald-400" : "text-neutral-500"
                }`
              }
            >
              <l.icon className="h-5 w-5" />
              <span className="truncate">{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
