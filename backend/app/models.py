from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    period: Literal["monthly"] = "monthly"

    @field_validator("category")
    @classmethod
    def clean_category(cls, value: str) -> str:
        return value.strip()


class BudgetUpdate(BaseModel):
    category: str | None = Field(None, min_length=1, max_length=80)
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)


class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    target_amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None


class ContributionCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class SubscriptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly"] = "monthly"
    next_billing_date: date
    category: str = Field(default="Subscriptions", min_length=1, max_length=80)
    reminder_days_before: int = Field(default=3, ge=0, le=30)
    is_active: bool = True


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly"] | None = None
    next_billing_date: date | None = None
    category: str | None = Field(None, min_length=1, max_length=80)
    reminder_days_before: int | None = Field(None, ge=0, le=30)
    is_active: bool | None = None


class IdResponse(BaseModel):
    id: UUID


ExpenseCategory = Literal[
    "Food",
    "Transport",
    "Shopping",
    "Groceries",
    "Entertainment",
    "Health",
    "Utilities",
    "Travel",
    "Education",
    "Other",
]


class ReceiptExtraction(BaseModel):
    merchant: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    category: ExpenseCategory
    currency: str = Field(default="SGD", min_length=3, max_length=3)
    confidence: float = Field(ge=0, le=1)
    notes: str = Field(default="", max_length=500)


class TransactionCreate(BaseModel):
    merchant: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    category: ExpenseCategory
    transaction_type: Literal["expense"] = "expense"
    currency: str = Field(default="SGD", min_length=3, max_length=3)
    notes: str = Field(default="", max_length=500)
