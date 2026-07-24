import httpx
from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..dependencies import AccessToken
from ..models import ProfileUpdate
from ..supabase import SupabaseREST

router = APIRouter(prefix="/profile", tags=["profile"])


async def _current_user(token: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
        )
    if response.is_error:
        raise HTTPException(401, "Session is invalid or expired.")
    return response.json()


@router.get("")
async def get_profile(token: AccessToken):
    user = await _current_user(token)
    db = SupabaseREST(token)
    rows = await db.request("GET", "profiles", params={"id": f"eq.{user['id']}", "select": "*"})
    if rows:
        return rows[0]
    profile = {
        "id": user["id"],
        "display_name": (user.get("user_metadata") or {}).get("display_name")
        or (user.get("email") or "User").split("@")[0],
        "currency": "SGD",
    }
    created = await db.request("POST", "profiles", json=profile, prefer="return=representation")
    return created[0]


@router.patch("")
async def update_profile(payload: ProfileUpdate, token: AccessToken):
    user = await _current_user(token)
    rows = await SupabaseREST(token).request(
        "PATCH", "profiles", params={"id": f"eq.{user['id']}"},
        json=payload.model_dump(exclude_none=True), prefer="return=representation",
    )
    if not rows:
        raise HTTPException(404, "Profile not found.")
    return rows[0]
