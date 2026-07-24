"""Client for Azure AI Foundry's OpenAI-compatible v1 Responses API.

Owner: Person C. Sync, like the rest of this codebase (routers here are
plain `def`, not `async def`, since supabase-py's client is sync too).

The model explains and answers in natural language using numbers already
computed deterministically in finance.py - it's told explicitly not to
invent or recompute figures itself.
"""

from __future__ import annotations

import json
import os

import httpx

SYSTEM_PROMPT = (
    "You are Budget Buddy, a friendly personal finance assistant inside a budgeting app. "
    "If the user is just making small talk (greetings, asking your name, etc.), reply briefly "
    "and warmly - do not dump financial data into a casual message. "
    "When the user asks a finance question, ground every number you mention in the CONTEXT "
    "block you are given - it contains the user's real, already-calculated figures. Never invent "
    "or recompute numbers yourself; treat the provided arithmetic as correct. Remember expenses "
    "are already reported as positive spend amounts in the context, already sign-corrected for you. "
    "You are not a licensed financial advisor: describe what you observe and the options "
    "available, rather than issuing definitive directives like 'you should invest in X'."
)


def ask_azure_ai(question: str, context: dict) -> str:
    endpoint = os.environ.get("AZURE_AI_FOUNDRY_ENDPOINT", "")
    api_key = os.environ.get("AZURE_AI_FOUNDRY_API_KEY", "")
    deployment = os.environ.get("AZURE_AI_FOUNDRY_DEPLOYMENT", "")

    if not endpoint or not api_key:
        raise RuntimeError(
            "Azure AI Foundry is not configured - set AZURE_AI_FOUNDRY_ENDPOINT and "
            "AZURE_AI_FOUNDRY_API_KEY in backend/.env"
        )

    payload = {
        "model": deployment,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "CONTEXT (the user's real, already-calculated numbers):\n"
                    f"{json.dumps(context)}\n\n"
                    f"QUESTION: {question}"
                ),
            },
        ],
    }
    headers = {"api-key": api_key, "Content-Type": "application/json"}

    with httpx.Client(timeout=30) as client:
        resp = client.post(endpoint, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return _extract_text(data)


def _extract_text(data: dict) -> str:
    if data.get("output_text"):
        return data["output_text"]
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ("output_text", "text"):
                return content.get("text", "")
    return "Sorry, I couldn't generate a response just now."
