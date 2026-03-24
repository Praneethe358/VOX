from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Header, HTTPException

from .config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, stored_value: str | None) -> bool:
    if not stored_value:
        return False
    if stored_value.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_value.encode("utf-8"))
        except ValueError:
            return False
    # SECURITY: reject non-bcrypt passwords — never compare plaintext
    return False


def create_token(payload: dict[str, Any], expires_hours: int = 8) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    token_payload = {
        **payload,
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }
    return jwt.encode(token_payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    return payload


def get_auth_payload(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.split(" ", 1)[1].strip()
    return decode_token(token)


def require_admin_jwt(authorization: str = Header(..., alias="Authorization")) -> dict[str, Any]:
    """FastAPI dependency: validates JWT and ensures admin/superadmin role."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    payload = decode_token(authorization.split(" ", 1)[1].strip())
    if payload.get("role") not in ("admin", "superadmin", "super-admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def require_student_jwt(authorization: str = Header(..., alias="Authorization")) -> dict[str, Any]:
    """FastAPI dependency: validates JWT and ensures student role."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    payload = decode_token(authorization.split(" ", 1)[1].strip())
    if payload.get("role") not in ("student",):
        raise HTTPException(status_code=403, detail="Student access required")
    return payload


def require_roles(*roles: str):
    def dependency(payload: dict[str, Any] = Header(default=None, alias="Authorization")) -> dict[str, Any]:
        auth_payload = get_auth_payload(payload)
        role = auth_payload.get("role")
        if roles and role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return auth_payload

    return dependency
