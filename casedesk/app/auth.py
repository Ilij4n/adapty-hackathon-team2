"""Identity for end users (HMAC of customer_user_id) and the developer console token."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets

from fastapi import Header, HTTPException, Request


def demo_mode() -> bool:
    return os.environ.get("CASEDESK_DEMO", "").strip().lower() in ("1", "true", "yes")


def _secret() -> bytes:
    s = os.environ.get("APP_SIGNING_SECRET", "")
    if not s and demo_mode():
        s = "casedesk-demo-signing-secret"
    return s.encode()


def sign(customer_user_id: str, secret: str | None = None) -> str:
    """What the host app's backend computes: hex HMAC-SHA256(APP_SIGNING_SECRET, customer_user_id)."""
    key = secret.encode() if secret is not None else _secret()
    return hmac.new(key, customer_user_id.encode(), hashlib.sha256).hexdigest()


def valid_user_id(customer_user_id: str | None) -> bool:
    """Printable ASCII only: it travels to Adapty in an HTTP header (non-ASCII or CR/LF cannot be sent)."""
    return bool(customer_user_id) and all(" " <= ch <= "~" for ch in customer_user_id)


def verify(customer_user_id: str, signature: str | None) -> bool:
    if not valid_user_id(customer_user_id):
        return False
    key = _secret()
    if signature and key and signature.isascii():  # compare_digest raises TypeError on non-ASCII str
        if hmac.compare_digest(sign(customer_user_id, key.decode()), signature.strip().lower()):
            return True
    # Demo mode: the profile picker sends no signature; accepted only for demo users (checked by the caller).
    return False


def console_token() -> str:
    tok = os.environ.get("CONSOLE_TOKEN", "")
    if not tok and demo_mode():
        tok = "demo-console"
    return tok


def mask(secret: str | None) -> str:
    """For logs: never print a whole key."""
    if not secret:
        return "<unset>"
    return secret[:4] + "…" + f"({len(secret)} chars)"


def require_console(request: Request, authorization: str | None = Header(default=None),
                    x_console_token: str | None = Header(default=None)) -> None:
    expected = console_token()
    given = x_console_token
    if not given and authorization and authorization.lower().startswith("bearer "):
        given = authorization[7:]
    if not given:
        given = request.cookies.get("casedesk_console")
    if not expected or not given or not secrets.compare_digest(given.strip(), expected):
        raise HTTPException(status_code=401, detail="Console token required (header X-Console-Token).")
