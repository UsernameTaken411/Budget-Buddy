"""FastAPI entrypoint.

Run locally:  uvicorn app.main:app --reload --port 8000
Docs:         http://localhost:8000/docs

B and C mount their routers here too — add one include_router line each,
under the comment below, so we don't fight over this file.

Owner: Person A.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()  # must run before any module reads os.environ

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .routers import auth, budgets, profile, receipts, savings, subscriptions, transactions  # noqa: E402

app = FastAPI(title="Finance App API", version="1.0.0")

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
