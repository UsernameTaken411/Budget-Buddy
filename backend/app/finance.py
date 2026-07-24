"""Deterministic finance math and rule-based insights.

Works against the real schema in supabase/schema.sql: transactions carry a
transaction_type ("income" | "expense") with amount always positive, and
budgets are read from the budget_progress view, which already has spent /
remaining computed server-side for the current month.

Nothing here calls the AI - it's plain arithmetic so the numbers handed to
Azure AI Foundry (and shown on the dashboard) are trustworthy.
"""

from __future__ import annotations

from collections import defaultdict


def compute_summary(transactions: list[dict]) -> dict:
    income = sum(t["amount"] for t in transactions if t["transaction_type"] == "income")
    expenses = sum(t["amount"] for t in transactions if t["transaction_type"] == "expense")
    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "balance": round(income - expenses, 2),
    }


def spending_by_category(transactions: list[dict]) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t["transaction_type"] == "expense":
            totals[t.get("category", "Uncategorized")] += t["amount"]
    return [
        {"category": c, "amount": round(a, 2)}
        for c, a in sorted(totals.items(), key=lambda kv: -kv[1])
    ]


def monthly_trend(transactions: list[dict]) -> list[dict]:
    by_month: dict[str, dict] = {}
    for t in transactions:
        month = t["transaction_date"][:7]  # YYYY-MM
        entry = by_month.setdefault(month, {"month": month, "income": 0.0, "expenses": 0.0})
        if t["transaction_type"] == "income":
            entry["income"] += t["amount"]
        else:
            entry["expenses"] += t["amount"]
    return [
        {**e, "income": round(e["income"], 2), "expenses": round(e["expenses"], 2)}
        for e in sorted(by_month.values(), key=lambda e: e["month"])
    ]


def month_over_month_change(transactions: list[dict]) -> dict:
    trend = monthly_trend(transactions)
    if len(trend) < 2:
        return {"available": False}
    current, previous = trend[-1], trend[-2]
    pct_change = None
    if previous["expenses"]:
        pct_change = round(
            (current["expenses"] - previous["expenses"]) / previous["expenses"] * 100, 1
        )
    return {
        "available": True,
        "current_month": current["month"],
        "previous_month": previous["month"],
        "current_total": current["expenses"],
        "previous_total": previous["expenses"],
        "pct_change": pct_change,
    }


def generate_insights(transactions: list[dict], budgets: list[dict]) -> list[dict]:
    """budgets is expected in budget_progress shape: category, amount, spent, remaining."""
    insights: list[dict] = []

    for b in budgets:
        if b["spent"] > b["amount"]:
            insights.append(
                {
                    "type": "over_budget",
                    "severity": "warning",
                    "message": (
                        f"You're over budget in {b['category']}: "
                        f"${b['spent']:.2f} spent vs a ${b['amount']:.2f} limit."
                    ),
                }
            )
        elif b["amount"] and b["spent"] / b["amount"] > 0.9:
            insights.append(
                {
                    "type": "near_budget",
                    "severity": "info",
                    "message": (
                        f"You're close to your {b['category']} budget: "
                        f"${b['spent']:.2f} of ${b['amount']:.2f}."
                    ),
                }
            )

    momc = month_over_month_change(transactions)
    if momc["available"] and momc["pct_change"] is not None:
        if momc["pct_change"] > 15:
            insights.append(
                {
                    "type": "spending_up",
                    "severity": "warning",
                    "message": (
                        f"Spending is up {momc['pct_change']}% vs last month "
                        f"(${momc['current_total']:.2f} vs ${momc['previous_total']:.2f})."
                    ),
                }
            )
        elif momc["pct_change"] < -15:
            insights.append(
                {
                    "type": "spending_down",
                    "severity": "positive",
                    "message": f"Nice — spending is down {abs(momc['pct_change'])}% vs last month.",
                }
            )

    if not insights:
        insights.append(
            {
                "type": "all_good",
                "severity": "positive",
                "message": "No budget issues detected this month. Keep it up!",
            }
        )

    return insights
