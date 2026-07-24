"""Supabase JWT signature verification for the AI insights endpoint.

The rest of the app (budgets/savings/subscriptions) forwards the caller's
bearer token straight to PostgREST and lets Supabase's own RLS reject bad
tokens. For /api/insights/ask we go one step further: since this endpoint
also talks to an external AI provider, we verify the token's signature
against Supabase's JWKS endpoint ourselves before trusting the claims
(user id, expiry) rather than relying solely on a downstream 401.
"""

from __future__ import annotations

import jwt
from fastapi import HTTPException
from jwt import PyJWKClient, InvalidTokenError

from .config import get_settings
from .dependencies import AccessToken

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        settings = get_settings()
        _jwks_client = PyJWKClient(settings.supabase_jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


class VerifiedUser:
    __slots__ = ("user_id", "access_token", "claims")

    def __init__(self, user_id: str, access_token: str, claims: dict):
        self.user_id = user_id
        self.access_token = access_token
        self.claims = claims


def verify_supabase_token(token: str) -> dict:
    client = _get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
    return claims


async def get_verified_user(token: AccessToken) -> VerifiedUser:
    claims = verify_supabase_token(token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    return VerifiedUser(user_id=user_id, access_token=token, claims=claims)
