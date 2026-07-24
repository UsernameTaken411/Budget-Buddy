"""Deterministic finance math and rule-based insights.

Mirrors SCHEMA.md's sign convention and frontend/src/services/categories.js:
expenses are NEGATIVE amounts, income is POSITIVE, there is no type column,
and 'transfer' is excluded from spend/budget views. Nothing here calls the
AI - it's plain arithmetic so the numbers handed to Azure AI Foundry (and
shown on the dashboard) are trustworthy.
"""

from __future__ import annotations

from collections import defaultdict

TRANSFER = "transfer"


def is_spend_row(t: dict) -> bool:
    return t["amount"] < 0 and t.get("category") != TRANSFER


def compute_summary(transactions: list[dict]) -> dict:
    income = sum(t["amount"] for t in transactions if t["amount"] > 0)
    expenses = sum(-t["amount"] for t in transactions if is_spend_row(t))
    net_cashflow = sum(t["amount"] for t in transactions)  # transfers included, per SCHEMA.md
    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "balance": round(net_cashflow, 2),
    }


def spending_by_category(transactions: list[dict]) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if is_spend_row(t):
            totals[t["category"]] += -t["amount"]
    return [
        {"category": c, "amount": round(a, 2)}
        for c, a in sorted(totals.items(), key=lambda kv: -kv[1])
    ]


def monthly_trend(transactions: list[dict]) -> list[dict]:
    by_month: dict[str, dict] = {}
    for t in transactions:
        month = t["date"][:7]  # YYYY-MM
        entry = by_month.setdefault(month, {"month": month, "income": 0.0, "expenses": 0.0})
        if t["amount"] > 0:
            entry["income"] += t["amount"]
        elif is_spend_row(t):
            entry["expenses"] += -t["amount"]
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


def budget_vs_actual(transactions: list[dict], budgets: list[dict]) -> list[dict]:
    """budgets rows are B's table shape: {category, amount (positive cap), ...}."""
    spent = {row["category"]: row["amount"] for row in spending_by_category(transactions)}
    result = []
    for b in budgets:
        actual = spent.get(b["category"], 0.0)
        limit = b["amount"]
        result.append(
            {
                "category": b["category"],
                "limit": limit,
                "actual": round(actual, 2),
                "remaining": round(limit - actual, 2),
                "over_budget": actual > limit,
            }
        )
    return result


def generate_insights(transactions: list[dict], budgets: list[dict]) -> list[dict]:
    """Rule-based insight engine - pure logic, no LLM call needed."""
    insights: list[dict] = []

    for row in budget_vs_actual(transactions, budgets):
        if row["over_budget"]:
            insights.append(
                {
                    "type": "over_budget",
                    "severity": "warning",
                    "message": (
                        f"You're over budget in {row['category']}: "
                        f"${row['actual']:.2f} spent vs a ${row['limit']:.2f} limit."
                    ),
                }
            )
        elif row["limit"] and row["actual"] / row["limit"] > 0.9:
            insights.append(
                {
                    "type": "near_budget",
                    "severity": "info",
                    "message": (
                        f"You're close to your {row['category']} budget: "
                        f"${row['actual']:.2f} of ${row['limit']:.2f}."
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
