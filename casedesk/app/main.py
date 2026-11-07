"""Case Desk web app: end-user chat API, developer console API, and the three pages.

Pipeline (ARCH.md): auth -> adapty.get_profile -> engine.classify -> facts.build -> ai.intent -> engine.policy ->
ai.compose -> store case -> response.

Slow LLM backends (e.g. `claude -p`, 5-15 s) are handled in two phases:
  * phase 1 (fast, deterministic): auth, profile, classify, facts -> the status card.
  * phase 2 (may be slow): intent, policy, compose, approvals -> reply + actions.
POST /api/chat runs phase 1, starts phase 2 and waits up to CASEDESK_INLINE_WAIT seconds (default 2.5). If phase 2 is
done the response is complete (`reply_status: "ready"`). Otherwise it returns `reply: null, reply_status: "pending"`
with the status card filled in, and the client polls GET /api/chat/{message_id}.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from casedesk.adapty.models import Profile
from casedesk.app import auth, deps
from casedesk.app.store import Store

log = logging.getLogger("casedesk.app")
STATIC = Path(__file__).resolve().parent / "static"
APP_NAME = os.environ.get("CASEDESK_APP_NAME", "Lumen")

STATE_LABELS: dict[str, tuple[str, str]] = {
    # code: (plain-language label, tone ok|warn|bad|info)
    "ACTIVE_RENEWING": ("Active — renews automatically", "ok"),
    "CANCELLED_PAID_UP": ("Cancelled — still active until the end of the period", "info"),
    "TRIAL_ACTIVE": ("Free trial running", "ok"),
    "TRIAL_CANCELLED": ("Trial cancelled — no charge will follow", "info"),
    "GRACE_PERIOD": ("Payment problem — still active for now", "warn"),
    "BILLING_RETRY": ("Payment problem — the store is retrying", "warn"),
    "EXPIRED_BILLING_ERROR": ("Ended — the payment didn't go through", "bad"),
    "EXPIRED_CANCELLED": ("Ended after you cancelled", "info"),
    "REFUNDED": ("Refunded", "info"),
    "LIFETIME": ("Lifetime access", "ok"),
    "GRANTED_BY_DEVELOPER": ("Premium given by the team", "ok"),
    "NO_PURCHASE": ("No purchase on this account", "info"),
    "FAMILY_SHARED": ("Shared through Family Sharing", "ok"),
}


def badge(code: str) -> dict:
    label, tone = STATE_LABELS.get(code, (code.replace("_", " ").capitalize(), "info"))
    return {"code": code, "label": label, "tone": tone}


def dump(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, (list, tuple, set)):
        return [dump(x) for x in obj]
    if isinstance(obj, dict):
        return {k: dump(v) for k, v in obj.items()}
    return obj


class ChatIn(BaseModel):
    customer_user_id: str = Field(min_length=1, max_length=200)
    signature: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=2000)
    locale: str | None = Field(default=None, max_length=35)
    case_id: str | None = Field(default=None, max_length=40)


class RateLimiter:
    def __init__(self, limit: int, window_s: float = 60.0):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEMO_NAMES = ["Milica", "Sofía", "Jordan", "Liam", "Ava", "Noah", "Emma", "Mia", "Ethan", "Aarav", "Lena", "Pedro"]


def now_utc() -> datetime:
    """The engine's clock: the Adapty client's get_now() (honours CASEDESK_NOW for the seeded snapshot)."""
    mod = deps.get("adapty_client")
    fn = getattr(mod, "get_now", None)
    return fn() if callable(fn) else datetime.now(timezone.utc)


def make_adapty():
    """Real AdaptyClient if it has landed. In demo mode without ADAPTY_API_BASE, the mock Adapty server runs
    in-process (httpx ASGITransport), so the demo needs no second server and no network."""
    mod = deps.get("adapty_client")
    try:
        if (auth.demo_mode() and not os.environ.get("ADAPTY_API_BASE") and mod.__name__ == "casedesk.adapty.client"):
            import httpx

            from casedesk.adapty import mock_server
            log.info("demo: using the mock Adapty server in-process")
            return mod.AdaptyClient(base_url="http://mock-adapty.local", secret_key="secret_live_demo_inprocess",
                                    transport=httpx.ASGITransport(app=mock_server.create_app()))
        return mod.AdaptyClient()
    except Exception as e:  # noqa: BLE001 — misconfigured real client: say so, fall back to the stub
        log.warning("AdaptyClient() failed (%s); using stub client", type(e).__name__)
        from casedesk.app import _stubs
        return _stubs.AdaptyClient()


def load_demo_users() -> list[dict]:
    seed = deps.get("adapty_seed")
    if deps.status()["adapty_seed"] == "real":
        return list(seed.demo_users())
    f = DATA_DIR / "demo_users.json"
    if f.exists() and deps.get("adapty_client").__name__ == "casedesk.adapty.client":
        import json
        users = json.loads(f.read_text(encoding="utf-8")).get("users", [])
        return [{"customer_user_id": u["customer_user_id"],
                 "display_name": DEMO_NAMES[i % len(DEMO_NAMES)],
                 "locale": str(u.get("locale") or "en").replace("_", "-"),
                 "scenario": u.get("why") or u.get("situation") or ""} for i, u in enumerate(users)]
    from casedesk.app import _stubs
    return _stubs.demo_users()


def create_app(store: Store | None = None, adapty: Any | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        S()
        log.info("Case Desk up: demo=%s db=%s console_token=%s signing_secret=%s adapty_key=%s modules=%s",
                 auth.demo_mode(), S().path, auth.mask(auth.console_token()),
                 auth.mask(os.environ.get("APP_SIGNING_SECRET")), auth.mask(os.environ.get("ADAPTY_SECRET_KEY")),
                 deps.status())
        yield

    app = FastAPI(title="Case Desk", docs_url=None, redoc_url=None, lifespan=lifespan)
    app.state.store = store
    app.state.adapty = adapty
    app.state.limiter = RateLimiter(int(os.environ.get("CASEDESK_CHAT_RATE", "8")))
    app.state.tasks = {}
    inline_wait = float(os.environ.get("CASEDESK_INLINE_WAIT", "2.5"))

    def S() -> Store:
        if app.state.store is None:
            app.state.store = Store()
        return app.state.store

    def A():
        if app.state.adapty is None:
            app.state.adapty = make_adapty()
        return app.state.adapty

    # ------------------------------------------------------------------ helpers
    def demo_users() -> list[dict]:
        if not auth.demo_mode():
            return []
        try:
            raw = load_demo_users()
        except Exception as e:  # noqa: BLE001
            log.warning("demo_users() failed: %s", e)
            from casedesk.app import _stubs
            raw = _stubs.demo_users()
        out = []
        for u in raw:
            u = dict(u) if isinstance(u, dict) else dump(u)
            cuid = u.get("customer_user_id")
            if not cuid:
                continue
            out.append({"customer_user_id": cuid,
                        "display_name": u.get("display_name") or u.get("name") or cuid,
                        "locale": str(u.get("locale") or "en").replace("_", "-"),
                        "scenario": u.get("scenario") or u.get("label") or u.get("description") or "",
                        "signature": auth.sign(cuid)})
        return out

    def check_user(cuid: str, signature: str | None) -> None:
        if not auth.verify(cuid, signature):
            S().audit("anonymous", "auth_rejected", detail={"customer_user_id": cuid[:64]})
            raise HTTPException(status_code=401, detail="Signature missing or invalid for this user.")

    async def load_profile(cuid: str) -> Profile:
        p = await A().get_profile(cuid)
        if p is None:
            return Profile(profile_id="unknown", customer_user_id=cuid)
        return p

    def status_block(profile: Profile, now: datetime) -> tuple[Any, Any, dict]:
        state = deps.get("engine_state").classify(profile, now)
        facts = deps.get("engine_facts").build(profile, state, now)
        block = {"state_badge": badge(state.code), "facts": dict(facts.fields),
                 "store": getattr(state.primary, "store", None) if state.primary else None,
                 "evidence": list(getattr(state, "evidence", []) or [])}
        return state, facts, block

    def history_for(cuid: str, exclude_case: str | None = None) -> list[dict]:
        apprs: dict[str, dict] = {}
        for a in S().user_approvals(cuid):
            apprs.setdefault(a["case_id"], a)
        hist = []
        for c in S().user_cases(cuid):
            a = apprs.get(c["id"])
            hist.append({
                "case_id": c["id"], "created_at": c["created_at"],
                "intent": (c.get("intent") or {}).get("type") if isinstance(c.get("intent"), dict) else None,
                "state": (c.get("state") or {}).get("code") if isinstance(c.get("state"), dict) else None,
                "actions": [x.get("kind") for x in (c.get("actions") or []) if isinstance(x, dict)],
                "approval": ({"status": a["status"], "created_at": a["created_at"], "decided_at": a["decided_at"],
                              "access_level_id": a["access_level_id"], "days": a["days"]} if a else None),
            })
        return hist

    def approvals_view(cuid: str) -> list[dict]:
        return [{"id": a["id"], "status": a["status"], "case_id": a["case_id"], "created_at": a["created_at"],
                 "decided_at": a["decided_at"]} for a in S().user_approvals(cuid)]

    def phase2(cuid: str, case_id: str, msg_id: int, message: str, locale: str | None, state: Any, facts: Any,
               history: list[dict]) -> dict:
        """Intent -> policy -> compose. Runs in a worker thread (LLM calls block)."""
        st = S()
        intent = deps.get("ai_intent").extract(message, locale or "en")
        actions = deps.get("engine_policy").decide(state, intent, facts, history)
        language = getattr(intent, "language", None) or (locale or "en").split("-")[0]
        rep = deps.get("ai_compose").reply(intent, state, facts, actions, language)
        acts = dump(list(actions))
        pending = False
        approval_id = None
        for a in actions:
            if a.kind == "PROPOSE_GRANT":
                existing = [x for x in st.user_approvals(cuid) if x["status"] == "pending"]
                if existing:
                    approval_id = existing[-1]["id"]
                else:
                    p = dict(a.params or {})
                    approval_id = st.create_approval(case_id, cuid, str(p.get("access_level_id") or "premium"),
                                                     int(p["days"]) if p.get("days") is not None else None,
                                                     str(p["expires_at"]) if p.get("expires_at") else None)
                    st.audit("system", "approval_requested", case_id,
                             {"approval_id": approval_id, "params": dump(p)})
                pending = True
        validator = {"used_fallback": bool(getattr(rep, "used_fallback", False)),
                     "violations": list(getattr(rep, "violations", []) or [])}
        st.update_case(case_id, language=language, intent=dump(intent), actions=acts, validator=validator)
        st.update_message(msg_id, rep.text, {"status": "ready", **validator, "actions": acts,
                                             "language": language, "approval_id": approval_id})
        st.audit("system", "reply_ready", case_id, {"intent": getattr(intent, "type", None),
                                                    "injection_suspected": getattr(intent, "injection_suspected",
                                                                                   False),
                                                    "actions": [x["kind"] for x in acts], **validator})
        return {"reply": rep.text, "reply_status": "ready", "language": language, "actions": acts,
                "pending_approval": pending, "approval_id": approval_id, "intent": getattr(intent, "type", None)}

    def phase2_safe(*args) -> dict:
        cuid, case_id, msg_id = args[0], args[1], args[2]
        try:
            return phase2(*args)
        except Exception as e:  # noqa: BLE001 — never leave the user without an answer
            log.exception("phase 2 failed for case %s", case_id)
            text = ("Sorry — I couldn't finish checking that. Your account status above is correct; "
                    "please try again in a minute.")
            S().update_message(msg_id, text, {"status": "error", "error": type(e).__name__})
            S().audit("system", "reply_error", case_id, {"error": type(e).__name__})
            return {"reply": text, "reply_status": "error", "actions": [], "pending_approval": False,
                    "language": None, "approval_id": None, "intent": None}

    def msg_view(m: dict) -> dict:
        meta = m.get("meta") or {}
        status = meta.get("status", "ready")
        return {"message_id": m["id"], "case_id": m["case_id"], "reply_status": status,
                "reply": m["text"] if status != "pending" else None, "language": meta.get("language"),
                "actions": meta.get("actions", []), "pending_approval": bool(meta.get("approval_id")),
                "approval_id": meta.get("approval_id")}

    # ------------------------------------------------------------------ end-user API
    @app.post("/api/chat")
    async def chat(body: ChatIn, request: Request):
        cuid = body.customer_user_id.strip()
        check_user(cuid, body.signature)
        if not app.state.limiter.allow(cuid):
            S().audit(cuid, "rate_limited")
            return JSONResponse({"detail": "Too many messages — please wait a minute and try again."},
                                status_code=429, headers={"Retry-After": "60"})
        st = S()
        now = now_utc()
        profile = await load_profile(cuid)
        state, facts, block = status_block(profile, now)

        case = st.get_case(body.case_id) if body.case_id else None
        if not case or case["customer_user_id"] != cuid:
            history = history_for(cuid)
            case_id = st.create_case(cuid, dict(profile.sale_context or {}))
            st.audit(cuid, "case_opened", case_id, {"state": state.code})
        else:
            case_id = case["id"]
            history = history_for(cuid)
        st.update_case(case_id, state={**block["state_badge"], "evidence": block["evidence"]},
                       facts=block["facts"])
        st.add_message(case_id, "user", body.message)
        msg_id = st.add_message(case_id, "assistant", "", {"status": "pending"})

        task = asyncio.ensure_future(asyncio.to_thread(
            phase2_safe, cuid, case_id, msg_id, body.message, body.locale, state, facts, history))
        app.state.tasks[msg_id] = task
        task.add_done_callback(lambda _t, k=msg_id: app.state.tasks.pop(k, None))
        try:
            result = await asyncio.wait_for(asyncio.shield(task), timeout=inline_wait)
        except asyncio.TimeoutError:
            result = {"reply": None, "reply_status": "pending", "actions": [], "pending_approval": False,
                      "language": None, "approval_id": None, "intent": None}
        return {"case_id": case_id, "message_id": msg_id, **block, **result,
                "approvals": approvals_view(cuid)}

    @app.get("/api/chat/{message_id}")
    async def chat_poll(message_id: int, customer_user_id: str = Query(...), signature: str | None = None):
        check_user(customer_user_id, signature)
        m = S().get_message(message_id)
        case = S().get_case(m["case_id"]) if m else None
        if not m or m["role"] != "assistant" or not case or case["customer_user_id"] != customer_user_id:
            raise HTTPException(status_code=404, detail="No such message.")
        return msg_view(m)

    @app.get("/api/status")
    async def status(customer_user_id: str = Query(...), signature: str | None = None):
        """The user's current status card, fresh from Adapty (used after an approval)."""
        check_user(customer_user_id, signature)
        profile = await load_profile(customer_user_id)
        _, _, block = status_block(profile, now_utc())
        return {**block, "approvals": approvals_view(customer_user_id)}

    @app.get("/api/demo/users")
    async def get_demo_users():
        if not auth.demo_mode():
            raise HTTPException(status_code=404, detail="Not in demo mode.")
        return {"users": demo_users(), "app_name": APP_NAME}

    @app.get("/api/meta")
    async def meta():
        return {"demo": auth.demo_mode(), "app_name": APP_NAME}

    # ------------------------------------------------------------------ console API
    console = Depends(auth.require_console)

    @app.get("/api/cases", dependencies=[console])
    async def list_cases():
        st = S()
        pending = {a["case_id"] for a in st.list_approvals("pending")}
        out = []
        for c in st.list_cases():
            msgs = st.messages(c["id"])
            first = next((m["text"] for m in msgs if m["role"] == "user"), "")
            out.append({"id": c["id"], "customer_user_id": c["customer_user_id"], "created_at": c["created_at"],
                        "updated_at": c["updated_at"], "language": c.get("language"),
                        "intent": (c.get("intent") or {}).get("type") if isinstance(c.get("intent"), dict) else None,
                        "state_badge": c.get("state"), "sale_context": c.get("sale_context") or {},
                        "first_message": first[:160], "messages": len(msgs),
                        "pending_approval": c["id"] in pending,
                        "used_fallback": (c.get("validator") or {}).get("used_fallback")})
        return {"cases": out}

    @app.get("/api/cases/{case_id}", dependencies=[console])
    async def get_case(case_id: str):
        st = S()
        c = st.get_case(case_id)
        if not c:
            raise HTTPException(status_code=404, detail="No such case.")
        return {"case": c, "messages": st.messages(case_id), "approvals": st.case_approvals(case_id),
                "audit": st.audit_log(case_id)}

    @app.get("/api/approvals", dependencies=[console])
    async def list_approvals(status: str | None = None):
        return {"approvals": S().list_approvals(status)}

    @app.post("/api/approvals/{approval_id}/approve", dependencies=[console])
    async def approve(approval_id: str):
        st = S()
        a = st.get_approval(approval_id)
        if not a:
            raise HTTPException(status_code=404, detail="No such approval.")
        if not st.decide_approval(approval_id, "approved"):
            raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}.")
        now = now_utc()
        if a.get("days"):
            expires = now + timedelta(days=int(a["days"]))  # counted from the approval, not the request
        elif a.get("expires_at"):
            expires = datetime.fromisoformat(a["expires_at"])
        else:
            expires = now + timedelta(days=3)
        try:
            res = await A().grant_access_level(a["customer_user_id"], a["access_level_id"], expires)
        except Exception as e:  # noqa: BLE001
            st.set_approval_result(approval_id, "failed", {"error": f"{type(e).__name__}: {e}"[:300]})
            st.audit("console", "grant_failed", a["case_id"], {"approval_id": approval_id,
                                                                "error": type(e).__name__})
            raise HTTPException(status_code=502, detail="Adapty grant failed; the approval is marked failed.")
        # Keep a receipt, not the whole profile Adapty returns.
        result = {"adapty": "granted", "access_level_id": a["access_level_id"], "expires_at": expires.isoformat(),
                  "adapty_profile_id": (res.get("data") or {}).get("profile_id") if isinstance(res, dict) else None}
        st.set_approval_result(approval_id, "approved", result)
        st.audit("console", "grant_approved", a["case_id"], {"approval_id": approval_id,
                                                             "access_level_id": a["access_level_id"],
                                                             "expires_at": expires.isoformat()})
        st.add_message(a["case_id"], "system", f"The {APP_NAME} team approved access until {expires.date()}.",
                       {"status": "ready", "event": "grant_approved"})
        return {"approval": st.get_approval(approval_id)}

    @app.post("/api/approvals/{approval_id}/deny", dependencies=[console])
    async def deny(approval_id: str):
        st = S()
        a = st.get_approval(approval_id)
        if not a:
            raise HTTPException(status_code=404, detail="No such approval.")
        if not st.decide_approval(approval_id, "denied"):
            raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}.")
        st.audit("console", "grant_denied", a["case_id"], {"approval_id": approval_id})
        st.add_message(a["case_id"], "system", f"The {APP_NAME} team reviewed the request and didn't add access.",
                       {"status": "ready", "event": "grant_denied"})
        return {"approval": st.get_approval(approval_id)}

    @app.get("/api/console/meta", dependencies=[console])
    async def console_meta():
        return {"demo": auth.demo_mode(), "app_name": APP_NAME, "modules": deps.status()}

    # ------------------------------------------------------------------ pages
    @app.get("/", include_in_schema=False)
    async def landing():
        return FileResponse(STATIC / "index.html")

    @app.get("/help", include_in_schema=False)
    async def help_page():
        return FileResponse(STATIC / "help.html")

    @app.get("/console", include_in_schema=False)
    async def console_page():
        resp = FileResponse(STATIC / "console.html")
        if auth.demo_mode() and auth.console_token():
            # Demo convenience only: the console is pre-authorised on this browser.
            resp.set_cookie("casedesk_console", auth.console_token(), httponly=True, samesite="strict")
        return resp

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return RedirectResponse("/static/favicon.svg")

    app.mount("/static", StaticFiles(directory=STATIC), name="static")
    return app


app = create_app()
