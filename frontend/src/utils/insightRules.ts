import type { Budget, Insight, Transaction } from "../types";
import { monthOverMonthChange } from "./finance";

// Rule-based insight engine - pure logic, no LLM call needed. Budgets come
// from the budget_progress view, which already has spent/remaining computed.
export function generateInsights(transactions: Transaction[], budgets: Budget[]): Insight[] {
  const insights: Insight[] = [];

  for (const b of budgets) {
    if (b.spent > b.amount) {
      insights.push({
        type: "over_budget",
        severity: "warning",
        message: `You're over budget in ${b.category}: $${b.spent.toFixed(2)} spent vs a $${b.amount.toFixed(2)} limit.`,
      });
    } else if (b.amount && b.spent / b.amount > 0.9) {
      insights.push({
        type: "near_budget",
        severity: "info",
        message: `You're close to your ${b.category} budget: $${b.spent.toFixed(2)} of $${b.amount.toFixed(2)}.`,
      });
    }
  }

  const momc = monthOverMonthChange(transactions);
  if (momc.available && momc.pctChange !== null && momc.pctChange !== undefined) {
    if (momc.pctChange > 15) {
      insights.push({
        type: "spending_up",
        severity: "warning",
        message: `Spending is up ${momc.pctChange}% vs last month ($${momc.currentTotal?.toFixed(2)} vs $${momc.previousTotal?.toFixed(2)}).`,
      });
    } else if (momc.pctChange < -15) {
      insights.push({
        type: "spending_down",
        severity: "positive",
        message: `Nice — spending is down ${Math.abs(momc.pctChange)}% vs last month.`,
      });
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
