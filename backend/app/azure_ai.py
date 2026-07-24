import json
import logging
from typing import Any

import httpx
from fastapi import HTTPException

from .config import get_settings

logger = logging.getLogger(__name__)


def _output_text(body: dict[str, Any]) -> str:
    if body.get("output_text"):
        return str(body["output_text"])
    for item in body.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                return str(content["text"])
    return ""


async def azure_json(
    *,
    system: str,
    prompt: str,
    schema_name: str,
    schema: dict[str, Any],
    max_output_tokens: int = 1800,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.is_azure_ai_configured:
        raise HTTPException(503, "Azure AI is not configured on the backend.")
    try:
        async with httpx.AsyncClient(timeout=75.0) as client:
            response = await client.post(
                settings.azure_ai_foundry_endpoint,
                headers={
                    "Authorization": f"Bearer {settings.azure_ai_foundry_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.azure_ai_foundry_model_deployment,
                    "input": [
                        {"role": "system", "content": [{"type": "input_text", "text": system}]},
                        {"role": "user", "content": [{"type": "input_text", "text": prompt}]},
                    ],
                    "max_output_tokens": max_output_tokens,
                    "reasoning": {"effort": "low"},
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": schema_name,
                            "strict": True,
                            "schema": schema,
                        }
                    },
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Could not reach Azure AI. Try again shortly.") from exc
    if response.is_error:
        logger.warning("Azure AI request failed: %s %s", response.status_code, response.text[:500])
        raise HTTPException(502, f"Azure AI request failed ({response.status_code}).")
    text = _output_text(response.json())
    try:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end < start:
            raise ValueError("No JSON response")
        return json.loads(text[start : end + 1])
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(502, "Azure AI returned an unreadable response.") from exc
