"""/api/profile — SCHEMA.md §5.3. P2 priority, small surface.

Owner: Person A.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..models import Profile, ProfileUpdate
from ..supabase_client import db_for_user

router = APIRouter(prefix="/profile", tags=["profile"])

_SELECT = "id,display_name,currency,created_at"


def _ensure_profile(db, user: CurrentUser) -> dict:
    """Profiles are created lazily on first read rather than by a DB trigger —
    one less thing to debug at 3am if the trigger doesn't fire."""
    resp = db.table("profiles").select(_SELECT).eq("id", user.id).limit(1).execute()
    if resp.data:
        return resp.data[0]

    display_name = (user.claims.get("user_metadata") or {}).get("display_name") or ""
    if not display_name and user.email:
        display_name = user.email.split("@")[0]

    created = (
        db.table("profiles")
        .insert(
            {
                "id": user.id,
                "user_id": user.id,
                "display_name": display_name,
                "currency": "SGD",
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create profile.")
    return created.data[0]


@router.get("", response_model=Profile)
def get_profile(user: CurrentUser = Depends(get_current_user)) -> Profile:
    db = db_for_user(user)
    return Profile(**_ensure_profile(db, user))


@router.patch("", response_model=Profile)
def update_profile(
    payload: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> Profile:
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update.")

    db = db_for_user(user)
    _ensure_profile(db, user)

    resp = db.table("profiles").update(updates).eq("id", user.id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return Profile(**resp.data[0])
