"""GET/POST/PATCH/DELETE /api/budgets — category monthly limits with live
spend/remaining computed server-side by the `budget_progress` view.

Owner: Person B. Ported onto Person A's foundation by Person C — same
CurrentUser/db_for_user pattern as every other router (SCHEMA.md §7).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import CurrentUser, get_current_user
from ..models_budgets import BudgetCreate, BudgetUpdate
from ..supabase_client import db_for_user

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("")
def list_budgets(user: CurrentUser = Depends(get_current_user)):
    return (
        db_for_user(user)
        .table("budget_progress")
        .select("*")
        .order("category")
        .execute()
        .data
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_budget(payload: BudgetCreate, user: CurrentUser = Depends(get_current_user)):
    row = {**payload.model_dump(mode="json"), "user_id": user.id}  # from the token, never from the body
    rows = (
        db_for_user(user)
        .table("budgets")
        .insert(row)
        .execute()
        .data
    )
    return rows[0]


@router.patch("/{budget_id}")
def update_budget(
    budget_id: str, payload: BudgetUpdate, user: CurrentUser = Depends(get_current_user)
):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied.")
    rows = (
        db_for_user(user)
        .table("budgets")
        .update(changes)
        .eq("id", budget_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return rows[0]


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: str, user: CurrentUser = Depends(get_current_user)):
    db_for_user(user).table("budgets").delete().eq("id", budget_id).execute()
