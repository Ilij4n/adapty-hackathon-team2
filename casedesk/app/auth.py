"""Identity for end users (HMAC of customer_user_id) and the developer console token."""
from __future__ import annotations

import hashlib
import hmac
import ipaddress
import os
import secrets

from fastapi import Header, HTTPException, Request


def demo_mode() -> bool:
    return os.environ.get("CASEDESK_DEMO", "").strip().lower() in ("1", "true", "yes")


DEMO_SIGNING_SECRET = "casedesk-demo-signing-secret"
DEMO_CONSOLE_TOKEN = "demo-console"


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes")


def public_mode() -> bool:
    """CASEDESK_PUBLIC=1: reachable from the internet. Real secrets required, no console auto-cookie."""
    return _flag("CASEDESK_PUBLIC")


def check_public_config() -> None:
    """Refuse to start a public instance with missing or built-in default secrets."""
    if not public_mode():
        return
    problems = []
    if os.environ.get("APP_SIGNING_SECRET", "") in ("", DEMO_SIGNING_SECRET):
        problems.append("APP_SIGNING_SECRET is unset or the built-in demo default")
    if os.environ.get("CONSOLE_TOKEN", "") in ("", DEMO_CONSOLE_TOKEN):
        problems.append("CONSOLE_TOKEN is unset or the built-in demo default")
    if problems:
        raise RuntimeError("CASEDESK_PUBLIC=1 but " + "; ".join(problems) + ". Set real values.")


# Loopback is checked separately. Python's `is_private` also covers documentation/reserved ranges, so be explicit.
_LAN_NETS = [ipaddress.ip_network(n) for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16",
                                               "100.64.0.0/10", "fc00::/7", "fe80::/10")]


def console_autocookie_allowed(client_host: str | None) -> bool:
    """May GET /console pre-authorise this browser? Only in demo mode, never when public, and only for loopback /
    private-LAN clients unless CASEDESK_CONSOLE_AUTOCOOKIE=1 says so explicitly."""
    if not demo_mode() or public_mode():
        return False
    if _flag("CASEDESK_CONSOLE_AUTOCOOKIE"):
        return True
    try:
        ip = ipaddress.ip_address((client_host or "").split("%")[0])
    except ValueError:
        return client_host == "testclient"  # Starlette's TestClient
    if getattr(ip, "ipv4_mapped", None):
        ip = ip.ipv4_mapped
    return ip.is_loopback or any(ip in net for net in _LAN_NETS if net.version == ip.version)


def _secret() -> bytes:
    s = os.environ.get("APP_SIGNING_SECRET", "")
    if not s and demo_mode() and not public_mode():
        s = DEMO_SIGNING_SECRET
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
    if not tok and demo_mode() and not public_mode():
        tok = DEMO_CONSOLE_TOKEN
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
