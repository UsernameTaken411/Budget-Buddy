import type { Transaction } from "../types";

// Deterministic finance math - no AI involved. Mirrors backend/app/finance.py
// so the numbers shown on screen always match what the AI is grounded on.

export interface Summary {
  income: number;
  expenses: number;
  balance: number;
}

export function computeSummary(transactions: Transaction[]): Summary {
  const income = transactions
    .filter((t) => t.transaction_type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  return { income: round2(income), expenses: round2(expenses), balance: round2(income - expenses) };
}

export interface CategorySpend {
  category: string;
  amount: number;
}

export function spendingByCategory(transactions: Transaction[]): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.transaction_type === "expense") {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthTrend {
  month: string;
  income: number;
  expenses: number;
}

export function monthlyTrend(transactions: Transaction[]): MonthTrend[] {
  const byMonth = new Map<string, MonthTrend>();
  for (const t of transactions) {
    const month = t.transaction_date.slice(0, 7);
    const entry = byMonth.get(month) ?? { month, income: 0, expenses: 0 };
    if (t.transaction_type === "income") entry.income += t.amount;
    else entry.expenses += t.amount;
    byMonth.set(month, entry);
  }
  return [...byMonth.values()]
    .map((e) => ({ ...e, income: round2(e.income), expenses: round2(e.expenses) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface MonthOverMonth {
  available: boolean;
  currentMonth?: string;
  previousMonth?: string;
  currentTotal?: number;
  previousTotal?: number;
  pctChange?: number | null;
}

export function monthOverMonthChange(transactions: Transaction[]): MonthOverMonth {
  const trend = monthlyTrend(transactions);
  if (trend.length < 2) return { available: false };
  const current = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const pctChange = previous.expenses
    ? round2(((current.expenses - previous.expenses) / previous.expenses) * 100)
    : null;
  return {
    available: true,
    currentMonth: current.month,
    previousMonth: previous.month,
    currentTotal: current.expenses,
    previousTotal: previous.expenses,
    pctChange,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
