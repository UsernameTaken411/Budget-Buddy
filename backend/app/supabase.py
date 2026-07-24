from typing import Any

import httpx
from fastapi import HTTPException

from .config import get_settings


class SupabaseREST:
    """Small PostgREST client that preserves the caller's RLS-scoped JWT."""

    def __init__(self, access_token: str):
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise HTTPException(
                status_code=503,
                detail="Database saving is not configured. Add the Supabase settings.",
            )
        self.base_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_anon_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json: Any = None,
        prefer: str | None = None,
    ) -> list[dict[str, Any]]:
        headers = self.headers | ({"Prefer": prefer} if prefer else {})
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(
                method,
                f"{self.base_url}/{table}",
                headers=headers,
                params=params,
                json=json,
            )
        if response.is_error:
            detail = response.json().get("message", "Database request failed.")
            raise HTTPException(status_code=response.status_code, detail=detail)
        if not response.content:
            return []
        return response.json()
