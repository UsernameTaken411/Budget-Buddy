"""Pydantic schemas for Person B's vertical: budgets, savings goals,
subscriptions.

Owner: Person B. Ported onto Person A's foundation (CurrentUser / db_for_user)
by Person C so the branch builds against `main` — data shapes match B's
original implementation on `budgets-savings-subscriptions`, not the slimmer
SCHEMA.md §4 sketch (B's version has richer fields: reminder_days_before,
is_active, and a 4-way billing_cycle instead of a 2-way cadence).

Kept in its own file rather than appended to models.py — that file is A's
locked contract (SCHEMA.md §5) and changing it requires an announcement.
"""

from __future__ import annotations

from datetime import date as Date
from decimal import Decimal
from typing import Literal

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
    target_date: Date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    target_amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=2)
    target_date: Date | None = None


class ContributionCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class SubscriptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly"] = "monthly"
    next_billing_date: Date
    category: str = Field(default="bills", min_length=1, max_length=80)
    reminder_days_before: int = Field(default=3, ge=0, le=30)
    is_active: bool = True


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    amount: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=2)
    billing_cycle: Literal["weekly", "monthly", "quarterly", "yearly"] | None = None
    next_billing_date: Date | None = None
    category: str | None = Field(None, min_length=1, max_length=80)
    reminder_days_before: int | None = Field(None, ge=0, le=30)
    is_active: bool | None = None
