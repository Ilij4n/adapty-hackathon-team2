"""Mock of Adapty's server-side API v2 for the seeded Lumen users (same paths, headers, JSON shapes).

    uvicorn casedesk.adapty.mock_server:app --port 8090
    ADAPTY_API_BASE=http://127.0.0.1:8090 ADAPTY_SECRET_KEY=secret_live_demo ...

Data: data/profiles_raw.json.gz from seed_loader (env ADAPTY_PROFILES_RAW to override).
Auth: `Authorization: Api-Key <key>`; any non-empty key is accepted unless MOCK_ADAPTY_SECRET_KEY is set.
Grant/revoke mutate in-memory state, so a following GET /profile/ shows the change. POST /_mock/reset reloads.
"""
from __future__ import annotations

import copy
import os
import time
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .client import GRANT_PATH, GRANT_STORE, PROFILE_PATH, REVOKE_PATH, get_now, parse_dt
from .seed_loader import iso, load_raw

KNOWN_ACCESS_LEVELS = {"premium", "pro"}  # Lumen catalog (seed_adapty.py)


def _err(status: int, error_code: str, message: str, source: str | None = None) -> JSONResponse:
    # Documented ErrorResponse shape (getProfile 401/404 examples)
    return JSONResponse(status_code=status, content={
        "errors": [{"source": source, "errors": [message]}], "error_code": error_code, "status_code": status})


def create_app(bundle: dict | None = None, secret_key: str | None = None,
               now_fn=None) -> FastAPI:
    app = FastAPI(title="Mock Adapty server-side API v2 (Case Desk)")
    now_fn = now_fn or get_now
    expected_key = secret_key if secret_key is not None else os.environ.get("MOCK_ADAPTY_SECRET_KEY")
    state: dict = {}

    def load() -> None:
        b = bundle if bundle is not None else load_raw()
        state["profiles"] = copy.deepcopy(b["profiles"])
        state["by_pid"] = {p["profile_id"]: c for c, p in state["profiles"].items()}
        state["meta"] = b.get("meta", {})

    load()

    def auth(request: Request) -> JSONResponse | None:
        h = request.headers.get("authorization", "")
        if not h.startswith("Api-Key ") or not h[8:].strip():
            return _err(401, "not_authenticated", "Authentication credentials were not provided.",
                        "non_field_errors")
        if expected_key and h[8:].strip() != expected_key:
            return _err(401, "authentication_failed", "Incorrect authentication credentials.",
                        "non_field_errors")
        return None

    def find(request: Request) -> tuple[dict | None, JSONResponse | None]:
        cuid = request.headers.get("adapty-customer-user-id")
        pid = request.headers.get("adapty-profile-id")
        if not cuid and not pid:
            return None, _err(400, "bad_request",
                              "Either adapty-customer-user-id or adapty-profile-id header is required.")
        key = cuid if cuid else state["by_pid"].get(pid)
        prof = state["profiles"].get(key) if key else None
        if prof is None:
            return None, _err(404, "profile_does_not_exist", "Profile not found")
        return prof, None

    def respond(prof: dict) -> dict:
        prof["timestamp"] = int(time.time() * 1000)
        return {"data": prof}

    async def body_of(request: Request) -> tuple[dict | None, JSONResponse | None]:
        try:
            body = await request.json()
        except ValueError:
            return None, _err(400, "bad_request", "Invalid JSON body.")
        if not isinstance(body, dict) or not body.get("access_level_id"):
            return None, _err(400, "bad_request", "This field is required.", "access_level_id")
        if body["access_level_id"] not in KNOWN_ACCESS_LEVELS:
            return None, _err(400, "paid_access_level_does_not_exist",
                              f"Paid access level {body['access_level_id']!r} does not exist.", "access_level_id")
        return body, None

    @app.get(PROFILE_PATH)
    async def get_profile(request: Request):
        if (e := auth(request)) is not None:
            return e
        prof, e = find(request)
        return e if e is not None else respond(prof)

    @app.post(GRANT_PATH)
    async def grant_access_level(request: Request):
        if (e := auth(request)) is not None:
            return e
        prof, e = find(request)
        if e is not None:
            return e
        body, e = await body_of(request)
        if e is not None:
            return e
        now: datetime = now_fn()
        starts = parse_dt(body.get("starts_at"))
        expires = parse_dt(body.get("expires_at"))
        # INFERRED shape of a granted access level: no transaction, store "adapty".
        level = {
            "access_level_id": body["access_level_id"], "store": GRANT_STORE, "store_product_id": "",
            "store_base_plan_id": None, "store_transaction_id": "", "store_original_transaction_id": "",
            "offer": None, "starts_at": iso(starts), "purchased_at": iso(now), "originally_purchased_at": iso(now),
            "expires_at": iso(expires), "renewal_cancelled_at": None, "billing_issue_detected_at": None,
            "is_in_grace_period": False, "cancellation_reason": None,
        }
        prof["access_levels"] = [a for a in prof["access_levels"]
                                 if a["access_level_id"] != body["access_level_id"]] + [level]
        return respond(prof)

    @app.post(REVOKE_PATH)
    async def revoke_access_level(request: Request):
        if (e := auth(request)) is not None:
            return e
        prof, e = find(request)
        if e is not None:
            return e
        body, e = await body_of(request)
        if e is not None:
            return e
        at = parse_dt(body.get("revoke_at")) or now_fn()
        for a in prof["access_levels"]:
            if a["access_level_id"] == body["access_level_id"]:
                a["expires_at"] = iso(at)
                a["cancellation_reason"] = a.get("cancellation_reason") or "adapty_revoked"
        return respond(prof)

    @app.post("/_mock/reset")
    async def reset():
        load()
        return {"ok": True, "profiles": len(state["profiles"]), "meta": state["meta"]}

    app.state.mock = state
    return app


class _LazyApp:
    """`uvicorn casedesk.adapty.mock_server:app` without loading data at import time."""

    def __init__(self) -> None:
        self._app: FastAPI | None = None

    async def __call__(self, scope, receive, send):
        if self._app is None:
            self._app = create_app()
        await self._app(scope, receive, send)


app = _LazyApp()
