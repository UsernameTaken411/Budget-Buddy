import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, fetchAllTransactions } from "../services/api";
import { totalsByCategory, netCashflow, formatAmount, CATEGORY_LABELS } from "../services/categories";
import { ArrowDownRightIcon, ArrowUpRightIcon, CameraIcon, InboxIcon, PiggyBankIcon } from "../components/icons.jsx";

function computeSummary(transactions) {
  const income = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.amount < 0 && t.category !== "transfer")
    .reduce((s, t) => s - t.amount, 0);
  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    balance: netCashflow(transactions),
  };
}

export default function Dashboard() {
  const [state, setState] = useState({ status: "loading", transactions: [], budgets: [] });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const transactions = await fetchAllTransactions();
        // B's /api/budgets may not exist yet - dashboard still works without it.
        let budgets = [];
        try {
          budgets = await apiFetch("/budgets");
        } catch {
          budgets = [];
        }
        if (!cancelled) setState({ status: "ready", transactions, budgets });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", error: err.message, transactions: [], budgets: [] });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-neutral-400">Loading your dashboard…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
        Couldn't load your data: {state.error}
      </div>
    );
  }

  const { transactions, budgets } = state;
  const summary = computeSummary(transactions);
  const byCategory = Object.entries(totalsByCategory(transactions)).sort((a, b) => b[1] - a[1]);
  const maxCategory = byCategory.length ? byCategory[0][1] : 0;
  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-neutral-400">Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your money at a glance
          </h1>
          <p className="mt-1 max-w-lg text-sm text-neutral-400">
            A clear view of what came in, went out, and needs attention.
          </p>
        </div>
        <Link
          to="/receipts/scan"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300"
        >
          <CameraIcon className="h-4 w-4" />
          Scan a receipt
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-neutral-500">
          No transactions yet — add one on the Transactions page to see your dashboard.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm text-neutral-400">Available balance</p>
                <InboxIcon className="h-4 w-4 text-neutral-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {formatAmount(summary.balance)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm text-neutral-400">Income</p>
                <ArrowUpRightIcon className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {formatAmount(summary.income)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm text-neutral-400">Expenses</p>
                <ArrowDownRightIcon className="h-4 w-4 text-rose-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {formatAmount(summary.expenses)}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-sm font-semibold text-white">Spending by category</p>
              {byCategory.length === 0 ? (
                <p className="text-sm text-neutral-500">No expenses recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {byCategory.slice(0, 6).map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-200">
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                        <span className="text-neutral-400">{formatAmount(amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{
                            width: `${maxCategory ? Math.max((amount / maxCategory) * 100, 4) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <PiggyBankIcon className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-semibold text-white">Budget health</p>
              </div>
              {budgets.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No budgets set yet — add one on the Budgets page.
                </p>
              ) : (
                <div className="space-y-4">
                  {budgets.map((b) => {
                    const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                    const over = b.spent > b.amount;
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-neutral-200">
                            {CATEGORY_LABELS[b.category] ?? b.category}
                          </span>
                          <span className="text-neutral-400">
                            {formatAmount(b.spent)} / {formatAmount(b.amount)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${over ? "bg-rose-400" : "bg-emerald-400"}`}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-sm font-semibold text-white">Recent activity</p>
            <div className="divide-y divide-white/5">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {t.description || (CATEGORY_LABELS[t.category] ?? t.category)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {CATEGORY_LABELS[t.category] ?? t.category} · {t.date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      t.amount > 0 ? "text-emerald-400" : "text-neutral-200"
                    }`}
                  >
                    {formatAmount(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
