from collections import defaultdict

from fastapi import APIRouter, HTTPException

from ..dependencies import AccessToken
from ..supabase import SupabaseREST

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/ask")
async def ask_insights(payload: dict, token: AccessToken):
    question = str(payload.get("question", "")).strip()
    if not question:
        raise HTTPException(400, "Question is required.")
    db = SupabaseREST(token)
    transactions = await db.request(
        "GET", "transactions",
        params={"select": "*", "order": "transaction_date.desc", "limit": "500"},
    )
    budgets = await db.request("GET", "budget_progress", params={"select": "*"})
    income = sum(float(t["amount"]) for t in transactions if t["transaction_type"] == "income")
    expenses = sum(float(t["amount"]) for t in transactions if t["transaction_type"] == "expense")
    by_category: dict[str, float] = defaultdict(float)
    for transaction in transactions:
        if transaction["transaction_type"] == "expense":
            by_category[transaction["category"]] += float(transaction["amount"])
    top = max(by_category.items(), key=lambda item: item[1], default=("None", 0))
    over = [b for b in budgets if float(b.get("spent", 0)) > float(b["amount"])]
    lowered = question.lower()
    if any(word in lowered for word in ("hello", "hi", "hey")):
        answer = "Hi! Ask me about your spending, balance, largest category, or budgets."
    elif "budget" in lowered:
        answer = (
            "You are over budget in "
            + ", ".join(f"{b['category']} by ${float(b['spent']) - float(b['amount']):.2f}" for b in over)
            + "."
            if over else "You are currently within all of your configured budgets."
        )
    elif any(word in lowered for word in ("category", "most", "largest")):
        answer = f"Your largest expense category is {top[0]} at ${top[1]:.2f}."
    elif any(word in lowered for word in ("balance", "left", "afford")):
        answer = f"Your recorded income is ${income:.2f}, expenses are ${expenses:.2f}, leaving ${income - expenses:.2f}."
    else:
        answer = f"You have recorded ${expenses:.2f} in expenses across {len(transactions)} transactions."
    return {"answer": answer}
