from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import budgets, insights, savings, subscriptions

app = FastAPI(title="Budget Buddy API", version="0.1.0")

try:
    origin = get_settings().frontend_origin
except Exception:
    origin = "http://localhost:5173"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(budgets.router, prefix="/api")
app.include_router(savings.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "healthy"}
