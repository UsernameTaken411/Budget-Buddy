from fastapi import APIRouter, HTTPException, status

from ..dependencies import AccessToken
from ..models import BudgetCreate, BudgetUpdate
from ..supabase import SupabaseREST

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("")
async def list_budgets(token: AccessToken):
    db = SupabaseREST(token)
    return await db.request(
        "GET",
        "budget_progress",
        params={"select": "*", "order": "category.asc"},
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_budget(payload: BudgetCreate, token: AccessToken):
    db = SupabaseREST(token)
    rows = await db.request(
        "POST",
        "budgets",
        json=payload.model_dump(mode="json"),
        prefer="return=representation",
    )
    return rows[0]


@router.patch("/{budget_id}")
async def update_budget(budget_id: str, payload: BudgetUpdate, token: AccessToken):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(400, "No changes supplied.")
    rows = await SupabaseREST(token).request(
        "PATCH",
        "budgets",
        params={"id": f"eq.{budget_id}"},
        json=changes,
        prefer="return=representation",
    )
    if not rows:
        raise HTTPException(404, "Budget not found.")
    return rows[0]


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(budget_id: str, token: AccessToken):
    await SupabaseREST(token).request(
        "DELETE", "budgets", params={"id": f"eq.{budget_id}"}
    )
