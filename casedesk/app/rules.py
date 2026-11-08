"""Owner-chosen automation rules: what Case Desk may do on its own (one row per app, in the case database).

Only one thing is configurable, courtesy grants (the PROPOSE_GRANT action):
  ask   (default) every proposal waits for the owner's OK in the console, as before;
  auto  a proposal of at most `max_days` (1-7) days is approved at once, through the SAME code path as the console's
        approve button (Adapty re-read + policy.grant_recheck + Adapty grant), and recorded as approved by
        "rule: auto up to N days". On top of the policy and the re-check, this module enforces in code: the user has
        paid (a paid, non-refunded transaction), nothing was refunded, no grant pending/approved in 90 days, and the
        state is one policy allows grants in. Anything else, or any failure, falls back to a normal pending request;
  off   PROPOSE_GRANT is dropped before the reply is written, so the reply never mentions a request.

Not configurable, by design (shown locked in the console): escalations (privacy, prompt injection, "I want a person")
always go to a person; normal answers are automatic and every reply goes through the validator.

API (console token or the demo console cookie): GET /api/rules, PUT /api/rules {"courtesy_grants": "auto",
"max_days": 3}. Every change is audited ("rules changed: grants ask → auto (3 days)").
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from casedesk.engine.state import ever_paid, is_refunded

MODES = ("ask", "auto", "off")
DEFAULTS: dict[str, Any] = {"courtesy_grants": "ask", "max_days": 3}
MIN_DAYS, MAX_DAYS = 1, 7
COOLDOWN_DAYS = 90
# The states policy.py proposes grants in (docs/policy.md "Grant policy"); auto never goes beyond them.
GRANT_STATES = {"BILLING_RETRY", "EXPIRED_BILLING_ERROR"}

SCHEMA = """CREATE TABLE IF NOT EXISTS rules (
  app TEXT PRIMARY KEY,
  data TEXT NOT NULL,      -- JSON {courtesy_grants, max_days}
  updated_at TEXT NOT NULL
)"""

LOCKED = [
    {"key": "escalations", "label": "Privacy, attacks and 'I want a person'", "value": "Always a person",
     "why": "always a person, by design"},
    {"key": "answers", "label": "Answers about status, charges, cancelling, restore",
     "value": "Automatic, every reply checked", "why": "every reply passes the validator before the user sees it"},
]


class RulesIn(BaseModel):
    """PUT /api/rules body. Unknown keys are rejected (escalations and answers are not configurable)."""
    model_config = ConfigDict(extra="forbid")
    courtesy_grants: Literal["ask", "auto", "off"] | None = None
    max_days: int | None = Field(default=None, ge=MIN_DAYS, le=MAX_DAYS)


def app_key() -> str:
    return os.environ.get("CASEDESK_APP_NAME", "Lumen")


def _ensure(store) -> None:
    if not getattr(store, "_rules_ready", False):
        store._x(SCHEMA)
        store._rules_ready = True


def get(store) -> dict:
    _ensure(store)
    rows = store._all("SELECT data FROM rules WHERE app=?", (app_key(),))
    out = dict(DEFAULTS)
    if rows:
        try:
            saved = json.loads(rows[0]["data"])
        except ValueError:
            saved = {}
        if saved.get("courtesy_grants") in MODES:
            out["courtesy_grants"] = saved["courtesy_grants"]
        if isinstance(saved.get("max_days"), int) and MIN_DAYS <= saved["max_days"] <= MAX_DAYS:
            out["max_days"] = saved["max_days"]
    return out


def summary(r: dict) -> str:
    return f"auto ({r['max_days']} days)" if r["courtesy_grants"] == "auto" else r["courtesy_grants"]


def label(r: dict) -> str:
    """How an automatic approval is recorded (approval.result.approved_by, audit)."""
    return f"rule: auto up to {r['max_days']} days"


def put(store, body: RulesIn, actor: str = "console") -> tuple[dict, dict]:
    """Apply a change; returns (old, new). Audits only real changes."""
    from casedesk.app.store import now_iso
    old = get(store)
    new = dict(old)
    if body.courtesy_grants is not None:
        new["courtesy_grants"] = body.courtesy_grants
    if body.max_days is not None:
        new["max_days"] = body.max_days
    if new != old:
        store._x("INSERT INTO rules(app, data, updated_at) VALUES (?,?,?) ON CONFLICT(app) DO UPDATE SET "
                 "data=excluded.data, updated_at=excluded.updated_at", (app_key(), json.dumps(new), now_iso()))
        store.audit(actor, "rules_changed", None, {"summary": f"rules changed: grants {summary(old)} → {summary(new)}",
                                                    "from": old, "to": new})
    return old, new


def view(r: dict) -> dict:
    """GET /api/rules: the editable rule, its limits and the locked rows (MCP-friendly: plain keys)."""
    return {"rules": r, "limits": {"modes": list(MODES), "min_days": MIN_DAYS, "max_days": MAX_DAYS,
                                   "cooldown_days": COOLDOWN_DAYS, "grant_states": sorted(GRANT_STATES)},
            "locked": LOCKED}


# ---------------------------------------------------------------- behaviour (called from main.phase2)
def drop_grants(actions: list) -> list:
    return [a for a in actions if getattr(a, "kind", None) != "PROPOSE_GRANT"]


def _when(v: Any) -> datetime | None:
    if not v:
        return None
    try:
        from casedesk.engine.state import _utc
        return _utc(datetime.fromisoformat(str(v).replace("Z", "+00:00")))
    except (ValueError, TypeError):
        return None


def auto_block(r: dict, days: int | None, state: Any, history: list[dict] | None, now: datetime) -> str | None:
    """Why an automatic grant is NOT allowed (None = allowed). Enforced here in code, on top of policy.decide and
    the approve-time grant_recheck that the shared approve path runs afterwards."""
    if r.get("courtesy_grants") != "auto":
        return "rule_not_auto"
    if days is None or int(days) > int(r["max_days"]) or int(days) < MIN_DAYS:
        return "over_limit"
    if getattr(state, "code", None) not in GRANT_STATES:
        return "state_not_allowed"
    sub = getattr(state, "primary", None)
    if sub is None or not ever_paid(sub):
        return "never_paid"
    if is_refunded(sub) or getattr(state, "code", None) == "REFUNDED":
        return "refunded"
    if any(is_refunded(s) for s in (getattr(state, "others", None) or [])):
        return "refunded"   # conservative: a refund on any of the user's subscriptions keeps it with the owner
    cutoff = now - timedelta(days=COOLDOWN_DAYS)
    for h in history or []:
        a = (h or {}).get("approval") or {}
        if a.get("status") in ("pending", "approved", "failed"):
            when = _when(a.get("decided_at") or a.get("created_at"))
            if when is None or when >= cutoff:
                return "granted_recently"
    return None


def reset_to_pending(store, approval_id: str, why: str) -> None:
    """An automatic approval failed at Adapty: put it back as a normal pending request for the owner."""
    store._x("UPDATE approvals SET status='pending', decided_at=NULL, result=? WHERE id=? AND status='failed'",
             (json.dumps({"auto_failed": why}), approval_id))


_ACTIVE = {
    "en": "Good news: a {days}-day courtesy extension is active on your account now, until {date}. Reopen the app to see it.",
    "sr": "Dobra vest: produženje pristupa od {days} dana je sada aktivno na vašem nalogu, do {date}. Ponovo otvorite aplikaciju da ga vidite.",
    "es": "Buenas noticias: una extensión de cortesía de {days} días ya está activa en tu cuenta, hasta el {date}. Vuelve a abrir la app para verla.",
    "de": "Gute Nachricht: Eine Kulanzverlängerung um {days} Tage ist jetzt auf deinem Konto aktiv, bis {date}. Öffne die App neu, um sie zu sehen.",
    "pt": "Boa notícia: uma extensão de cortesia de {days} dias já está ativa na sua conta, até {date}. Abra o app novamente para vê-la.",
    "fr": "Bonne nouvelle : une prolongation de courtoisie de {days} jours est active sur votre compte, jusqu'au {date}. Rouvrez l'application pour la voir.",
    "it": "Buone notizie: un'estensione di cortesia di {days} giorni è attiva sul tuo account, fino al {date}. Riapri l'app per vederla.",
    "ru": "Хорошая новость: продление доступа на {days} дн. уже действует на вашем аккаунте, до {date}. Откройте приложение заново, чтобы увидеть его.",
}


def active_sentence(language: str | None, days: int, expires: datetime) -> str:
    """The reply's last sentence after an automatic grant really went through at Adapty (code-generated from the
    grant receipt, never by the LLM)."""
    lang = (language or "en").split("-")[0].lower()
    date = f"{expires.day} {expires:%B %Y}" if lang not in _ACTIVE or lang == "en" else f"{expires:%d.%m.%Y}"
    return _ACTIVE.get(lang, _ACTIVE["en"]).format(days=days, date=date)
