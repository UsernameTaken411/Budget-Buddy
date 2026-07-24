"""/api/auth — signup, login, refresh.

Team decision (see the shared secrets doc): the browser never talks to
Supabase directly. It calls these three endpoints, we call Supabase's own
Auth REST API using the anon key, and hand back whatever tokens Supabase
issues. The frontend stores them (frontend/src/services/authStorage.js,
under the key `budget_buddy_access_token`) and sends the access token as a
normal `Authorization: Bearer` header on every other /api/* call — verified
the usual way by app/auth.py. Nothing about get_current_user or
db_for_user changes.

Owner: Person A.
"""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException, status

from ..models import AuthResult, AuthUser, LoginBody, RefreshBody, SignupBody

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

router = APIRouter(prefix="/auth", tags=["auth"])


def _call_supabase_auth(path: str, payload: dict, params: dict | None = None) -> dict:
    """POST to Supabase's GoTrue API with the anon key. Never the service-role
    key — signup/login only ever need the anon key, same as SCHEMA.md §6
    requires for every other Supabase call in this backend."""
    try:
        resp = httpx.post(
            f"{SUPABASE_URL}/auth/v1/{path}",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            params=params,
            json=payload,
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the auth server.",
        ) from exc

    data = resp.json() if resp.content else {}

    if resp.status_code >= 400:
        detail = (
            data.get("error_description")
            or data.get("msg")
            or data.get("error")
            or "Authentication failed."
        )
        # Supabase answers client-side auth failures with a mix of
        # 400/422/429. Collapse the common ones to 401 so the frontend's
        # ApiError handling matches the rest of the API (SCHEMA.md §5.4).
        code = (
            status.HTTP_401_UNAUTHORIZED
            if resp.status_code in (400, 401, 422)
            else resp.status_code
        )
        raise HTTPException(status_code=code, detail=detail)

    return data


def _result_from_supabase(data: dict) -> AuthResult:
    """Supabase's shape varies by endpoint/version: login and refresh return
    the session fields flat; signup nests them under "session" (null if email
    confirmation is required, in which case only a bare user object comes
    back). Handle all three defensively rather than assume one exact shape.
    """
    session = data.get("session")

    if session and session.get("access_token"):
        token_data = session
        user = session.get("user") or data.get("user") or {}
    elif data.get("access_token"):
        token_data = data
        user = data.get("user") or {}
    else:
        user = data.get("user") or data
        return AuthResult(
            user=AuthUser(id=user.get("id", ""), email=user.get("email")),
            needs_confirmation=True,
        )

    return AuthResult(
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_at=token_data.get("expires_at"),
        user=AuthUser(id=user.get("id", ""), email=user.get("email")),
    )


@router.post("/signup", response_model=AuthResult, status_code=status.HTTP_201_CREATED)
def signup(body: SignupBody) -> AuthResult:
    data = _call_supabase_auth(
        "signup",
        {
            "email": body.email,
            "password": body.password,
            "data": {"display_name": body.display_name},
        },
    )
    return _result_from_supabase(data)


@router.post("/login", response_model=AuthResult)
def login(body: LoginBody) -> AuthResult:
    data = _call_supabase_auth(
        "token",
        {"email": body.email, "password": body.password},
        params={"grant_type": "password"},
    )
    return _result_from_supabase(data)


@router.post("/refresh", response_model=AuthResult)
def refresh(body: RefreshBody) -> AuthResult:
    data = _call_supabase_auth(
        "token",
        {"refresh_token": body.refresh_token},
        params={"grant_type": "refresh_token"},
    )
    return _result_from_supabase(data)
