"""Input sanitization to prevent NoSQL injection attacks."""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException


def safe_str(value: Any) -> str:
    """Ensure value is a plain string — reject dicts/lists (injection payloads)."""
    if isinstance(value, (dict, list)):
        raise HTTPException(status_code=400, detail="Invalid input: expected string")
    return str(value).strip()


def sanitize_value(value: Any) -> Any:
    """Recursively strip MongoDB operators from input."""
    if isinstance(value, dict):
        for key in value:
            if isinstance(key, str) and key.startswith("$"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid input: operator '{key}' not allowed",
                )
        return {k: sanitize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    return value
