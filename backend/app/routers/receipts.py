from datetime import date

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from ..dependencies import AccessToken
from ..models import TransactionCreate
from ..receipt_ai import extract_receipt
from ..supabase import SupabaseREST

router = APIRouter(prefix="/receipts", tags=["receipts"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024

CATEGORY_ALIASES = {
    "Food": ["Food", "Dining"],
    "Groceries": ["Groceries", "Food", "Dining"],
    "Transport": ["Transport"],
    "Shopping": ["Shopping"],
    "Entertainment": ["Entertainment"],
    "Health": ["Health"],
    "Housing": ["Housing", "Rent", "Mortgage", "Home"],
    "Utilities": ["Utilities"],
    "Travel": ["Travel"],
    "Education": ["Education"],
    "Other": ["Other", "Shopping"],
}


@router.post("/scan")
async def scan_receipt(
    image: UploadFile = File(...),
    budget_categories: str = Form("[]"),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Use a JPEG, PNG, or WebP receipt image.")
    content = await image.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Receipt images must be 10 MB or smaller.")
    if not content:
        raise HTTPException(400, "The receipt image is empty.")
    try:
        parsed_categories = json.loads(budget_categories)
        if not isinstance(parsed_categories, list):
            raise ValueError
        clean_categories = [
            str(category).strip()[:80]
            for category in parsed_categories[:100]
            if str(category).strip()
        ]
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(400, "Budget categories must be a JSON list.") from None
    return await extract_receipt(content, image.content_type, clean_categories)


@router.post("/confirm", status_code=status.HTTP_201_CREATED)
async def confirm_receipt(payload: TransactionCreate, token: AccessToken):
    db = SupabaseREST(token)
    budgets = await db.request(
        "GET",
        "budgets",
        params={"select": "category"},
    )
    accepted_categories = CATEGORY_ALIASES.get(payload.category, [payload.category])
    budget_category = next(
        (
            row["category"]
            for candidate in accepted_categories
            for row in budgets
            if row["category"].casefold() == candidate.casefold()
        ),
        payload.category,
    )
    transaction = payload.model_dump(mode="json") | {
        "category": budget_category,
        "source": "receipt",
    }
    if transaction["transaction_date"] is None:
        transaction["transaction_date"] = date.today().isoformat()
        fallback_note = "Purchase date was not visible; confirmation date used for budgeting."
        transaction["notes"] = " ".join(
            part for part in [transaction.get("notes", "").strip(), fallback_note] if part
        )
    rows = await db.request(
        "POST",
        "transactions",
        json=transaction,
        prefer="return=representation",
    )
    return rows[0]


@router.get("")
async def list_receipts(token: AccessToken):
    return await SupabaseREST(token).request(
        "GET",
        "transactions",
        params={
            "source": "eq.receipt",
            "select": "*",
            "order": "created_at.desc",
            "limit": "25",
        },
    )
