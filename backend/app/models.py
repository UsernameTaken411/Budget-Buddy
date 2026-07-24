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
    "Housing",
    "Utilities",
    "Travel",
    "Education",
    "Other",
]


class ReceiptExtraction(BaseModel):
    merchant: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date | None = None
    category: ExpenseCategory = "Other"
    currency: str = Field(default="SGD", min_length=3, max_length=3)
    confidence: float = Field(default=0.5, ge=0, le=1)
    notes: str = Field(default="", max_length=500)
    recommended_budget_category: str | None = Field(default=None, max_length=80)

    @field_validator("transaction_date", mode="before")
    @classmethod
    def normalize_missing_date(cls, value):
        if value is None:
            return None
        if isinstance(value, str) and value.strip().lower() in {
            "",
            "n/a",
            "na",
            "none",
            "null",
            "not visible",
            "not found",
            "unknown",
        }:
            return None
        return value

    @field_validator("amount", mode="before")
    @classmethod
    def normalize_receipt_amount(cls, value):
        if isinstance(value, str):
            return value.upper().replace("SGD", "").replace("S$", "").replace("$", "").strip()
        return value

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_receipt_currency(cls, value):
        if not value:
            return "SGD"
        normalized = str(value).strip().upper()
        if normalized in {"$", "S$", "SINGAPORE DOLLAR", "SINGAPORE DOLLARS"}:
            return "SGD"
        return normalized

    @field_validator("category", mode="before")
    @classmethod
    def normalize_receipt_category(cls, value):
        aliases = {
            "grocery": "Groceries",
            "supermarket": "Groceries",
            "dining": "Food",
            "restaurant": "Food",
            "retail": "Shopping",
            "medical": "Health",
        }
        if not value:
            return "Other"
        return aliases.get(str(value).strip().lower(), value)

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_receipt_confidence(cls, value):
        if value is None:
            return 0.5
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized.endswith("%"):
                return float(normalized.removesuffix("%")) / 100
            return {"high": 0.9, "medium": 0.6, "low": 0.3}.get(normalized, value)
        if isinstance(value, (int, float)) and value >= 2:
            return value / 100
        return value


class TransactionCreate(BaseModel):
    merchant: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date | None = None
    category: str = Field(min_length=1, max_length=80)
    transaction_type: Literal["expense"] = "expense"
    currency: str = Field(default="SGD", min_length=3, max_length=3)
    notes: str = Field(default="", max_length=500)


class TransactionUpdate(BaseModel):
    merchant: str | None = Field(None, min_length=1, max_length=120)
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    transaction_date: date | None = None
    category: str | None = Field(None, min_length=1, max_length=80)
    transaction_type: Literal["income", "expense"] | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    notes: str | None = Field(None, max_length=500)


class SignupBody(BaseModel):
    email: str
    password: str = Field(min_length=6)
    display_name: str = Field(default="", max_length=120)


class LoginBody(BaseModel):
    email: str
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=120)
    currency: str | None = Field(None, min_length=3, max_length=3)
