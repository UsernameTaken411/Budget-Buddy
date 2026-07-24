from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models import (
    BudgetCreate,
    ContributionCreate,
    ReceiptExtraction,
    SubscriptionCreate,
    TransactionCreate,
)


def test_budget_rejects_zero_amount():
    with pytest.raises(ValidationError):
        BudgetCreate(category="Food", amount=0)


def test_budget_trims_category():
    budget = BudgetCreate(category="  Food  ", amount=Decimal("500"))
    assert budget.category == "Food"


def test_contribution_must_be_positive():
    with pytest.raises(ValidationError):
        ContributionCreate(amount=-10)


def test_subscription_requires_supported_cycle():
    with pytest.raises(ValidationError):
        SubscriptionCreate(
            name="Example",
            amount=10,
            billing_cycle="daily",
            next_billing_date="2026-08-01",
        )


def test_receipt_rejects_unknown_category():
    with pytest.raises(ValidationError):
        ReceiptExtraction(
            merchant="Example",
            amount=12.50,
            transaction_date="2026-07-24",
            category="Mystery",
            confidence=0.9,
        )


def test_receipt_confidence_is_bounded():
    with pytest.raises(ValidationError):
        ReceiptExtraction(
            merchant="Example",
            amount=12.50,
            transaction_date="2026-07-24",
            category="Food",
            confidence=1.2,
        )


def test_receipt_allows_missing_purchase_date():
    receipt = ReceiptExtraction(
        merchant="FairPrice",
        amount=10.45,
        transaction_date=None,
        category="Groceries",
    )

    assert receipt.transaction_date is None


def test_receipt_normalizes_common_ai_output_formats():
    receipt = ReceiptExtraction(
        merchant="FairPrice",
        amount="S$10.45",
        transaction_date="N/A",
        category="Grocery",
        currency="S$",
        confidence="90%",
    )

    assert receipt.amount == Decimal("10.45")
    assert receipt.transaction_date is None
    assert receipt.category == "Groceries"
    assert receipt.currency == "SGD"
    assert receipt.confidence == 0.9


def test_confirmed_transaction_allows_missing_purchase_date():
    transaction = TransactionCreate(
        merchant="FairPrice",
        amount=10.45,
        transaction_date=None,
        category="Groceries",
    )

    assert transaction.transaction_date is None


def test_confirmed_transaction_accepts_user_budget_category():
    transaction = TransactionCreate(
        merchant="Landlord",
        amount=1800,
        category="Home Rent",
    )

    assert transaction.category == "Home Rent"
