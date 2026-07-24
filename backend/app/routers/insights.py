import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from ..auth import VerifiedUser, get_verified_user
from ..azure_client import ask_azure_ai
from ..finance import compute_summary, generate_insights
from ..supabase import SupabaseREST

router = APIRouter(prefix="/insights", tags=["insights"])

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def _load_fixture(name: str) -> list[dict]:
    with open(FIXTURES_DIR / name) as f:
        return json.load(f)


async def _fetch_transactions(access_token: str) -> list[dict]:
    try:
        rows = await SupabaseREST(access_token).request(
            "GET",
            "transactions",
            params={"select": "*", "order": "transaction_date.desc"},
        )
        return rows or _load_fixture("transactions.json")
    except Exception:
        # Person A's transactions table may not exist/be reachable yet.
        return _load_fixture("transactions.json")


async def _fetch_budget_progress(access_token: str) -> list[dict]:
    try:
        rows = await SupabaseREST(access_token).request(
            "GET",
            "budget_progress",
            params={"select": "*", "order": "category.asc"},
        )
        return rows or _load_fixture("budgets.json")
    except Exception:
        return _load_fixture("budgets.json")


@router.post("/ask")
async def ask(payload: dict, user: VerifiedUser = Depends(get_verified_user)):
    question = (payload or {}).get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    transactions = await _fetch_transactions(user.access_token)
    budgets = await _fetch_budget_progress(user.access_token)

    summary = compute_summary(transactions)
    rule_insights = generate_insights(transactions, budgets)

    context = {
        "summary": summary,
        "budgets": budgets,
        "flagged_insights": rule_insights,
        "recent_transactions": transactions[:15],
    }

    try:
        answer = await ask_azure_ai(question, context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"answer": answer, "context_used": context}
