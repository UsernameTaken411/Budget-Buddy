from fastapi import APIRouter, HTTPException, status

from ..dependencies import AccessToken
from ..models import SubscriptionCreate, SubscriptionUpdate
from ..supabase import SupabaseREST

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
async def list_subscriptions(token: AccessToken):
    return await SupabaseREST(token).request(
        "GET",
        "subscription_costs",
        params={"select": "*", "order": "next_billing_date.asc"},
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_subscription(payload: SubscriptionCreate, token: AccessToken):
    rows = await SupabaseREST(token).request(
        "POST",
        "subscriptions",
        json=payload.model_dump(mode="json"),
        prefer="return=representation",
    )
    return rows[0]


@router.patch("/{subscription_id}")
async def update_subscription(
    subscription_id: str, payload: SubscriptionUpdate, token: AccessToken
):
    changes = payload.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(400, "No changes supplied.")
    rows = await SupabaseREST(token).request(
        "PATCH",
        "subscriptions",
        params={"id": f"eq.{subscription_id}"},
        json=changes,
        prefer="return=representation",
    )
    if not rows:
        raise HTTPException(404, "Subscription not found.")
    return rows[0]


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(subscription_id: str, token: AccessToken):
    await SupabaseREST(token).request(
        "DELETE", "subscriptions", params={"id": f"eq.{subscription_id}"}
    )
