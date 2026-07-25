import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArchiveIcon,
  BankIcon,
  BriefcaseIcon,
  CameraIcon,
  CloseIcon,
  CloudIcon,
  GridIcon,
  ListIcon,
  MoreIcon,
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

// Mobile bottom nav only has room for a handful of tabs before icons and
// labels get crushed together (all 8 links in one row was unreadable on a
// real phone). Show the 4 most-used ones plus a "More" tab that opens a
// sheet with the rest, instead of shrinking everything to fit.
const MOBILE_PRIMARY_PATHS = ["/dashboard", "/transactions", "/receipts/scan", "/chat"];
const MOBILE_PRIMARY = MOBILE_PRIMARY_PATHS.map((p) => LINKS.find((l) => l.to === p));
const MOBILE_MORE = LINKS.filter((l) => !MOBILE_PRIMARY_PATHS.includes(l.to));

function SyncedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
      <CloudIcon className="h-3.5 w-3.5" />
      Supabase synced
    </span>
  );
}

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

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

        {/* Mobile bottom nav — 4 primary tabs + "More" for the rest */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 gap-1 border-t border-white/10 bg-[#06090a]/95 px-1 py-2 backdrop-blur lg:hidden">
          {MOBILE_PRIMARY.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-center text-[10.5px] font-medium leading-tight ${
                  isActive ? "text-emerald-400" : "text-neutral-500"
                }`
              }
            >
              <l.icon className="h-6 w-6" />
              <span className="truncate">{l.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex h-12 w-full flex-col items-center justify-center gap-1 rounded-lg border-0 bg-transparent p-0 text-center text-[10.5px] font-medium leading-tight ${
              moreOpen || MOBILE_MORE.some((l) => location.pathname.startsWith(l.to))
                ? "text-emerald-400"
                : "text-neutral-500"
            }`}
          >
            <MoreIcon className="h-6 w-6" />
            <span>More</span>
          </button>
        </nav>

        {/* "More" sheet — the remaining nav links, opened from the More tab */}
        {moreOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/60 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-white/10 bg-[#0b0f0f] p-4 pb-6 lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">More</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="text-neutral-500 hover:text-white"
                  aria-label="Close"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MOBILE_MORE.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 rounded-xl py-3 text-center text-[11px] font-medium leading-tight ${
                        isActive ? "bg-emerald-400/10 text-emerald-400" : "text-neutral-300 hover:bg-white/5"
                      }`
                    }
                  >
                    <l.icon className="h-6 w-6" />
                    <span className="truncate">{l.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
