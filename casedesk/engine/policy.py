"""Which actions a case gets: decided from (state, intent type) only (contract: ARCH.md, non-negotiable 2).

The user's words never reach this module except as `intent.type`; claims, language and injection flags do not change
the result. `decide()` expands a fixed table of *slots* into concrete Actions for the user's store.

Slots
  explain   EXPLAIN_STATUS
  explain!  EXPLAIN_STATUS with params.claim_contradicted=True: the user's claim does not match the facts, so the
            reply leads with what is actually true (e.g. "you cancelled on X, the last charge was on Y, before that")
  charge?   CHARGED_AFTER_CANCEL check: if the last charge happened on/before the cancellation (or no cancellation is
            recorded and nothing renews) -> explain!; if a charge really came after the cancellation ->
            explain + refund + human
  cancel    CANCEL_STEPS + MANAGE_SUBSCRIPTION_LINK
  manage    MANAGE_SUBSCRIPTION_LINK (resubscribe / see subscriptions in the store)
  refund    REFUND_PATH_APPLE (app_store) | REFUND_PATH_GOOGLE (play_store) | ESCALATE_TO_HUMAN (any other store)
  restore   RESTORE_PURCHASES_STEPS
  payment   UPDATE_PAYMENT_METHOD
  grant     PROPOSE_GRANT, requires_approval=True, only if the ARCH grant policy allows it (see below)
  human     ESCALATE_TO_HUMAN
Store links only exist for app_store / play_store: cancel / manage / payment / refund on any other store
(stripe, adapty, unknown) become a single ESCALATE_TO_HUMAN.

Decision table (rows: state; columns: intent type)
| state | CHARGED_AFTER_CANCEL | PAID_NO_ACCESS | REFUND_REQUEST | HOW_TO_CANCEL | RESTORE_NEW_DEVICE | BILLING_FAILED | STATUS_QUESTION | OTHER |
|---|---|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | explain! cancel refund | explain! restore | explain refund cancel | explain cancel | explain restore | explain! | explain | explain human |
| CANCELLED_PAID_UP | charge? | explain! restore | explain refund | explain | explain restore | explain! | explain | explain human |
| TRIAL_ACTIVE | explain! cancel | explain! restore | explain! cancel | explain cancel | explain restore | explain! | explain | explain human |
| TRIAL_CANCELLED | explain! | explain! restore | explain! | explain | explain restore | explain! | explain | explain human |
| GRACE_PERIOD | explain! cancel | explain! payment restore | explain refund | explain cancel | explain payment restore | explain payment | explain payment | explain human |
| BILLING_RETRY | explain! cancel | explain payment grant | explain refund | explain cancel | explain payment grant | explain payment grant | explain payment grant | explain payment human |
| EXPIRED_BILLING_ERROR | explain! | explain payment manage grant | explain refund | explain | explain payment manage grant | explain payment manage grant | explain payment manage grant | explain human |
| EXPIRED_CANCELLED | charge? | explain! manage | explain refund | explain | explain manage | explain! | explain | explain human |
| REFUNDED | explain! | explain! | explain! | explain | explain | explain | explain | explain human |
| LIFETIME | explain! | explain! restore | explain refund | explain | explain restore | explain! | explain | explain human |
| GRANTED_BY_DEVELOPER | explain! human | explain! restore | explain! | explain | explain restore | explain | explain | explain human |
| FAMILY_SHARED | explain! | explain! restore | explain! | explain | explain restore | explain | explain | explain human |
| NO_PURCHASE | explain! restore human | explain! restore human | explain human | explain manage | explain restore human | explain human | explain | explain human |

Grant policy (ARCH): PROPOSE_GRANT only when
  - state is BILLING_RETRY, or EXPIRED_BILLING_ERROR whose expiry is at most 14 days before `now`
    (GRACE_PERIOD is allowed by ARCH but not used: the user still has access during grace);
  - and the subscription has at least one paid, non-refunded transaction (lead decision 2026-11-07): a failed
    free-trial conversion gets explain + UPDATE_PAYMENT_METHOD, no grant;
  - and the user has no grant approved or pending in the last 90 days (history);
  - always 3 days, always requires_approval=True. The user is told it was requested, never promised.
Refunds: REFUND_PATH_APPLE always says Apple decides (developer_can_refund=False); REFUND_PATH_GOOGLE says the user
requests in Google Play (promise=False). Neither path ever promises a refund.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Protocol

from pydantic import BaseModel

from casedesk.engine.facts import (GRANT_COOLDOWN_DAYS, GRANT_DAYS, MANAGE_URLS, PAYMENT_URLS, REFUND_URLS,
                                   FactSheet, grant_access_level_id, grant_window_open)
from casedesk.engine.state import CaseState, _utc, last_charge_at

ACTION_KINDS = ("EXPLAIN_STATUS", "MANAGE_SUBSCRIPTION_LINK", "CANCEL_STEPS", "REFUND_PATH_APPLE", "REFUND_PATH_GOOGLE",
                "RESTORE_PURCHASES_STEPS", "UPDATE_PAYMENT_METHOD", "PROPOSE_GRANT", "ESCALATE_TO_HUMAN")
INTENT_TYPES = ("CHARGED_AFTER_CANCEL", "PAID_NO_ACCESS", "REFUND_REQUEST", "HOW_TO_CANCEL", "RESTORE_NEW_DEVICE",
                "BILLING_FAILED", "STATUS_QUESTION", "OTHER")


class Action(BaseModel):
    kind: str
    params: dict = {}
    requires_approval: bool = False


class IntentLike(Protocol):
    """Anything with a `.type` string (casedesk.ai.intent.Intent fits). decide() also accepts a bare str."""
    type: str


# Columns in INTENT_TYPES order:
#   CHARGED_AFTER_CANCEL | PAID_NO_ACCESS | REFUND_REQUEST | HOW_TO_CANCEL | RESTORE_NEW_DEVICE | BILLING_FAILED |
#   STATUS_QUESTION | OTHER
_C = "CHARGED_AFTER_CANCEL PAID_NO_ACCESS REFUND_REQUEST HOW_TO_CANCEL RESTORE_NEW_DEVICE BILLING_FAILED " \
     "STATUS_QUESTION OTHER".split()
TABLE: dict[str, dict[str, tuple[str, ...]]] = {}


def _row(state: str, *cells: str) -> None:
    assert len(cells) == len(_C), state
    TABLE[state] = {intent: tuple(c.split()) for intent, c in zip(_C, cells)}


#     state                    CHARGED_AFTER_CANCEL       PAID_NO_ACCESS                REFUND_REQUEST
#                              HOW_TO_CANCEL              RESTORE_NEW_DEVICE            BILLING_FAILED
#                              STATUS_QUESTION            OTHER
_row("ACTIVE_RENEWING",        "explain! cancel refund",  "explain! restore",           "explain refund cancel",
                               "explain cancel",          "explain restore",            "explain!",
                               "explain",                 "explain human")
_row("CANCELLED_PAID_UP",      "charge?",                 "explain! restore",           "explain refund",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain human")
_row("TRIAL_ACTIVE",           "explain! cancel",         "explain! restore",           "explain! cancel",
                               "explain cancel",          "explain restore",            "explain!",
                               "explain",                 "explain human")
_row("TRIAL_CANCELLED",        "explain!",                "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain human")
_row("GRACE_PERIOD",           "explain! cancel",         "explain! payment restore",   "explain refund",
                               "explain cancel",          "explain payment restore",    "explain payment",
                               "explain payment",         "explain human")
_row("BILLING_RETRY",          "explain! cancel",         "explain payment grant",      "explain refund",
                               "explain cancel",          "explain payment grant",      "explain payment grant",
                               "explain payment grant",   "explain payment human")
_row("EXPIRED_BILLING_ERROR",  "explain!",                "explain payment manage grant", "explain refund",
                               "explain",                 "explain payment manage grant", "explain payment manage grant",
                               "explain payment manage grant", "explain human")
_row("EXPIRED_CANCELLED",      "charge?",                 "explain! manage",            "explain refund",
                               "explain",                 "explain manage",             "explain!",
                               "explain",                 "explain human")
_row("REFUNDED",               "explain!",                "explain!",                   "explain!",
                               "explain",                 "explain",                    "explain",
                               "explain",                 "explain human")
_row("LIFETIME",               "explain!",                "explain! restore",           "explain refund",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain human")
_row("GRANTED_BY_DEVELOPER",   "explain! human",          "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain",
                               "explain",                 "explain human")
_row("FAMILY_SHARED",          "explain!",                "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain",
                               "explain",                 "explain human")
_row("NO_PURCHASE",            "explain! restore human",  "explain! restore human",     "explain human",
                               "explain manage",          "explain restore human",      "explain human",
                               "explain",                 "explain human")

# Why the claim is contradicted, per (state, intent) where the slot is explain! — handed to the composer as a key.
_CONTRADICTION = {
    "CHARGED_AFTER_CANCEL": {
        "ACTIVE_RENEWING": "not_cancelled", "TRIAL_ACTIVE": "not_cancelled", "GRACE_PERIOD": "not_cancelled",
        "BILLING_RETRY": "not_cancelled", "TRIAL_CANCELLED": "nothing_charged", "EXPIRED_BILLING_ERROR":
        "renewal_charge_failed", "REFUNDED": "already_refunded", "LIFETIME": "one_time_purchase",
        "GRANTED_BY_DEVELOPER": "no_charge_on_account", "FAMILY_SHARED": "organizer_pays",
        "NO_PURCHASE": "no_charge_on_account",
    },
    "PAID_NO_ACCESS": {"REFUNDED": "refund_ended_access", "EXPIRED_CANCELLED": "period_ended",
                       "NO_PURCHASE": "no_purchase_on_account"},
    "REFUND_REQUEST": {"TRIAL_ACTIVE": "nothing_charged", "TRIAL_CANCELLED": "nothing_charged",
                       "REFUNDED": "already_refunded", "GRANTED_BY_DEVELOPER": "nothing_charged",
                       "FAMILY_SHARED": "organizer_must_request"},
    "BILLING_FAILED": {"_default": "payment_ok"},
}

_STORE_SLOTS = {"cancel", "manage", "payment", "refund"}


def _contradiction_reason(state: str, intent: str) -> str:
    by_state = _CONTRADICTION.get(intent, {})
    if state in by_state:
        return by_state[state]
    if "_default" in by_state:
        return by_state["_default"]
    if intent == "PAID_NO_ACCESS":
        return "has_access"
    return "claim_does_not_match"


def charge_after_cancel(state: CaseState) -> bool | None:
    """True if a charge happened after the user turned auto-renew off; False if not; None if no cancellation date."""
    s = state.primary
    if s is None or s.unsubscribed_at is None:
        return None
    charged = last_charge_at(s)
    return charged is not None and charged > _utc(s.unsubscribed_at)


def _parse_dt(v: Any) -> datetime | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return _utc(v)
    try:
        return _utc(datetime.fromisoformat(str(v).replace("Z", "+00:00")))
    except ValueError:
        return None


def recent_grant(history: Iterable[Any] | None, now: datetime) -> bool:
    """Was a grant approved or still pending for this user within the cooldown window?

    Accepts the app's case records ({"created_at", "approval": {"status", "decided_at", ...}}) and, for convenience,
    flat records ({"kind": "PROPOSE_GRANT", "status", "at"/"created_at"}) or Action-like objects.
    Denied proposals do not count (no access was given)."""
    cutoff = _utc(now) - timedelta(days=GRANT_COOLDOWN_DAYS)
    for h in history or []:
        rec = h if isinstance(h, dict) else getattr(h, "__dict__", {})
        appr = rec.get("approval")
        if isinstance(appr, dict):
            status = appr.get("status")
            when = max(filter(None, [_parse_dt(appr.get("decided_at")), _parse_dt(rec.get("created_at"))]),
                       default=None)
        elif rec.get("kind") in ("PROPOSE_GRANT", "GRANT"):
            status = rec.get("status", "pending")
            when = _parse_dt(rec.get("at") or rec.get("created_at") or rec.get("decided_at"))
        else:
            continue
        if status not in ("pending", "approved"):
            continue
        if when is None or when >= cutoff:   # unknown time: be conservative, count it
            return True
    return False


def grant_eligible(state: CaseState, facts: FactSheet, history, now: datetime | None = None) -> bool:
    now = _utc(now or facts.as_of or datetime.now(timezone.utc))
    return grant_window_open(state, now) and not recent_grant(history, now)


def _store_actions(slot: str, store: str | None) -> list[Action]:
    if store not in MANAGE_URLS:
        return [Action(kind="ESCALATE_TO_HUMAN", params={"reason": f"no_store_self_service:{store or 'unknown'}"})]
    manage = Action(kind="MANAGE_SUBSCRIPTION_LINK", params={"store": store, "url": MANAGE_URLS[store]})
    if slot == "cancel":
        return [Action(kind="CANCEL_STEPS", params={"store": store, "url": MANAGE_URLS[store]}), manage]
    if slot == "manage":
        return [manage]
    if slot == "payment":
        return [Action(kind="UPDATE_PAYMENT_METHOD", params={"store": store, "url": PAYMENT_URLS[store]})]
    if store == "app_store":   # refund
        return [Action(kind="REFUND_PATH_APPLE", params={"store": store, "url": REFUND_URLS[store],
                                                         "decided_by": "apple", "developer_can_refund": False,
                                                         "promise": False})]
    return [Action(kind="REFUND_PATH_GOOGLE", params={"store": store, "url": REFUND_URLS[store],
                                                      "decided_by": "google", "developer_can_refund": True,
                                                      "promise": False})]


def slots_for(state_code: str, intent_type: str) -> tuple[str, ...]:
    row = TABLE.get(state_code, TABLE["NO_PURCHASE"])
    return row.get(intent_type, row["OTHER"])


def decide(state: CaseState, intent: IntentLike | str, facts: FactSheet, history=None,
           now: datetime | None = None) -> list[Action]:
    """Actions for this case. `intent` may be an Intent (uses only `.type`) or the type string; unknown types are
    treated as OTHER. `now` defaults to facts.as_of. Pure function of (state, intent type, facts, history)."""
    itype = intent if isinstance(intent, str) else getattr(intent, "type", "OTHER")
    itype = str(getattr(itype, "value", itype))
    if itype not in INTENT_TYPES:
        itype = "OTHER"
    now = _utc(now or facts.as_of or datetime.now(timezone.utc))
    store = facts.fields.get("store") or (state.primary.store if state.primary else None)

    slots = list(slots_for(state.code, itype))
    if slots == ["charge?"]:
        after = charge_after_cancel(state)
        slots = ["explain", "refund", "human"] if after else ["explain!"]

    out: list[Action] = []
    for slot in slots:
        if slot == "explain":
            out.append(Action(kind="EXPLAIN_STATUS", params={"state": state.code, "claim_contradicted": False}))
        elif slot == "explain!":
            reason = _contradiction_reason(state.code, itype)
            if itype == "CHARGED_AFTER_CANCEL" and state.code in ("CANCELLED_PAID_UP", "EXPIRED_CANCELLED"):
                if state.primary is not None and last_charge_at(state.primary) is None:
                    reason = "no_charge_on_account"   # a free trial cancelled before it converted: never charged
                else:
                    reason = ("charged_before_cancel" if charge_after_cancel(state) is False
                              else "no_cancellation_recorded")
            out.append(Action(kind="EXPLAIN_STATUS", params={"state": state.code, "claim_contradicted": True,
                                                             "reason": reason}))
        elif slot in _STORE_SLOTS:
            out.extend(_store_actions(slot, store))
        elif slot == "restore":
            out.append(Action(kind="RESTORE_PURCHASES_STEPS",
                              params={"store": store or "unknown",
                                      "steps_key": facts.fields.get("restore_steps_key", "restore_generic")}))
        elif slot == "grant":
            if grant_eligible(state, facts, history, now):
                out.append(Action(kind="PROPOSE_GRANT", requires_approval=True, params={
                    "access_level_id": grant_access_level_id(state), "days": GRANT_DAYS,
                    "expires_at": (now + timedelta(days=GRANT_DAYS)).isoformat(), "reason": state.code}))
        elif slot == "human":
            out.append(Action(kind="ESCALATE_TO_HUMAN", params={"reason": f"{state.code}:{itype}"}))
        else:  # pragma: no cover - table typo
            raise ValueError(f"unknown slot {slot}")

    # One escalation is enough; keep first occurrence of every other (kind, params) too.
    seen: set[str] = set()
    deduped: list[Action] = []
    for a in out:
        key = a.kind if a.kind == "ESCALATE_TO_HUMAN" else a.model_dump_json()
        if key not in seen:
            seen.add(key)
            deduped.append(a)
    return deduped


def render_table() -> str:
    """The decision table as markdown (docs/policy.md embeds exactly this; a test keeps them in sync)."""
    lines = ["| state | " + " | ".join(_C) + " |", "|---" * (len(_C) + 1) + "|"]
    for state, row in TABLE.items():
        lines.append(f"| {state} | " + " | ".join(" ".join(row[i]) for i in _C) + " |")
    return "\n".join(lines)

