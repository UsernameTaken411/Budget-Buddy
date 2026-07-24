"""GET/POST/PATCH/DELETE /api/subscriptions — recurring charges with
monthly-normalized cost computed server-side by `subscription_costs`.

Owner: Person B. Ported onto Person A's foundation by Person C.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import CurrentUser, get_current_user
from ..models_budgets import SubscriptionCreate, SubscriptionUpdate
from ..supabase_client import db_for_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
def list_subscriptions(user: CurrentUser = Depends(get_current_user)):
    return (
        db_for_user(user)
        .table("subscription_costs")
        .select("*")
        .order("next_billing_date")
        .execute()
        .data
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate, user: CurrentUser = Depends(get_current_user)
):
    row = {**payload.model_dump(mode="json"), "user_id": user.id}  # from the token, never from the body
    rows = (
        db_for_user(user)
        .table("subscriptions")
        .insert(row)
        .execute()
        .data
    )
    return rows[0]


@router.patch("/{subscription_id}")
def update_subscription(
    subscription_id: str,
    payload: SubscriptionUpdate,
    user: CurrentUser = Depends(get_current_user),
):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied.")
    rows = (
        db_for_user(user)
        .table("subscriptions")
        .update(changes)
        .eq("id", subscription_id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    return rows[0]


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(subscription_id: str, user: CurrentUser = Depends(get_current_user)):
    db_for_user(user).table("subscriptions").delete().eq("id", subscription_id).execute()
