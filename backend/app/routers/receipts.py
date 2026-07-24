"""POST /api/receipts/scan (AI extraction) + POST /api/receipts/confirm
(save as a real transaction).

Owner: Person B. Ported onto Person A's foundation by Person C — Azure AI
Foundry only (no OpenAI), and /confirm writes through A's own
`TransactionCreate` model straight into the shared `transactions` table
(signed amount, `date`, `description`, closed category enum) rather than
B's original merchant/transaction_date/transaction_type shape, which doesn't
match that table.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import CurrentUser, get_current_user
from ..models import TransactionCreate
from ..models_budgets import ReceiptExtraction
from ..receipt_ai import extract_receipt
from ..supabase_client import db_for_user

router = APIRouter(prefix="/receipts", tags=["receipts"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("/scan", response_model=ReceiptExtraction)
async def scan_receipt(
    image: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP receipt image.")
    content = await image.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Receipt images must be 10 MB or smaller.")
    if not content:
        raise HTTPException(status_code=400, detail="The receipt image is empty.")

    extracted = await extract_receipt(content, image.content_type)
    return ReceiptExtraction.model_validate(extracted)


@router.post("/confirm", status_code=201)
def confirm_receipt(payload: TransactionCreate, user: CurrentUser = Depends(get_current_user)):
    # Receipts are always expenses — the frontend sends the scanned total as
    # a positive number for editing, then negates it before calling this
    # endpoint. Reject anything that arrives positive rather than guessing.
    if payload.amount > 0:
        raise HTTPException(
            status_code=400, detail="Receipt expenses must be a negative amount."
        )
    row = {
        "user_id": user.id,  # from the token, never from the body
        "amount": payload.amount,
        "date": payload.date.isoformat(),
        "category": payload.category,
        "description": payload.description,
    }
    rows = db_for_user(user).table("transactions").insert(row).execute().data
    return rows[0]
