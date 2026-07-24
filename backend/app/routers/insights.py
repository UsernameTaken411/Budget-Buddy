"""POST /api/insights/ask — free-text finance Q&A grounded in real data.

Owner: Person C. Follows the same pattern as B's routers (see SCHEMA.md §7):
get_current_user for auth, db_for_user for RLS-scoped Supabase access. Reads
transactions (A's table) and budgets (B's table, best-effort - it may not
exist yet) and computes everything deterministically before ever calling
the AI.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..azure_client import ask_azure_ai
from ..finance import compute_summary, generate_insights, spending_by_category
from ..supabase_client import db_for_user

router = APIRouter(prefix="/insights", tags=["insights"])

_TXN_SELECT = "id,user_id,amount,date,category,description,created_at"


@router.post("/ask")
def ask(payload: dict, user: CurrentUser = Depends(get_current_user)) -> dict:
    question = (payload or {}).get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    db = db_for_user(user)

    # Pull enough history for meaningful month-over-month comparison. 500 is
    # the API's max page size (SCHEMA.md §5.1) - fine for a hackathon demo
    # dataset (~237 seeded rows), would need real pagination beyond that.
    txn_resp = (
        db.table("transactions")
        .select(_TXN_SELECT)
        .order("date", desc=True)
        .limit(500)
        .execute()
    )
    transactions = txn_resp.data or []

    try:
        budget_resp = db.table("budgets").select("*").execute()
        budgets = budget_resp.data or []
    except Exception:
        # B's budgets table may not exist in this Supabase project yet.
        budgets = []

    summary = compute_summary(transactions)
    by_category = spending_by_category(transactions)
    rule_insights = generate_insights(transactions, budgets)

    context = {
        "summary": summary,
        "spending_by_category": by_category,
        "flagged_insights": rule_insights,
        "recent_transactions": transactions[:15],
    }

    try:
        answer = ask_azure_ai(question, context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"answer": answer, "context_used": context}
