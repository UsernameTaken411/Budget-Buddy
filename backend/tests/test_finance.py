from app.finance import (
    compute_summary,
    generate_insights,
    month_over_month_change,
    spending_by_category,
)

TRANSACTIONS = [
    {"id": "1", "transaction_date": "2026-07-01", "merchant": "Store", "amount": 500.0, "category": "Groceries", "transaction_type": "expense"},
    {"id": "2", "transaction_date": "2026-07-02", "merchant": "Payroll", "amount": 1000.0, "category": "Income", "transaction_type": "income"},
    {"id": "3", "transaction_date": "2026-06-01", "merchant": "Store", "amount": 100.0, "category": "Groceries", "transaction_type": "expense"},
]

BUDGET_PROGRESS = [
    {"id": "b1", "category": "Groceries", "amount": 400.0, "spent": 500.0, "remaining": 0.0, "period": "monthly"},
]


def test_compute_summary():
    summary = compute_summary(TRANSACTIONS)
    assert summary == {"income": 1000.0, "expenses": 600.0, "balance": 400.0}


def test_spending_by_category():
    result = spending_by_category(TRANSACTIONS)
    assert result == [{"category": "Groceries", "amount": 600.0}]


def test_month_over_month_change():
    result = month_over_month_change(TRANSACTIONS)
    assert result["available"] is True
    assert result["current_month"] == "2026-07"
    assert result["pct_change"] == 400.0  # 500 vs 100 = +400%


def test_generate_insights_flags_over_budget_from_budget_progress():
    insights = generate_insights(TRANSACTIONS, BUDGET_PROGRESS)
    types = [i["type"] for i in insights]
    assert "over_budget" in types


def test_generate_insights_all_good_when_no_issues():
    insights = generate_insights([], [])
    assert insights[0]["type"] == "all_good"
