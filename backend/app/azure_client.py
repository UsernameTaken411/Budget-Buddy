"""Client for Azure AI Foundry's OpenAI-compatible v1 Responses API.

Owner: Person C. Sync, like the rest of this codebase (routers here are
plain `def`, not `async def`, since supabase-py's client is sync too).

The model explains and answers in natural language using numbers already
computed deterministically in finance.py - it's told explicitly not to
invent or recompute figures itself.
"""

from __future__ import annotations

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are Budget Buddy, a friendly personal finance assistant inside a budgeting app. "
    "If the user is just making small talk (greetings, asking your name, etc.), reply briefly "
    "and warmly in one plain sentence, with no headings or bullets - do not dump financial data "
    "into a casual message. "
    "When the user asks a finance question, ground every number you mention in the CONTEXT "
    "block you are given - it contains the user's real, already-calculated figures. Never invent "
    "or recompute numbers yourself; treat the provided arithmetic as correct. Remember expenses "
    "are already reported as positive spend amounts in the context, already sign-corrected for you. "
    "You are not a licensed financial advisor: describe what you observe and the options "
    "available, rather than issuing definitive directives like 'you should invest in X'. "
    "Format every non-trivial answer in lightweight markdown so it renders cleanly in a chat UI: "
    "a short '## Heading' above each section, '-' for bullet points, and '**bold**' only around "
    "key numbers or labels. Never use tables, code blocks, or nested/multi-level lists. Be concise "
    "- lead with the 2-3 most useful points rather than an exhaustive list, and keep the whole "
    "reply under roughly 600 tokens."
)

# NOT the same as the "~600 tokens" guidance baked into SYSTEM_PROMPT above.
# On Azure AI Foundry, reasoning-capable deployments spend hidden reasoning
# tokens out of this same budget before writing any visible text — a tight
# cap here can silently consume the whole budget on reasoning and leave
# output_text empty. Keep this generous; let the prompt's own wording shape
# how long the visible answer actually is.
MAX_OUTPUT_TOKENS = 1500


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
        "max_output_tokens": MAX_OUTPUT_TOKENS,
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

    # No text anywhere in the response. Log exactly what Azure sent back so
    # the real cause shows up in the backend terminal instead of us guessing
    # from the frontend's generic fallback message.
    status = data.get("status")
    reason = (data.get("incomplete_details") or {}).get("reason")
    output_types = [item.get("type") for item in data.get("output", [])]
    logger.warning(
        "Azure AI response had no output_text — status=%r incomplete_reason=%r "
        "output_item_types=%r usage=%r",
        status,
        reason,
        output_types,
        data.get("usage"),
    )

    if status == "incomplete" and reason == "max_output_tokens":
        return (
            "That answer ran out of room before finishing. Try asking a narrower "
            "question, or let us know so we can raise the response limit."
        )
    return "Sorry, I couldn't generate a response just now."
