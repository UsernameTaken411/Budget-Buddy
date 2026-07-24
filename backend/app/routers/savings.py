"""GET/POST/PATCH /api/savings-goals + /api/savings-goals/{id}/contributions.

Owner: Person B. Ported onto Person A's foundation by Person C.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import CurrentUser, get_current_user
from ..models_budgets import ContributionCreate, SavingsGoalCreate, SavingsGoalUpdate
from ..supabase_client import db_for_user

router = APIRouter(prefix="/savings-goals", tags=["savings"])


@router.get("")
def list_goals(user: CurrentUser = Depends(get_current_user)):
    return (
        db_for_user(user)
        .table("savings_goal_progress")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_goal(payload: SavingsGoalCreate, user: CurrentUser = Depends(get_current_user)):
    rows = (
        db_for_user(user)
        .table("savings_goals")
        .insert(payload.model_dump(mode="json"))
        .execute()
        .data
    )
    return rows[0]


@router.patch("/{goal_id}")
def update_goal(
    goal_id: str, payload: SavingsGoalUpdate, user: CurrentUser = Depends(get_current_user)
):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied.")
    rows = (
        db_for_user(user)
        .table("savings_goals")
        .update(changes)
        .eq("id", goal_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Savings goal not found.")
    return rows[0]


@router.post("/{goal_id}/contributions")
def contribute(
    goal_id: str, payload: ContributionCreate, user: CurrentUser = Depends(get_current_user)
):
    db = db_for_user(user)
    rows = (
        db.table("savings_goals")
        .select("current_amount")
        .eq("id", goal_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Savings goal not found.")
    new_amount = float(rows[0]["current_amount"]) + float(payload.amount)
    updated = (
        db.table("savings_goals")
        .update({"current_amount": new_amount})
        .eq("id", goal_id)
        .execute()
        .data
    )
    return updated[0]


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: str, user: CurrentUser = Depends(get_current_user)):
    db_for_user(user).table("savings_goals").delete().eq("id", goal_id).execute()
