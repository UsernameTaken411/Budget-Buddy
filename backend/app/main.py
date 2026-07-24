"""FastAPI entrypoint.

Run locally:  uvicorn app.main:app --reload --port 8000
Docs:         http://localhost:8000/docs

B and C mount their routers here too — add one include_router line each,
under the comment below, so we don't fight over this file.

Owner: Person A.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

load_dotenv()  # must run before any module reads os.environ

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from .routers import auth, budgets, profile, receipts, savings, subscriptions, transactions  # noqa: E402

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Finance App API", version="1.0.0")


@app.middleware("http")
async def catch_unhandled_exceptions(request: Request, call_next):
    """Turn anything a route didn't convert to an HTTPException itself (a
    raised Supabase/postgrest error, a bad .env value, etc.) into a normal
    JSON 500 with the usual {"detail": ...} envelope (SCHEMA.md §5.4).

    This has to be a real middleware registered with `@app.middleware("http")`
    *before* `app.add_middleware(CORSMiddleware, ...)` below — not an
    `@app.exception_handler(Exception)`. Starlette special-cases handlers
    registered for the bare `Exception`/500 case: they get wired into
    ServerErrorMiddleware, which always sits *outermost*, above CORSMiddleware,
    no matter what. A response built there never passes back through
    CORSMiddleware, so it never gets an Access-Control-Allow-Origin header.
    The browser then reports the failure as "blocked by CORS policy" instead
    of a 500 — which looks like a CORS bug but isn't one, and hides the real
    error from whoever's looking at the Network tab instead of this terminal.

    Because `add_middleware` inserts each new middleware in front of the
    previous ones, whichever middleware is registered *first* in the file
    ends up nested *inside* the ones registered after it. Registering this
    before CORSMiddleware puts CORSMiddleware on the outside, so a response
    built in here still flows back out through it and gets the header
    attached. (Verified directly with curl: without this ordering the 500
    body is correct but the CORS header is missing; with it, both are
    present.)
    """
    try:
        return await call_next(request)
    except Exception as exc:  # noqa: BLE001 - this is the last-resort catch-all
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(exc).__name__}: {exc}"},
        )


# Comma-separated in the env so Azure can add the deployed origin without a
# code change. Vite dev server is the default.
_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

# --- B and C: add your routers here ---------------------------------------
app.include_router(budgets.router, prefix="/api")
app.include_router(savings.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(receipts.router, prefix="/api")
# app.include_router(insights.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    """Unauthenticated liveness check — Azure Container Apps probes this."""
    return {"status": "ok"}
