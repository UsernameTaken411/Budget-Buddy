import httpx
from fastapi import APIRouter, HTTPException, status

from ..config import get_settings
from ..models import LoginBody, RefreshBody, SignupBody

router = APIRouter(prefix="/auth", tags=["auth"])


async def _request(path: str, payload: dict, grant_type: str | None = None):
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/{path}",
                headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
                params={"grant_type": grant_type} if grant_type else None,
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Could not reach authentication.") from exc
    body = response.json() if response.content else {}
    if response.is_error:
        raise HTTPException(
            401 if response.status_code in {400, 401, 422} else response.status_code,
            body.get("error_description") or body.get("msg") or "Authentication failed.",
        )
    return body


def _normalize(body: dict) -> dict:
    session = body.get("session") or body
    user = session.get("user") or body.get("user") or {}
    return {
        "access_token": session.get("access_token"),
        "refresh_token": session.get("refresh_token"),
        "expires_at": session.get("expires_at"),
        "user": {"id": user.get("id", ""), "email": user.get("email")},
        "needs_confirmation": not bool(session.get("access_token")),
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupBody):
    return _normalize(await _request("signup", {
        "email": payload.email,
        "password": payload.password,
        "data": {"display_name": payload.display_name},
    }))


@router.post("/login")
async def login(payload: LoginBody):
    return _normalize(await _request(
        "token", {"email": payload.email, "password": payload.password}, "password"
    ))


@router.post("/refresh")
async def refresh(payload: RefreshBody):
    return _normalize(await _request(
        "token", {"refresh_token": payload.refresh_token}, "refresh_token"
    ))
