"""Per-request Supabase client, scoped to the caller so RLS still applies.

Owner: Person A.

    from app.auth import CurrentUser, get_current_user
    from app.supabase_client import db_for_user

    @router.get("/budgets")
    def list_budgets(user: CurrentUser = Depends(get_current_user)):
        return db_for_user(user).table("budgets").select("*").execute().data

Why not a single module-level client with the service-role key? Because the
service-role key bypasses every RLS policy in SCHEMA.md §6. One careless query
and user A sees user B's transactions on the demo screen. Using the anon key
plus the caller's own JWT means the database enforces isolation for us, and a
missing `.eq("user_id", ...)` is a non-event instead of a data leak.

Do not add a service-role client to this file without talking to A first.
"""

from __future__ import annotations

import os

from supabase import Client, create_client

from .auth import CurrentUser

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]


def db_for_user(user: CurrentUser) -> Client:
    """A client that acts as `user`. RLS is enforced; auth.uid() == user.id."""
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(user.token)
    return client
