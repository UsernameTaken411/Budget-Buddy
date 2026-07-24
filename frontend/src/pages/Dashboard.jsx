import { useEffect, useState } from "react";
import { apiFetch, fetchAllTransactions } from "../services/api";
import { totalsByCategory, netCashflow, formatAmount } from "../services/categories";
import InsightCard from "../components/InsightCard.jsx";
import SpendingByCategoryChart from "../components/charts/SpendingByCategoryChart.jsx";
import IncomeExpenseChart from "../components/charts/IncomeExpenseChart.jsx";

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

function monthlyTrend(transactions) {
  const byMonth = new Map();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const entry = byMonth.get(month) || { month, income: 0, expenses: 0 };
    if (t.amount > 0) entry.income += t.amount;
    else if (t.category !== "transfer") entry.expenses -= t.amount;
    byMonth.set(month, entry);
  }
  return [...byMonth.values()]
    .map((e) => ({
      ...e,
      income: Math.round(e.income * 100) / 100,
      expenses: Math.round(e.expenses * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function generateInsights(transactions, budgets) {
  const insights = [];
  const spent = totalsByCategory(transactions);

  for (const b of budgets) {
    const actual = spent[b.category] || 0;
    if (actual > b.amount) {
      insights.push({
        type: `over_budget_${b.category}`,
        severity: "warning",
        message: `You're over budget in ${b.category}: ${formatAmount(actual)} spent vs a ${formatAmount(b.amount)} limit.`,
      });
    } else if (b.amount && actual / b.amount > 0.9) {
      insights.push({
        type: `near_budget_${b.category}`,
        severity: "info",
        message: `You're close to your ${b.category} budget: ${formatAmount(actual)} of ${formatAmount(b.amount)}.`,
      });
    }
  }

  const trend = monthlyTrend(transactions);
  if (trend.length >= 2) {
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    if (previous.expenses) {
      const pctChange = Math.round(((current.expenses - previous.expenses) / previous.expenses) * 1000) / 10;
      if (pctChange > 15) {
        insights.push({
          type: "spending_up",
          severity: "warning",
          message: `Spending is up ${pctChange}% vs last month (${formatAmount(current.expenses)} vs ${formatAmount(previous.expenses)}).`,
        });
      } else if (pctChange < -15) {
        insights.push({
          type: "spending_down",
          severity: "positive",
          message: `Nice — spending is down ${Math.abs(pctChange)}% vs last month.`,
        });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: "all_good",
      severity: "positive",
      message: "No budget issues detected this month. Keep it up!",
    });
  }

  return insights;
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
    return <p className="text-slate-500">Loading your dashboard…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
        Couldn't load your data: {state.error}
      </div>
    );
  }

  const { transactions, budgets } = state;

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No transactions yet — add one on the Transactions page to see your dashboard.
      </div>
    );
  }

  const summary = computeSummary(transactions);
  const byCategory = totalsByCategory(transactions);
  const chartData = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const trend = monthlyTrend(transactions);
  const insights = generateInsights(transactions, budgets);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Income</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatAmount(summary.income)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Expenses</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{formatAmount(summary.expenses)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Balance</p>
          <p className={`mt-1 text-2xl font-semibold ${summary.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatAmount(summary.balance)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Spending by category</p>
          <SpendingByCategoryChart data={chartData} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Income vs. expenses</p>
          <IncomeExpenseChart data={trend} />
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm font-medium text-slate-700">Insights</p>
        <div className="space-y-2">
          {insights.map((insight) => (
            <InsightCard key={insight.type} insight={insight} />
          ))}
        </div>
      </section>
    </div>
  );
}
