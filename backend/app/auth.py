"""Supabase JWT verification for FastAPI.

Owner: Person A. B and C: the entire integration surface is one line —

    from app.auth import CurrentUser, get_current_user

    @router.get("/budgets")
    def list_budgets(user: CurrentUser = Depends(get_current_user)):
        return db_for_user(user).table("budgets").select("*").execute().data

Never read user_id from a request body. It comes from the token, always.

Supports both Supabase signing modes:
  * HS256 with the legacy JWT secret  -> set SUPABASE_JWT_SECRET
  * RS256/ES256 with the new JWKS     -> set SUPABASE_JWKS_URL (preferred)
If both are set, JWKS wins.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
JWKS_URL = os.environ.get("SUPABASE_JWKS_URL") or (
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else None
)
EXPECTED_AUDIENCE = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated")

_bearer = HTTPBearer(auto_error=False)

_jwks_cache: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 600


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated caller. `id` is the Postgres auth.uid()."""

    id: str
    email: str | None
    token: str
    claims: dict[str, Any]


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _get_jwks() -> dict[str, Any]:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    if not JWKS_URL:
        raise _unauthorized("Server auth is not configured.")

    try:
        resp = httpx.get(JWKS_URL, timeout=5.0)
        resp.raise_for_status()
    except httpx.HTTPError as exc:  # pragma: no cover
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]  # serve stale rather than 500 mid-demo
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the auth key server.",
        ) from exc

    _jwks_cache["keys"] = resp.json()
    _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


def _decode(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise _unauthorized("Malformed token.") from exc

    alg = header.get("alg", "")

    if alg.startswith("HS"):
        if not JWT_SECRET:
            raise _unauthorized("Server auth is not configured for HS256.")
        key: Any = JWT_SECRET
    else:
        kid = header.get("kid")
        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # Key may have rotated since we cached — force one refresh.
            _jwks_cache["fetched_at"] = 0.0
            jwks = _get_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise _unauthorized("Unknown signing key.")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience=EXPECTED_AUDIENCE,
            options={"verify_aud": True},
        )
    except JWTError as exc:
        # python-jose raises the same class for expiry and tampering; the message
        # distinguishes them well enough for a useful client error.
        msg = str(exc).lower()
        if "expire" in msg:
            raise _unauthorized("Session expired. Please sign in again.") from exc
        raise _unauthorized("Invalid token.") from exc


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    if creds is None or not creds.credentials:
        raise _unauthorized("Missing bearer token.")

    claims = _decode(creds.credentials)

    user_id = claims.get("sub")
    if not user_id:
        raise _unauthorized("Token has no subject.")

    return CurrentUser(
        id=user_id,
        email=claims.get("email"),
        token=creds.credentials,
        claims=claims,
    )
