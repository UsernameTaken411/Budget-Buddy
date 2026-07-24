import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ..dependencies import AccessToken
from ..models import TransactionCreate, TransactionUpdate
from ..supabase import SupabaseREST

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(token: AccessToken):
    return await SupabaseREST(token).request(
        "GET", "transactions",
        params={"select": "*", "order": "transaction_date.desc,created_at.desc"},
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(payload: TransactionCreate, token: AccessToken):
    data = payload.model_dump(mode="json")
    data["transaction_date"] = data["transaction_date"] or date.today().isoformat()
    rows = await SupabaseREST(token).request(
        "POST", "transactions", json=data | {"source": "manual"},
        prefer="return=representation",
    )
    return rows[0]


@router.patch("/{transaction_id}")
async def update_transaction(transaction_id: str, payload: TransactionUpdate, token: AccessToken):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(400, "No changes supplied.")
    rows = await SupabaseREST(token).request(
        "PATCH", "transactions", params={"id": f"eq.{transaction_id}"},
        json=changes, prefer="return=representation",
    )
    if not rows:
        raise HTTPException(404, "Transaction not found.")
    return rows[0]


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: str, token: AccessToken):
    await SupabaseREST(token).request(
        "DELETE", "transactions", params={"id": f"eq.{transaction_id}"}
    )


@router.post("/import")
async def import_transactions(token: AccessToken, file: UploadFile = File(...)):
    raw = await file.read()
    if not raw or len(raw) > 5_000_000:
        raise HTTPException(400, "CSV must be between 1 byte and 5 MB.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    inserted, errors = [], []
    for row_number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            amount = Decimal(str(row.get("amount", "")).replace(",", "").strip())
            kind = (row.get("transaction_type") or ("expense" if amount < 0 else "income")).lower()
            inserted.append({
                "merchant": (row.get("merchant") or row.get("description") or "Imported").strip()[:120],
                "amount": str(abs(amount)),
                "category": (row.get("category") or "Other").strip()[:80],
                "transaction_type": kind,
                "transaction_date": (row.get("transaction_date") or row.get("date") or date.today().isoformat()).strip(),
                "currency": (row.get("currency") or "SGD").strip().upper()[:3],
                "notes": (row.get("notes") or "").strip()[:500],
                "source": "csv",
            })
        except (InvalidOperation, AttributeError, ValueError):
            errors.append({"row": row_number, "message": "Invalid transaction row."})
    if inserted:
        await SupabaseREST(token).request("POST", "transactions", json=inserted)
    return {"imported": len(inserted), "skipped": 0, "errors": errors, "detected_format": "generic"}
