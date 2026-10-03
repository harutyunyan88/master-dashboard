"""Single app password -> stateless HMAC-signed token. No database needed."""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import Settings, get_settings

TOKEN_TTL_SECONDS = 30 * 24 * 3600

_bearer = HTTPBearer(auto_error=False)


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(secret: str, now: float | None = None) -> str:
    exp = int((now or time.time()) + TOKEN_TTL_SECONDS)
    payload = base64.urlsafe_b64encode(json.dumps({"exp": exp}).encode()).decode()
    return f"{payload}.{_sign(payload, secret)}"


def verify_token(token: str, secret: str, now: float | None = None) -> bool:
    try:
        payload, signature = token.split(".", 1)
        if not hmac.compare_digest(signature, _sign(payload, secret)):
            return False
        exp = json.loads(base64.urlsafe_b64decode(payload))["exp"]
    except (ValueError, KeyError, TypeError):
        return False
    return (now or time.time()) < exp


def check_password(password: str, settings: Settings) -> bool:
    if not settings.app_password:
        return False
    return hmac.compare_digest(password.encode(), settings.app_password.encode())


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    if not credentials or not settings.auth_secret or not verify_token(credentials.credentials, settings.auth_secret):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in")
