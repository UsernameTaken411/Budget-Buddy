from app.finance import (
    compute_summary,
    generate_insights,
    month_over_month_change,
    spending_by_category,
)

# SCHEMA.md sign convention: expenses negative, income positive, no type column.
TRANSACTIONS = [
    {"id": "1", "date": "2026-07-01", "category": "food", "description": "Lunch", "amount": -500.0},
    {"id": "2", "date": "2026-07-02", "category": "income", "description": "Salary", "amount": 1000.0},
    {"id": "3", "date": "2026-06-01", "category": "food", "description": "Lunch", "amount": -100.0},
    {"id": "4", "date": "2026-07-03", "category": "transfer", "description": "To savings", "amount": -200.0},
]

BUDGETS = [{"id": "b1", "category": "food", "amount": 400.0}]


def test_compute_summary_uses_signed_amounts():
    summary = compute_summary(TRANSACTIONS)
    assert summary["income"] == 1000.0
    assert summary["expenses"] == 600.0  # food only; transfer excluded
    assert summary["balance"] == 200.0  # net cashflow, transfer included: 1000-500-100-200


def test_spending_by_category_excludes_transfer():
    result = spending_by_category(TRANSACTIONS)
    assert result == [{"category": "food", "amount": 600.0}]


def test_month_over_month_change():
    result = month_over_month_change(TRANSACTIONS)
    assert result["available"] is True
    assert result["current_month"] == "2026-07"
    assert result["current_total"] == 500.0
    assert result["previous_total"] == 100.0
    assert result["pct_change"] == 400.0


def test_generate_insights_flags_over_budget():
    insights = generate_insights(TRANSACTIONS, BUDGETS)
    types = [i["type"] for i in insights]
    assert "over_budget" in types


def test_generate_insights_all_good_when_no_issues():
    insights = generate_insights([], [])
    assert insights[0]["type"] == "all_good"
