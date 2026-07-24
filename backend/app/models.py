"""Pydantic schemas. These ARE the contract in SCHEMA.md §5 — if you change a
field here, you have changed the API for B and C. Announce first.

Owner: Person A.
"""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

CATEGORIES = (
    "food",
    "transport",
    "groceries",
    "shopping",
    "bills",
    "entertainment",
    "health",
    "education",
    "travel",
    "income",
    "transfer",
    "other",
)

Category = Literal[
    "food",
    "transport",
    "groceries",
    "shopping",
    "bills",
    "entertainment",
    "health",
    "education",
    "travel",
    "income",
    "transfer",
    "other",
]


def _round2(v: Decimal | float | int) -> float:
    """Money is always a JSON number with 2dp — SCHEMA.md §0."""
    return float(round(Decimal(str(v)), 2))


class TransactionCreate(BaseModel):
    amount: float
    date: Date
    category: Category = "other"
    description: str = Field(default="", max_length=500)

    @field_validator("amount")
    @classmethod
    def non_zero(cls, v: float) -> float:
        # SCHEMA.md §1: 0.00 is not a meaningful ledger entry.
        if v == 0:
            raise ValueError("amount must not be zero")
        return _round2(v)


class TransactionUpdate(BaseModel):
    """PATCH — every field optional, but any field present must be valid."""

    amount: float | None = None
    date: Date | None = None
    category: Category | None = None
    description: str | None = Field(default=None, max_length=500)

    @field_validator("amount")
    @classmethod
    def non_zero(cls, v: float | None) -> float | None:
        if v is None:
            return None
        if v == 0:
            raise ValueError("amount must not be zero")
        return _round2(v)


class Transaction(BaseModel):
    id: str
    user_id: str
    amount: float
    date: Date
    category: str
    description: str
    created_at: datetime

    @field_validator("amount", mode="before")
    @classmethod
    def coerce_amount(cls, v) -> float:
        # Supabase returns numeric as a string; the contract says JSON number.
        return _round2(v)


class TransactionPage(BaseModel):
    """SCHEMA.md §5.1. `items` is NEVER null — empty result is []."""

    items: list[Transaction]
    total: int
    limit: int
    offset: int


class ImportError_(BaseModel):
    row: int
    message: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[ImportError_]
    detected_format: Literal["generic", "dbs_posb"]


class Profile(BaseModel):
    id: str
    display_name: str
    currency: str
    created_at: datetime


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    currency: str | None = Field(default=None, max_length=8)


# --- Auth (/api/auth/*) ------------------------------------------------
# The browser never talks to Supabase directly — it calls these, we call
# Supabase's Auth REST API with the anon key, and hand back tokens for the
# frontend to store (see frontend/src/services/authStorage.js). Everything
# else (get_current_user, db_for_user) is unchanged: it still just verifies
# whatever bearer token shows up.


class SignupBody(BaseModel):
    email: str
    password: str = Field(min_length=6)
    display_name: str = Field(default="", max_length=120)


class LoginBody(BaseModel):
    email: str
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    id: str
    email: str | None = None


class AuthResult(BaseModel):
    """Returned by /auth/signup, /auth/login, /auth/refresh.

    `access_token` is None only when signup succeeded but Supabase's
    "Confirm email" setting is ON — the account exists but has no session
    until the emailed link is clicked (`needs_confirmation=True`).
    """

    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    user: AuthUser
    needs_confirmation: bool = False
