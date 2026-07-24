from fastapi import APIRouter, HTTPException, status

from ..dependencies import AccessToken
from ..models import ContributionCreate, SavingsGoalCreate, SavingsGoalUpdate
from ..supabase import SupabaseREST

router = APIRouter(prefix="/savings-goals", tags=["savings"])


@router.get("")
async def list_goals(token: AccessToken):
    return await SupabaseREST(token).request(
        "GET", "savings_goal_progress", params={"select": "*", "order": "created_at.desc"}
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(payload: SavingsGoalCreate, token: AccessToken):
    rows = await SupabaseREST(token).request(
        "POST",
        "savings_goals",
        json=payload.model_dump(mode="json"),
        prefer="return=representation",
    )
    return rows[0]


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, payload: SavingsGoalUpdate, token: AccessToken):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(400, "No changes supplied.")
    rows = await SupabaseREST(token).request(
        "PATCH",
        "savings_goals",
        params={"id": f"eq.{goal_id}"},
        json=changes,
        prefer="return=representation",
    )
    if not rows:
        raise HTTPException(404, "Savings goal not found.")
    return rows[0]


@router.post("/{goal_id}/contributions")
async def contribute(goal_id: str, payload: ContributionCreate, token: AccessToken):
    db = SupabaseREST(token)
    rows = await db.request(
        "GET", "savings_goals", params={"id": f"eq.{goal_id}", "select": "current_amount"}
    )
    if not rows:
        raise HTTPException(404, "Savings goal not found.")
    new_amount = float(rows[0]["current_amount"]) + float(payload.amount)
    updated = await db.request(
        "PATCH",
        "savings_goals",
        params={"id": f"eq.{goal_id}"},
        json={"current_amount": new_amount},
        prefer="return=representation",
    )
    return updated[0]


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, token: AccessToken):
    await SupabaseREST(token).request(
        "DELETE", "savings_goals", params={"id": f"eq.{goal_id}"}
    )
