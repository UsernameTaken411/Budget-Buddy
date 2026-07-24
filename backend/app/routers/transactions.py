"""/api/transactions — SCHEMA.md §5.1 and §5.2.

B's budget-vs-actual and C's dashboard aggregation both call GET here. The
response shape is a published contract: {items, total, limit, offset}, items
never null. Do not change it without announcing.

Owner: Person A.
"""

from __future__ import annotations

from datetime import date as Date
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)

from ..auth import CurrentUser, get_current_user
from ..importers import dbs, generic
from ..models import (
    ImportError_,
    ImportResult,
    Transaction,
    TransactionCreate,
    TransactionPage,
    TransactionUpdate,
)
from ..supabase_client import db_for_user

router = APIRouter(prefix="/transactions", tags=["transactions"])

_SELECT = "id,user_id,amount,date,category,description,created_at"


@router.get("", response_model=TransactionPage)
def list_transactions(
    user: CurrentUser = Depends(get_current_user),
    start_date: Date | None = Query(None, description="inclusive"),
    end_date: Date | None = Query(None, description="inclusive"),
    category: list[str] | None = Query(None, description="repeatable; OR'd"),
    q: str | None = Query(None, description="substring on description"),
    min_amount: float | None = Query(None),
    max_amount: float | None = Query(None),
    sort: Literal["date", "amount", "created_at"] = "date",
    order: Literal["asc", "desc"] = "desc",
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> TransactionPage:
    db = db_for_user(user)

    # count="exact" gives us `total` after filters but before pagination —
    # C needs it for "showing 50 of 428", B needs it to know when to stop paging.
    query = db.table("transactions").select(_SELECT, count="exact")

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())
    if category:
        query = query.in_("category", category)
    if q:
        # PostgREST needs * as the wildcard, and , breaks the filter grammar.
        safe = q.replace(",", " ").strip()
        if safe:
            query = query.ilike("description", f"*{safe}*")
    if min_amount is not None:
        query = query.gte("amount", min_amount)
    if max_amount is not None:
        query = query.lte("amount", max_amount)

    desc = order == "desc"
    query = query.order(sort, desc=desc)
    # Stable tiebreak so pagination can't drop or repeat a row.
    if sort != "created_at":
        query = query.order("created_at", desc=True)
    query = query.order("id", desc=True)

    resp = query.range(offset, offset + limit - 1).execute()

    return TransactionPage(
        items=[Transaction(**row) for row in (resp.data or [])],
        total=resp.count if resp.count is not None else len(resp.data or []),
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    user: CurrentUser = Depends(get_current_user),
) -> Transaction:
    db = db_for_user(user)
    row = {
        "user_id": user.id,  # from the token, never from the body
        "amount": payload.amount,
        "date": payload.date.isoformat(),
        "category": payload.category,
        "description": payload.description,
    }
    resp = db.table("transactions").insert(row).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Insert failed.")
    return Transaction(**resp.data[0])


@router.patch("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> Transaction:
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update.")
    if "date" in updates:
        updates["date"] = updates["date"].isoformat()

    db = db_for_user(user)
    resp = db.table("transactions").update(updates).eq("id", transaction_id).execute()
    if not resp.data:
        # RLS makes another user's row invisible, so this is also the
        # "not yours" case — 404 rather than 403, per SCHEMA.md §5.
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return Transaction(**resp.data[0])


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_transaction(
    transaction_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    db = db_for_user(user)
    resp = db.table("transactions").delete().eq("id", transaction_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    # 204 must carry no body — return the Response explicitly rather than None.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/import", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
) -> ImportResult:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(raw) > 5_000_000:
        raise HTTPException(status_code=400, detail="File too large (5MB max).")

    # Bank exports are frequently UTF-8 with BOM, occasionally latin-1.
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="replace")

    detected: str = "generic"
    if dbs.detect(text):
        detected = "dbs_posb"
        try:
            text = dbs.normalize(text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        rows, row_errors = generic.parse_rows(text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    errors = [ImportError_(row=e.row, message=e.message) for e in row_errors]

    if not rows:
        return ImportResult(
            imported=0, skipped=0, errors=errors, detected_format=detected
        )

    db = db_for_user(user)

    # Dedupe on (date, amount, description) within the user's existing rows.
    # Only fetch the date window this file covers, so a big account stays fast.
    dates = [r.date for r in rows]
    existing_resp = (
        db.table("transactions")
        .select("date,amount,description")
        .gte("date", min(dates).isoformat())
        .lte("date", max(dates).isoformat())
        .limit(5000)
        .execute()
    )
    existing = {
        (r["date"], round(float(r["amount"]), 2), (r["description"] or "").strip())
        for r in (existing_resp.data or [])
    }

    to_insert = []
    skipped = 0
    seen_in_file: set[tuple] = set()

    for r in rows:
        key = (r.date.isoformat(), round(r.amount, 2), r.description.strip())
        if key in existing or key in seen_in_file:
            skipped += 1
            continue
        seen_in_file.add(key)
        to_insert.append(
            {
                "user_id": user.id,
                "amount": r.amount,
                "date": r.date.isoformat(),
                "category": r.category,
                "description": r.description,
            }
        )

    imported = 0
    for i in range(0, len(to_insert), 500):
        chunk = to_insert[i : i + 500]
        resp = db.table("transactions").insert(chunk).execute()
        imported += len(resp.data or [])

    return ImportResult(
        imported=imported,
        skipped=skipped,
        errors=errors,
        detected_format=detected,
    )
