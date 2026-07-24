import { useEffect, useState } from "react";
import { api } from "../services/api";
import { getTransactions } from "../services/transactionsApi";
import { computeSummary, monthlyTrend, spendingByCategory } from "../utils/finance";
import { generateInsights } from "../utils/insightRules";
import { money } from "../utils/format";
import { StateMessage } from "../components/ui";
import { InsightCard } from "../components/InsightCard";
import { SpendingByCategoryChart } from "../components/charts/SpendingByCategoryChart";
import { IncomeExpenseChart } from "../components/charts/IncomeExpenseChart";
import type { Budget, Transaction } from "../types";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [txns, budgetRows] = await Promise.all([getTransactions(), api<Budget[]>("/budgets")]);
        if (!cancelled) {
          setTransactions(txns);
          setBudgets(budgetRows);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load your dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-slate-500">Loading your dashboard…</p>;
  if (error) return <StateMessage error={error} />;
  if (transactions.length === 0) {
    return <StateMessage empty>No transactions yet — import a CSV to see your dashboard.</StateMessage>;
  }

  const summary = computeSummary(transactions);
  const byCategory = spendingByCategory(transactions);
  const trend = monthlyTrend(transactions);
  const insights = generateInsights(transactions, budgets);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-2xl font-extrabold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Your spending, at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Income</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{money(summary.income)}</p>
        </div>
        <div className="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{money(summary.expenses)}</p>
        </div>
        <div className="metric">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance</p>
          <p className={`mt-1 text-2xl font-bold ${summary.balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {money(summary.balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-slate-300">Spending by category</p>
          <SpendingByCategoryChart data={byCategory} />
        </div>
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-slate-300">Income vs. expenses</p>
          <IncomeExpenseChart data={trend} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-300">Insights</p>
        <div className="space-y-2">
          {insights.map((insight) => (
            <InsightCard key={insight.type} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
}
