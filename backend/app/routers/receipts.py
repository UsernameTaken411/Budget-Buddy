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

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import ValidationError

from ..auth import CurrentUser, get_current_user
from ..models import TransactionCreate
from ..models_budgets import ReceiptExtraction
from ..receipt_ai import extract_receipt
from ..supabase_client import db_for_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/receipts", tags=["receipts"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024

# Below this, Azure has effectively said "I'm guessing" (e.g. a screenshot or
# a photo with no visible total) — the real-world example that motivated this
# was a screenshot of a webpage scoring 0.05. Treat that the same as an
# unreadable photo instead of handing the UI a fabricated $0.02 "expense" to
# review, so bogus non-receipt images get "try a clearer photo" too.
MIN_CONFIDENCE = 0.3
UNREADABLE_DETAIL = "Azure AI could not read this receipt. Try a clearer photo."


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
    try:
        result = ReceiptExtraction.model_validate(extracted)
    except ValidationError as exc:
        # Azure's JSON schema constrains types but not precision, so it can
        # still hand back e.g. amount=0.0123 (3 decimal places) and blow up
        # Decimal's decimal_places=2 constraint here. That used to leak the
        # raw pydantic ValidationError text straight to the UI.
        logger.warning("Receipt extraction failed validation: %s", exc)
        raise HTTPException(status_code=502, detail=UNREADABLE_DETAIL) from exc

    if result.confidence < MIN_CONFIDENCE:
        raise HTTPException(status_code=502, detail=UNREADABLE_DETAIL)

    return result


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
