"""Client for Azure AI Foundry's OpenAI-compatible v1 Responses API.

The model explains and answers in natural language using numbers already
computed deterministically in finance.py - it's told explicitly not to
invent or recompute figures itself.
"""

from __future__ import annotations

import json

import httpx

from .config import get_settings

SYSTEM_PROMPT = (
    "You are Budget Buddy, a friendly personal finance assistant inside a budgeting app. "
    "If the user is just making small talk (greetings, asking your name, etc.), reply briefly "
    "and warmly - do not dump financial data into a casual message. "
    "When the user asks a finance question, ground every number you mention in the CONTEXT "
    "block you are given - it contains the user's real, already-calculated figures. Never invent "
    "or recompute numbers yourself; treat the provided arithmetic as correct. "
    "You are not a licensed financial advisor: describe what you observe and the options "
    "available, rather than issuing definitive directives like 'you should invest in X'."
)


async def ask_azure_ai(question: str, context: dict) -> str:
    settings = get_settings()
    if not settings.azure_ai_foundry_endpoint or not settings.azure_ai_foundry_api_key:
        raise RuntimeError(
            "Azure AI Foundry is not configured - set AZURE_AI_FOUNDRY_ENDPOINT and "
            "AZURE_AI_FOUNDRY_API_KEY in backend/.env"
        )

    url = f"{settings.azure_ai_foundry_endpoint.rstrip('/')}/openai/v1/responses"
    payload = {
        "model": settings.azure_ai_foundry_deployment,
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
    headers = {
        "api-key": settings.azure_ai_foundry_api_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
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
