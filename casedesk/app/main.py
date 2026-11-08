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

from fastapi import Depends, FastAPI, HTTPException, Path as PathParam, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from casedesk.ai import suggest
from casedesk.adapty.models import Profile
from casedesk import clock
from casedesk.app import auth, deps, rules
from casedesk.app.store import Store

log = logging.getLogger("casedesk.app")
STATIC = Path(__file__).resolve().parent / "static"
APP_NAME = os.environ.get("CASEDESK_APP_NAME", "Lumen")

STATE_LABELS: dict[str, tuple[str, str]] = {
    # code: (plain-language label, tone ok|warn|bad|info)
    "ACTIVE_RENEWING": ("Active, renews automatically", "ok"),
    "CANCELLED_PAID_UP": ("Cancelled, still active until the end of the period", "info"),
    "TRIAL_ACTIVE": ("Free trial running", "ok"),
    "TRIAL_CANCELLED": ("Trial cancelled: no charge will follow", "info"),
    "GRACE_PERIOD": ("Payment problem, still active for now", "warn"),
    "BILLING_RETRY": ("Payment problem: the store is retrying", "warn"),
    "EXPIRED_BILLING_ERROR": ("Ended: the payment didn’t go through", "bad"),
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

    def _q(self, key: str) -> deque:
        now = time.monotonic()
        if len(self.hits) > 10_000:  # forget idle keys so the dict cannot grow without bound
            for k in [k for k, q in self.hits.items() if not q or now - q[-1] > self.window]:
                del self.hits[k]
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def allow(self, key: str) -> bool:
        q = self._q(key)
        if len(q) >= self.limit:
            return False
        q.append(time.monotonic())
        return True

    def count(self, key: str) -> int:
        return len(self._q(key))

    def full(self, key: str) -> bool:
        return self.count(key) >= self.limit


HISTORY_TURNS = 4
GRANT_COOLDOWN_DAYS = 90


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def _parse_dt(v: Any) -> datetime | None:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def call_compat(fn, *args, **kwargs):
    """Call fn, passing only the keyword arguments it accepts (the stubs and older module versions lack `history`)."""
    import inspect
    try:
        params = inspect.signature(fn).parameters
    except (TypeError, ValueError):
        return fn(*args, **kwargs)
    if any(p.kind is p.VAR_KEYWORD for p in params.values()):
        return fn(*args, **kwargs)
    return fn(*args, **{k: v for k, v in kwargs.items() if k in params})


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEMO_NAMES = ["Milica", "Sofía", "Jordan", "Liam", "Ava", "Noah", "Emma", "Mia", "Ethan", "Aarav", "Lena", "Pedro"]


ORPHAN_AFTER_S = 20.0   # a pending reply with no worker in this process, older than this, was lost in a restart


def _age_s(iso: str | None) -> float:
    try:
        t = datetime.fromisoformat(str(iso))
    except (TypeError, ValueError):
        return float("inf")
    return (now_utc() - (t if t.tzinfo else t.replace(tzinfo=timezone.utc))).total_seconds()


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


def tidy_scenario(s: str) -> str:
    """Demo picker text: 'Pro Annual - AI Studio (App Store), x' -> 'Pro Annual (AI Studio, App Store), x' and
    'Premium Weekly (3-day trial) (Google Play)' -> 'Premium Weekly (3-day trial, Google Play)'."""
    import re
    s = re.sub(r"^([^(]*?) - ([^(]*?) \(", r"\1 (\2, ", s)
    return s.replace(") (", ", ").replace(" - ", ", ")


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
        auth.check_public_config()
        S()
        try:
            now_utc()
        except ValueError as e:
            raise RuntimeError(f"CASEDESK_NOW is not an ISO date-time: {os.environ.get('CASEDESK_NOW')!r}") from e
        log.info("Case Desk up: demo=%s db=%s console_token=%s signing_secret=%s adapty_key=%s modules=%s",
                 auth.demo_mode(), S().path, auth.mask(auth.console_token()),
                 auth.mask(os.environ.get("APP_SIGNING_SECRET")), auth.mask(os.environ.get("ADAPTY_SECRET_KEY")),
                 deps.status())
        yield

    app = FastAPI(title="Case Desk", docs_url=None, redoc_url=None, lifespan=lifespan)
    app.add_middleware(GZipMiddleware, minimum_size=1000)  # the console polls /api/cases every 3 s: ~19x smaller
    app.state.store = store
    app.state.adapty = adapty
    app.state.limiter = RateLimiter(int(os.environ.get("CASEDESK_CHAT_RATE", "8")))
    # Failed signature checks per client IP: after this many in a minute, that IP gets 429 for every user request.
    app.state.auth_fail = RateLimiter(int(os.environ.get("CASEDESK_AUTH_FAIL_RATE", "20")))
    app.state.tasks = {}

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request: Request, exc: RequestValidationError):
        # Never echo the input back: a lone surrogate in it cannot be encoded (-> 500), and a 50k body would be
        # sent straight back. Location + message are enough for a client developer.
        errs = [{"loc": list(e.get("loc", ())), "msg": e.get("msg", ""), "type": e.get("type", "")}
                for e in exc.errors()]
        return JSONResponse({"detail": errs}, status_code=422)

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
                        "scenario": tidy_scenario(u.get("scenario") or u.get("label") or u.get("description") or ""),
                        "signature": auth.sign(cuid)})
        return out

    def check_user(cuid: str, signature: str | None, request: Request | None = None) -> None:
        ip = (request.client.host if request is not None and request.client else None) or "unknown"
        if app.state.auth_fail.full(ip):
            raise HTTPException(status_code=429, detail="Too many failed sign-in attempts. Wait a minute.",
                                headers={"Retry-After": "60"})
        if not auth.valid_user_id(cuid) or not auth.verify(cuid, signature):
            app.state.auth_fail.allow(ip)  # count the failure
            if app.state.auth_fail.count(ip) <= 3:  # audit the first few per window, not every attempt (O2)
                S().audit("anonymous", "auth_rejected", detail={"customer_user_id": cuid[:64], "ip": ip})
            raise HTTPException(status_code=401, detail="Signature missing or invalid for this user.")

    async def load_profile(cuid: str) -> Profile:
        try:
            p = await A().get_profile(cuid)
        except Exception as e:  # noqa: BLE001 — Adapty 5xx/429/401/network after retries
            log.warning("get_profile failed for %s: %s", cuid[:64], type(e).__name__)
            raise HTTPException(status_code=503, detail="We can't reach your account details right now. "
                                                        "Please try again in a minute.") from e
        if p is None:
            return Profile(profile_id="unknown", customer_user_id=cuid)
        return p

    def status_block(profile: Profile, now: datetime, history: list[dict] | None = None) -> tuple[Any, Any, dict]:
        state = deps.get("engine_state").classify(profile, now)
        facts = call_compat(deps.get("engine_facts").build, profile, state, now, history=history)
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
        # A failed grant is retried by the team; to the user it's still under review.
        return [{"id": a["id"], "status": "pending" if a["status"] == "failed" else a["status"],
                 "case_id": a["case_id"], "created_at": a["created_at"],
                 "decided_at": a["decided_at"]} for a in S().user_approvals(cuid)]

    def conversation_for(case_id: str | None) -> list[dict]:
        """The last <= 4 turns of this case, oldest first, for intent.extract / compose.reply (current message
        excluded): [{"role": "user"|"assistant", "text", "intent"?}]."""
        if not case_id:
            return []
        turns = []
        for m in S().messages(case_id):
            meta = m.get("meta") or {}
            if m["role"] == "user":
                t = {"role": "user", "text": m["text"]}
                if meta.get("intent"):
                    t["intent"] = meta["intent"]
                turns.append(t)
            elif m["role"] == "assistant" and meta.get("status") == "ready" and m["text"]:
                turns.append({"role": "assistant", "text": m["text"]})
        return turns[-HISTORY_TURNS:]

    def grant_request_status(cuid: str, now: datetime) -> tuple[str | None, str | None]:
        """(status, approval id) of the user's latest grant request within the cooldown window. A failed grant (Adapty
        error) is still waiting for the team, so it reads as pending to the user."""
        cutoff = now - timedelta(days=GRANT_COOLDOWN_DAYS)
        for a in reversed(S().user_approvals(cuid)):
            when = _parse_dt(a.get("decided_at") or a.get("created_at"))
            if when is None or when >= cutoff:
                st = {"failed": "pending"}.get(a["status"], a["status"])
                return st, a["id"]
        return None, None

    def auto_approve(approval_id: str, case_id: str, rule: dict, days: Any, state: Any, history: list[dict],
                     now: datetime) -> tuple[int, datetime] | None:
        """rules "auto": code-enforced limits (rules.auto_block), then approve_core on the server's event loop. Any
        refusal or failure leaves a normal pending request. Returns (days, expires) when the grant went through."""
        st = S()
        why = rules.auto_block(rule, days, state, history, now)
        if why:
            st.audit("rule", "auto_grant_skipped", case_id, {"approval_id": approval_id, "reason": why})
            return None
        loop = getattr(app.state, "loop", None)
        try:
            if loop is None or not loop.is_running():
                raise RuntimeError("no event loop for the approve path")
            out = asyncio.run_coroutine_threadsafe(
                approve_core(approval_id, actor="rule", approved_by=rules.label(rule)), loop).result(timeout=60)
            exp = _parse_dt(((out.get("approval") or {}).get("result") or {}).get("expires_at"))
            return int(days), exp or now + timedelta(days=int(days))
        except Exception as e:  # noqa: BLE001 — HTTPException (re-check refused / Adapty failed) or anything else
            detail = str(getattr(e, "detail", "") or type(e).__name__)[:200]
            rules.reset_to_pending(st, approval_id, detail)
            st.audit("rule", "auto_grant_failed", case_id, {"approval_id": approval_id, "reason": detail})
            return None

    def phase2(cuid: str, case_id: str, msg_id: int, message: str, locale: str | None, state: Any, facts: Any,
               history: list[dict], convo: list[dict] | None = None, user_msg_id: int | None = None,
               now: datetime | None = None) -> dict:
        """Intent -> policy -> compose. Runs in a worker thread (LLM calls block)."""
        st = S()
        convo = convo or []
        intent = call_compat(deps.get("ai_intent").extract, message, locale or "en", history=convo)
        if user_msg_id:
            st.update_message(user_msg_id, message, {"intent": getattr(intent, "type", None)})
        # The user's pending/decided grant request is a fact the reply must reflect (H2/O3), unless the engine set it.
        g_status, g_id = grant_request_status(cuid, now or now_utc())
        if g_status and "grant_request" not in facts.fields:
            facts.fields["grant_request"] = g_status
        actions = list(deps.get("engine_policy").decide(state, intent, facts, history) or [])
        language = getattr(intent, "language", None) or (locale or "en").split("-")[0]
        # --- rules hook 1/2 (casedesk/app/rules.py): "off" drops the grant before the reply is written.
        rule = rules.get(st)
        if rule["courtesy_grants"] == "off" and any(a.kind == "PROPOSE_GRANT" for a in actions):
            actions = rules.drop_grants(actions)
            st.audit("rule", "grant_dropped_by_rule", case_id, {"rule": "off"})
        # --- end rules hook 1/2
        approval_id = None
        auto_given = None   # (days, expires) when the owner's rule approved the grant right away
        for a in actions:
            if a.kind == "PROPOSE_GRANT":
                p = dict(a.params or {})
                approval_id, created = st.create_approval_once(
                    case_id, cuid, str(p.get("access_level_id") or "premium"),
                    int(p["days"]) if p.get("days") is not None else None,
                    str(p["expires_at"]) if p.get("expires_at") else None, at=_iso(now or now_utc()))
                if created:
                    st.audit("system", "approval_requested", case_id,
                             {"approval_id": approval_id, "params": dump(p)})
                    # --- rules hook 2/2: "auto" approves through approve_core, the console's own path.
                    if rule["courtesy_grants"] == "auto":
                        auto_given = auto_approve(approval_id, case_id, rule, p.get("days"), state, history,
                                                  now or now_utc())
                    # --- end rules hook 2/2
        compose_actions = rules.drop_grants(actions) if auto_given else actions
        rep = call_compat(deps.get("ai_compose").reply, intent, state, facts, compose_actions, language, history=convo)
        acts = dump(actions)
        if auto_given:
            for x in acts:
                if x.get("kind") == "PROPOSE_GRANT":
                    x["requires_approval"] = False
                    x["params"] = {**(x.get("params") or {}), "given_by_rule": rules.label(rule)}
        if approval_id is None and g_status == "pending":
            approval_id = g_id  # asked again while the earlier request is still under review
        pending = approval_id is not None and not auto_given
        reply_text = rep.text
        if auto_given:  # said only after Adapty confirmed the grant; the validated reply above never mentions it
            reply_text = (rules.active_sentence(language, *auto_given) + " " + rep.text.strip()).strip()
        raw = list(getattr(rep, "violations", []) or [])
        validator = {"used_fallback": bool(getattr(rep, "used_fallback", False)),
                     "violations": [v for v in raw if not str(v).startswith("llm_error")],
                     "llm_error": next((str(v) for v in raw if str(v).startswith("llm_error")), None),
                     "source": getattr(rep, "source", None)}
        escalations = [str((a.params or {}).get("reason") or "") for a in actions if a.kind == "ESCALATE_TO_HUMAN"]
        abandoned = bool(((st.get_message(msg_id) or {}).get("meta") or {}).get("abandoned"))
        st.update_case(case_id, language=language, intent=dump(intent), actions=acts, validator=validator,
                       facts=dict(facts.fields))
        user_acts = [x for x in acts if not (auto_given and x.get("kind") == "PROPOSE_GRANT")]
        st.update_message(msg_id, reply_text, {"status": "ready", **validator, "actions": user_acts,
                                               "language": language, "approval_id": None if auto_given else approval_id,
                                               "grant_request": "approved" if auto_given else g_status if not
                                               any(a.kind == "PROPOSE_GRANT" for a in actions) else "pending",
                                               "abandoned": abandoned,
                                               **({"auto_grant_id": approval_id} if auto_given else {})})
        if suggest.needs_suggestion(intent, actions):
            # A draft for the person who picks the case up (never sent to the user). It runs after the reply is
            # stored, so the user never waits for it; any failure leaves the case without a draft.
            try:
                sug = suggest.suggested_reply(intent, state, facts, actions, language, history=convo)
                st.update_case(case_id, suggested_reply=suggest.as_record(sug, language))
                st.audit("system", "suggested_reply_ready", case_id, {"source": sug.source,
                                                                      "used_fallback": sug.used_fallback})
            except Exception:  # noqa: BLE001
                log.exception("suggested reply failed for case %s", case_id)
        st.audit("system", "reply_ready", case_id, {"intent": getattr(intent, "type", None),
                                                    "injection_suspected": getattr(intent, "injection_suspected",
                                                                                   False),
                                                    "actions": [x["kind"] for x in acts],
                                                    "escalations": escalations, "abandoned": abandoned,
                                                    **validator})
        return {"reply": reply_text, "reply_status": "ready", "language": language, "actions": user_acts,
                "pending_approval": pending, "approval_id": None if auto_given else approval_id,
                "intent": getattr(intent, "type", None),
                **({"auto_granted": {"approval_id": approval_id, "rule": rules.label(rule)}} if auto_given else {})}

    def phase2_safe(*args) -> dict:
        cuid, case_id, msg_id = args[0], args[1], args[2]
        try:
            return phase2(*args)
        except Exception as e:  # noqa: BLE001 — never leave the user without an answer
            log.exception("phase 2 failed for case %s", case_id)
            text = ("Sorry, I couldn't finish checking that. Your account status above is correct; "
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
        check_user(cuid, body.signature, request)
        if not app.state.limiter.allow(cuid):
            S().audit(cuid, "rate_limited")
            return JSONResponse({"detail": "Too many messages. Please wait a minute and try again."},
                                status_code=429, headers={"Retry-After": "60"})
        st = S()
        app.state.loop = asyncio.get_running_loop()   # rules: auto-approve runs approve_core on this loop
        now = now_utc()
        profile = await load_profile(cuid)
        state, facts, block = status_block(profile, now, history_for(cuid))

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
        convo = conversation_for(case_id)
        user_msg_id = st.add_message(case_id, "user", body.message)
        msg_id = st.add_message(case_id, "assistant", "", {"status": "pending"})

        task = asyncio.ensure_future(asyncio.to_thread(
            phase2_safe, cuid, case_id, msg_id, body.message, body.locale, state, facts, history, convo,
            user_msg_id, now))
        app.state.tasks[msg_id] = task
        task.add_done_callback(lambda _t, k=msg_id: app.state.tasks.pop(k, None))
        try:
            result = await asyncio.wait_for(asyncio.shield(task), timeout=inline_wait)
        except asyncio.TimeoutError:
            result = {"reply": None, "reply_status": "pending", "actions": [], "pending_approval": False,
                      "language": None, "approval_id": None, "intent": None}
        if result.get("auto_granted"):  # rules: the grant is already live, so the status card shows it now
            _, _, block = status_block(await load_profile(cuid), now_utc())
        return {"case_id": case_id, "message_id": msg_id, **block, **result,
                "approvals": approvals_view(cuid)}

    @app.get("/api/chat/{message_id}")
    async def chat_poll(request: Request, message_id: int = PathParam(..., ge=1, le=2**63 - 1),
                        customer_user_id: str = Query(...), signature: str | None = None):
        check_user(customer_user_id, signature, request)
        m = S().get_message(message_id)
        case = S().get_case(m["case_id"]) if m else None
        if not m or m["role"] != "assistant" or not case or case["customer_user_id"] != customer_user_id:
            raise HTTPException(status_code=404, detail="No such message.")
        if (m.get("meta") or {}).get("status") == "pending" and message_id not in app.state.tasks \
                and _age_s(m.get("created_at")) > ORPHAN_AFTER_S:
            # Its worker died with the previous server process: answer instead of leaving the user polling forever.
            text = ("Sorry, I couldn't finish checking that. Your account status above is correct; "
                    "please send your message again.")
            S().update_message(message_id, text, {"status": "error", "error": "interrupted"})
            m = S().get_message(message_id)
        return msg_view(m)

    @app.post("/api/chat/{message_id}/abandon")
    async def chat_abandon(request: Request, message_id: int = PathParam(..., ge=1, le=2**63 - 1),
                           customer_user_id: str = Query(...), signature: str | None = None):
        """The widget left this conversation (user switch) before the reply arrived. The worker still finishes, but
        its reply is marked abandoned so the console doesn't present it as something the user saw."""
        check_user(customer_user_id, signature, request)
        m = S().get_message(message_id)
        case = S().get_case(m["case_id"]) if m else None
        if not m or m["role"] != "assistant" or not case or case["customer_user_id"] != customer_user_id:
            raise HTTPException(status_code=404, detail="No such message.")
        meta = dict(m.get("meta") or {})
        if meta.get("status") == "pending":
            meta["abandoned"] = True
            S().update_message(message_id, m["text"], meta)
            S().audit(customer_user_id, "reply_abandoned", case["id"], {"message_id": message_id})
        return {"ok": True}

    @app.get("/api/status")
    async def status(request: Request, customer_user_id: str = Query(...), signature: str | None = None):
        """The user's current status card, fresh from Adapty (used after an approval)."""
        check_user(customer_user_id, signature, request)
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

    def case_flags(c: dict) -> dict:
        """Escalation / privacy / LLM-outage flags for the console list and detail."""
        intent = c.get("intent") if isinstance(c.get("intent"), dict) else {}
        claims = intent.get("claims") if isinstance(intent.get("claims"), dict) else {}
        acts = [x for x in (c.get("actions") or []) if isinstance(x, dict)]
        reasons = [str((x.get("params") or {}).get("reason") or "") for x in acts
                   if x.get("kind") == "ESCALATE_TO_HUMAN"]
        v = c.get("validator") if isinstance(c.get("validator"), dict) else {}
        llm_error = v.get("llm_error") or next((x for x in v.get("violations") or []
                                                if str(x).startswith("llm_error")), None)
        return {"escalated": bool(reasons), "escalation_reasons": reasons,
                "privacy": intent.get("type") == "PRIVACY_REQUEST" or "privacy_request" in reasons
                or claims.get("privacy_request") is True,
                "claims": claims, "llm_error": llm_error}

    def seeded_name(cuid: str) -> str | None:
        """Demo only: a display name for users of the seeded demo cases (casedesk.seed), for the console."""
        if not auth.demo_mode():
            return None
        try:
            from casedesk.seed import display_name
        except Exception:  # noqa: BLE001 — names are a nicety
            return None
        return display_name(cuid)

    @app.get("/api/cases", dependencies=[console])
    async def list_cases():
        st = S()
        pending = {a["case_id"] for a in st.list_approvals("pending")}
        out = []
        cases = st.list_cases()
        summ = st.message_summary([c["id"] for c in cases])  # one query, not one per case
        for c in cases:
            n_msgs, first = summ.get(c["id"], (0, ""))
            out.append({"id": c["id"], "customer_user_id": c["customer_user_id"], "created_at": c["created_at"],
                        "updated_at": c["updated_at"], "language": c.get("language"),
                        "intent": (c.get("intent") or {}).get("type") if isinstance(c.get("intent"), dict) else None,
                        "state_badge": c.get("state"), "sale_context": c.get("sale_context") or {},
                        "first_message": (first or "")[:160], "messages": n_msgs,
                        "pending_approval": c["id"] in pending, "status": c.get("status") or "open",
                        "used_fallback": (c.get("validator") or {}).get("used_fallback"),
                        **case_flags(c),
                        **({"display_name": n} if (n := seeded_name(c["customer_user_id"])) else {})})
        return {"cases": out, "total": st.count_cases()}

    @app.get("/api/cases/{case_id}", dependencies=[console])
    async def get_case(case_id: str):
        st = S()
        c = st.get_case(case_id)
        if not c:
            raise HTTPException(status_code=404, detail="No such case.")
        return {"case": c, "flags": case_flags(c), "messages": st.messages(case_id),
                "approvals": st.case_approvals(case_id), "audit": st.audit_log(case_id)}

    def set_case_status(case_id: str, status: str) -> dict:
        """Mark a case resolved (it leaves "Needs a person") or open again. A new customer message reopens it too."""
        st = S()
        if not st.set_case_status(case_id, status):
            raise HTTPException(status_code=404, detail="No such case.")
        st.audit("console", "case_resolved" if status == "resolved" else "case_reopened", case_id, {"status": status})
        return {"case_id": case_id, "status": status}

    @app.post("/api/cases/{case_id}/resolve", dependencies=[console])
    async def resolve_case(case_id: str):
        return set_case_status(case_id, "resolved")

    @app.post("/api/cases/{case_id}/reopen", dependencies=[console])
    async def reopen_case(case_id: str):
        return set_case_status(case_id, "open")

    @app.get("/api/approvals", dependencies=[console])
    async def list_approvals(status: str | None = None, scope: str | None = None):
        """Default: every approval (or one status). scope=console: what the console needs on each poll, i.e. every
        pending or failed request plus the 50 most recently decided, instead of every approval ever."""
        if scope == "console":
            return {"approvals": S().console_approvals()}
        return {"approvals": S().list_approvals(status)}

    async def eligibility_now(a: dict, now: datetime) -> tuple[bool, str]:
        """Is the grant still allowed at click time? Re-reads Adapty and asks the engine (O4)."""
        profile = await load_profile(a["customer_user_id"])
        state = deps.get("engine_state").classify(profile, now)
        facts = deps.get("engine_facts").build(profile, state, now)
        hist = [{"created_at": x["created_at"], "approval": {"status": x["status"], "created_at": x["created_at"],
                                                             "decided_at": x["decided_at"],
                                                             "access_level_id": x["access_level_id"],
                                                             "days": x["days"]}}
                for x in S().user_approvals(a["customer_user_id"]) if x["id"] != a["id"]]
        pol = deps.get("engine_policy")
        reasons = {"state_changed": f"the account changed (it is now {state.code})",
                   "window_closed": "the 14-day window after the failed payment has closed",
                   "never_paid": "this subscription was never paid for",
                   "granted_recently": "another grant was approved in the last 90 days"}
        recheck = getattr(pol, "grant_recheck", None)
        if callable(recheck):
            ok, code = recheck(state, facts, hist, now)
            return bool(ok), ("" if ok else reasons.get(code, str(code)))
        fn = getattr(pol, "grant_still_eligible", None)
        if callable(fn):
            res = call_compat(fn, state, facts, history=hist, now=now)
            if isinstance(res, tuple):
                ok, reason = bool(res[0]), str(res[1] if len(res) > 1 and res[1] else "")
            elif isinstance(res, dict):
                ok, reason = bool(res.get("eligible", res.get("ok"))), str(res.get("reason") or "")
            else:
                ok, reason = bool(getattr(res, "eligible", res)), str(getattr(res, "reason", "") or "")
            return ok, reason or ("" if ok else f"the account is now {state.code}")
        window = getattr(deps.get("engine_facts"), "grant_window_open", None)
        if callable(window) and not window(state, now):
            return False, f"the account is now {state.code}, outside the grant window"
        recent = getattr(pol, "recent_grant", None)
        if callable(recent) and recent(hist, now):
            return False, "another grant was given in the last 90 days"
        return True, ""

    @app.post("/api/approvals/{approval_id}/approve", dependencies=[console])
    async def approve(approval_id: str):
        return await approve_core(approval_id)

    async def approve_core(approval_id: str, actor: str = "console", approved_by: str = "console") -> dict:
        """The one approve path: the console button and an automatic rule (casedesk/app/rules.py) both use it."""
        st = S()
        a = st.get_approval(approval_id)
        if not a:
            raise HTTPException(status_code=404, detail="No such approval.")
        if a["status"] not in ("pending", "failed"):
            raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}.")
        now = now_utc()
        ok, reason = await eligibility_now(a, now)
        if not ok:
            st.audit(actor, "grant_refused_ineligible", a["case_id"], {"approval_id": approval_id,
                                                                        "reason": reason})
            raise HTTPException(status_code=409, detail=f"Not eligible any more: {reason}. Deny the request, or "
                                                        "leave it pending.")
        if not st.decide_approval(approval_id, "approved", at=_iso(now), from_statuses=("pending", "failed")):
            raise HTTPException(status_code=409, detail="Someone else decided this request just now.")
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
            st.audit(actor, "grant_failed", a["case_id"], {"approval_id": approval_id,
                                                            "error": type(e).__name__})
            raise HTTPException(status_code=502, detail="Adapty grant failed. The request is marked failed; "
                                                        "you can retry it.")
        # Keep a receipt, not the whole profile Adapty returns.
        result = {"adapty": "granted", "access_level_id": a["access_level_id"], "expires_at": expires.isoformat(),
                  "adapty_profile_id": (res.get("data") or {}).get("profile_id") if isinstance(res, dict) else None,
                  "approved_by": approved_by}
        st.set_approval_result(approval_id, "approved", result)
        st.audit(actor, "grant_approved", a["case_id"], {"approval_id": approval_id,
                                                         "access_level_id": a["access_level_id"],
                                                         "expires_at": expires.isoformat(),
                                                         "retry": a["status"] == "failed", "approved_by": approved_by})
        said = (f"Given automatically by your rule: access until {expires.day} {expires:%B %Y}."
                if approved_by.startswith("rule:") else
                f"The {APP_NAME} team approved access until {expires.day} {expires:%B %Y}.")
        st.add_message(a["case_id"], "system", said,
                       {"status": "ready", "event": "grant_approved", "approved_by": approved_by})
        return {"approval": st.get_approval(approval_id)}

    @app.post("/api/approvals/{approval_id}/deny", dependencies=[console])
    async def deny(approval_id: str):
        st = S()
        a = st.get_approval(approval_id)
        if not a:
            raise HTTPException(status_code=404, detail="No such approval.")
        if not st.decide_approval(approval_id, "denied", at=_iso(now_utc()), from_statuses=("pending", "failed")):
            raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}.")
        st.audit("console", "grant_denied", a["case_id"], {"approval_id": approval_id})
        st.add_message(a["case_id"], "system", f"The {APP_NAME} team reviewed the request and didn't add access.",
                       {"status": "ready", "event": "grant_denied"})
        return {"approval": st.get_approval(approval_id)}

    # --- rules API (casedesk/app/rules.py): what Case Desk may do on its own. MCP: set_grant_rule -> PUT /api/rules.
    @app.get("/api/rules", dependencies=[console])
    async def get_rules():
        return rules.view(rules.get(S()))

    @app.put("/api/rules", dependencies=[console])
    async def put_rules(body: rules.RulesIn):
        rules.put(S(), body)
        return rules.view(rules.get(S()))
    # --- end rules API

    @app.get("/api/console/meta", dependencies=[console])
    async def console_meta():
        # server_now: the app's clock (the demo clock under CASEDESK_NOW). The console shifts its own "now" to it so
        # relative labels ("now", "3 min") and same-day checks compare against the dates the server writes.
        return {"demo": auth.demo_mode(), "app_name": APP_NAME, "modules": deps.status(),
                "server_now": _iso(now_utc()), "clock": clock.mode()}

    # ------------------------------------------------------------------ pages
    @app.get("/", include_in_schema=False)
    async def landing():
        return FileResponse(STATIC / "index.html")

    def page(name: str, v: str | None) -> Path:
        """/help?v=N and /console?v=N serve design variant N (static/vN/) when it exists; else the default page.
        CASEDESK_DESIGN=N makes variant N the default; ?v=0 always shows the original pages."""
        v = v or os.environ.get("CASEDESK_DESIGN", "")
        if v and v.isdigit() and len(v) <= 2 and (STATIC / f"v{v}" / name).is_file():
            return STATIC / f"v{v}" / name
        return STATIC / name

    @app.get("/help", include_in_schema=False)
    async def help_page(v: str | None = None):
        return FileResponse(page("help.html", v))

    @app.get("/console", include_in_schema=False)
    async def console_page(request: Request, v: str | None = None):
        resp = FileResponse(page("console.html", v))
        if auth.console_token() and auth.console_autocookie_allowed(request.client.host if request.client else None):
            # Demo convenience only: the console is pre-authorised on this browser.
            resp.set_cookie("casedesk_console", auth.console_token(), httponly=True, samesite="strict")
        return resp

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return RedirectResponse("/static/favicon.svg")

    app.mount("/static", StaticFiles(directory=STATIC), name="static")
    return app


app = create_app()
