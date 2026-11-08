"""Which actions a case gets: decided from (state, intent type, facts) (contract: ARCH.md, non-negotiable 2).

The user's words never reach this module. Only `intent.type` and a few *typed, sanitised* claims are read
(`wants_refund: bool`, `claimed_store`/`claimed_platform`: closed enums, `claimed_amount`: digits). Free text,
language and injection flags never change the result, and no claim can add a grant or a refund promise.
`decide()` expands a fixed table of *slots* into concrete Actions for the user's store, then applies the fact checks
below.

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
  human     ESCALATE_TO_HUMAN (reason `user_requested_human` for HUMAN_REQUEST, `privacy_request` for
            PRIVACY_REQUEST, else `<STATE>:<INTENT>`)
  (empty)   no actions at all (ACKNOWLEDGEMENT, OTHER_APP, THIRD_PARTY_ACCOUNT): the reply is just text
Store links only exist for app_store / play_store: cancel / manage / payment / refund on any other store
(stripe, adapty, unknown) become a single ESCALATE_TO_HUMAN.

Decision table (rows: state; columns: intent type)
| state | CHARGED_AFTER_CANCEL | PAID_NO_ACCESS | REFUND_REQUEST | HOW_TO_CANCEL | RESTORE_NEW_DEVICE | BILLING_FAILED | STATUS_QUESTION | OTHER | UNRECOGNISED_CHARGE | FREE_ACCESS_REQUEST |
|---|---|---|---|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | explain! cancel refund | explain! restore | explain refund cancel | explain cancel | explain restore | explain! | explain | explain | explain refund cancel | explain |
| CANCELLED_PAID_UP | charge? | explain! restore | explain refund | explain | explain restore | explain! | explain | explain | explain refund | explain |
| TRIAL_ACTIVE | explain! cancel | explain! restore | explain! cancel | explain cancel | explain restore | explain! | explain | explain | explain! cancel | explain |
| TRIAL_CANCELLED | explain! | explain! restore | explain! | explain | explain restore | explain! | explain | explain | explain! | explain |
| GRACE_PERIOD | explain! cancel | explain! payment restore | explain refund | explain cancel | explain payment restore | explain payment | explain payment | explain | explain refund cancel | explain payment |
| BILLING_RETRY | explain! cancel | explain payment grant | explain refund | explain cancel | explain payment grant | explain payment grant | explain payment grant | explain | explain refund cancel | explain payment grant |
| EXPIRED_BILLING_ERROR | explain! | explain payment manage grant | explain refund | explain | explain payment manage grant | explain payment manage grant | explain payment manage grant | explain | explain refund | explain payment manage grant |
| EXPIRED_CANCELLED | charge? | explain! manage | explain refund | explain | explain manage | explain! | explain | explain | explain refund | explain manage |
| REFUNDED | explain! | explain! | explain! | explain | explain | explain | explain | explain | explain! | explain manage |
| LIFETIME | explain! | explain! restore | explain refund | explain | explain restore | explain! | explain | explain | explain refund | explain restore |
| GRANTED_BY_DEVELOPER | explain! human | explain! restore | explain! | explain | explain restore | explain | explain | explain | explain! | explain |
| FAMILY_SHARED | explain! | explain! restore | explain! | explain | explain restore | explain | explain | explain | explain! | explain |
| NO_PURCHASE | explain! restore human | explain! restore human | explain human | explain manage | explain restore human | explain human | explain | explain | explain! | explain manage restore |

| state | HUMAN_REQUEST | ACKNOWLEDGEMENT | OTHER_APP | PRIVACY_REQUEST | THIRD_PARTY_ACCOUNT | DISCOUNT_REQUEST |
|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | human | — | — | human | — | explain |
| CANCELLED_PAID_UP | human | — | — | human | — | explain |
| TRIAL_ACTIVE | human | — | — | human | — | explain |
| TRIAL_CANCELLED | human | — | — | human | — | explain |
| GRACE_PERIOD | human | — | — | human | — | explain |
| BILLING_RETRY | human | — | — | human | — | explain grant |
| EXPIRED_BILLING_ERROR | human | — | — | human | — | explain grant |
| EXPIRED_CANCELLED | human | — | — | human | — | explain |
| REFUNDED | human | — | — | human | — | explain |
| LIFETIME | human | — | — | human | — | explain |
| GRANTED_BY_DEVELOPER | human | — | — | human | — | explain |
| FAMILY_SHARED | human | — | — | human | — | explain |
| NO_PURCHASE | human | — | — | human | — | explain |

Fact checks applied after the table (in this order):
  H7 claims vs facts — for STATUS_QUESTION / CHARGED_AFTER_CANCEL / REFUND_REQUEST / PAID_NO_ACCESS /
     UNRECOGNISED_CHARGE: if
     claims.claimed_store (app_store|play_store) differs from the account's store, or claims.claimed_amount is not a
     number in the FactSheet (only checked when there is a `price`) -> the first action becomes explain! reason
     `charge_not_found` with params store_mismatch / amount_mismatch; refund paths are dropped (that charge is not on
     this account); a store mismatch adds ESCALATE_TO_HUMAN.
  H4 never charged — facts.ever_charged == "no" with REFUND_REQUEST, CHARGED_AFTER_CANCEL or UNRECOGNISED_CHARGE
     (not FAMILY_SHARED):
     explain! reason `nothing_charged` (`no_charge_on_account` for NO_PURCHASE / GRANTED_BY_DEVELOPER, and for
     CHARGED_AFTER_CANCEL in CANCELLED_PAID_UP / EXPIRED_CANCELLED), and no refund path.
  M5 charge? + claims.wants_refund — a contradicted charged-after-cancel claim still gets the store refund path when
     the user explicitly asks for a refund (and was charged).
  H5 restore — when the store is only guessed from the device (no purchase, no access level), RESTORE_PURCHASES_STEPS
     uses steps_key restore_generic, unless claims.claimed_platform (ios|android) names the store.

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
                                   RESTORE_KEYS, FactSheet, grant_access_level_id, grant_records, grant_window_open)
from casedesk.engine.state import CaseState, _utc, ever_paid, last_charge_at

ACTION_KINDS = ("EXPLAIN_STATUS", "MANAGE_SUBSCRIPTION_LINK", "CANCEL_STEPS", "REFUND_PATH_APPLE", "REFUND_PATH_GOOGLE",
                "RESTORE_PURCHASES_STEPS", "UPDATE_PAYMENT_METHOD", "PROPOSE_GRANT", "ESCALATE_TO_HUMAN")
INTENT_TYPES = ("CHARGED_AFTER_CANCEL", "PAID_NO_ACCESS", "REFUND_REQUEST", "HOW_TO_CANCEL", "RESTORE_NEW_DEVICE",
                "BILLING_FAILED", "STATUS_QUESTION", "OTHER", "UNRECOGNISED_CHARGE", "FREE_ACCESS_REQUEST",
                "HUMAN_REQUEST", "ACKNOWLEDGEMENT", "OTHER_APP",
                "PRIVACY_REQUEST", "THIRD_PARTY_ACCOUNT", "DISCOUNT_REQUEST")
# Intents whose column is the same in every state except DISCOUNT_REQUEST's grant (see _UNIFORM below).
UNIFORM_INTENTS = ("HUMAN_REQUEST", "ACKNOWLEDGEMENT", "OTHER_APP", "PRIVACY_REQUEST", "THIRD_PARTY_ACCOUNT",
                   "DISCOUNT_REQUEST")


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
                               "explain",                 "explain")
_row("CANCELLED_PAID_UP",      "charge?",                 "explain! restore",           "explain refund",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain")
_row("TRIAL_ACTIVE",           "explain! cancel",         "explain! restore",           "explain! cancel",
                               "explain cancel",          "explain restore",            "explain!",
                               "explain",                 "explain")
_row("TRIAL_CANCELLED",        "explain!",                "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain")
_row("GRACE_PERIOD",           "explain! cancel",         "explain! payment restore",   "explain refund",
                               "explain cancel",          "explain payment restore",    "explain payment",
                               "explain payment",         "explain")
_row("BILLING_RETRY",          "explain! cancel",         "explain payment grant",      "explain refund",
                               "explain cancel",          "explain payment grant",      "explain payment grant",
                               "explain payment grant",   "explain")
_row("EXPIRED_BILLING_ERROR",  "explain!",                "explain payment manage grant", "explain refund",
                               "explain",                 "explain payment manage grant", "explain payment manage grant",
                               "explain payment manage grant", "explain")
_row("EXPIRED_CANCELLED",      "charge?",                 "explain! manage",            "explain refund",
                               "explain",                 "explain manage",             "explain!",
                               "explain",                 "explain")
_row("REFUNDED",               "explain!",                "explain!",                   "explain!",
                               "explain",                 "explain",                    "explain",
                               "explain",                 "explain")
_row("LIFETIME",               "explain!",                "explain! restore",           "explain refund",
                               "explain",                 "explain restore",            "explain!",
                               "explain",                 "explain")
_row("GRANTED_BY_DEVELOPER",   "explain! human",          "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain",
                               "explain",                 "explain")
_row("FAMILY_SHARED",          "explain!",                "explain! restore",           "explain!",
                               "explain",                 "explain restore",            "explain",
                               "explain",                 "explain")
_row("NO_PURCHASE",            "explain! restore human",  "explain! restore human",     "explain human",
                               "explain manage",          "explain restore human",      "explain human",
                               "explain",                 "explain")

# Two state-dependent columns added after the head-to-head test (2026-11-08):
#   UNRECOGNISED_CHARGE  "why was I charged, I never bought anything": explain the charges the account shows and where
#                        to request a refund; never-charged accounts get explain! (H4) and no refund path.
#   FREE_ACCESS_REQUEST  "give me premium for free": explain what the account shows and what the user can do
#                        (subscribe / restore if they paid / fix payment). A grant only where one is already eligible
#                        (paid-only rule unchanged); store slots never escalate here (see decide()).
_NEW_COLS = {
    #  state                    UNRECOGNISED_CHARGE          FREE_ACCESS_REQUEST
    "ACTIVE_RENEWING":       ("explain refund cancel",    "explain"),
    "CANCELLED_PAID_UP":     ("explain refund",           "explain"),
    "TRIAL_ACTIVE":          ("explain! cancel",          "explain"),
    "TRIAL_CANCELLED":       ("explain!",                 "explain"),
    "GRACE_PERIOD":          ("explain refund cancel",    "explain payment"),
    "BILLING_RETRY":         ("explain refund cancel",    "explain payment grant"),
    "EXPIRED_BILLING_ERROR": ("explain refund",           "explain payment manage grant"),
    "EXPIRED_CANCELLED":     ("explain refund",           "explain manage"),
    "REFUNDED":              ("explain!",                 "explain manage"),
    "LIFETIME":              ("explain refund",           "explain restore"),
    "GRANTED_BY_DEVELOPER":  ("explain!",                 "explain"),
    "FAMILY_SHARED":         ("explain!",                 "explain"),
    "NO_PURCHASE":           ("explain!",                 "explain manage restore"),
}
for _state, (_unrec, _free) in _NEW_COLS.items():
    TABLE[_state]["UNRECOGNISED_CHARGE"] = tuple(_unrec.split())
    TABLE[_state]["FREE_ACCESS_REQUEST"] = tuple(_free.split())

# The six newer intents: same cells for every state, except DISCOUNT_REQUEST may carry a grant where one is already
# eligible (BILLING_RETRY / EXPIRED_BILLING_ERROR). Never `human` for a discount ask.
_UNIFORM = {"HUMAN_REQUEST": "human", "ACKNOWLEDGEMENT": "", "OTHER_APP": "", "PRIVACY_REQUEST": "human",
            "THIRD_PARTY_ACCOUNT": "", "DISCOUNT_REQUEST": "explain"}
for _state, _cells in TABLE.items():
    for _intent, _cell in _UNIFORM.items():
        if _intent == "DISCOUNT_REQUEST" and _state in ("BILLING_RETRY", "EXPIRED_BILLING_ERROR"):
            _cell = "explain grant"
        _cells[_intent] = tuple(_cell.split())
_HUMAN_REASONS = {"HUMAN_REQUEST": "user_requested_human", "PRIVACY_REQUEST": "privacy_request"}

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
    "UNRECOGNISED_CHARGE": {"TRIAL_ACTIVE": "nothing_charged", "TRIAL_CANCELLED": "nothing_charged",
                            "REFUNDED": "already_refunded", "GRANTED_BY_DEVELOPER": "no_charge_on_account",
                            "FAMILY_SHARED": "organizer_pays", "NO_PURCHASE": "no_charge_on_account"},
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


def recent_grant(history: Iterable[Any] | None, now: datetime, statuses=("pending", "approved")) -> bool:
    """Was a grant with one of `statuses` recorded for this user within the 90-day cooldown? Denied (and failed)
    proposals never count. A record without any timestamp counts (conservative)."""
    cutoff = _utc(now) - timedelta(days=GRANT_COOLDOWN_DAYS)
    return any(st in statuses and (when is None or when >= cutoff) for st, when in grant_records(history))


def grant_eligible(state: CaseState, facts: FactSheet, history, now: datetime | None = None) -> bool:
    now = _utc(now or facts.as_of or datetime.now(timezone.utc))
    return grant_window_open(state, now) and not recent_grant(history, now)


def grant_recheck(state: CaseState, facts: FactSheet, history, now: datetime | None = None) -> tuple[bool, str]:
    """Approve-time re-check (bug bash O4). Call with a FRESH state/facts (re-classified at approval time) and the
    user's history. Pending requests are ignored (the one being approved is pending itself); an approved grant in
    the last 90 days, a closed window, a state change (e.g. the user resubscribed) or a never-paid subscription all
    block. Returns (ok, reason) with reason in {ok, state_changed, window_closed, never_paid, granted_recently}."""
    now = _utc(now or facts.as_of or datetime.now(timezone.utc))
    if state.code not in ("BILLING_RETRY", "EXPIRED_BILLING_ERROR"):
        return False, "state_changed"
    if state.primary is None or not ever_paid(state.primary):
        return False, "never_paid"
    if not grant_window_open(state, now):
        return False, "window_closed"
    if recent_grant(history, now, statuses=("approved",)):
        return False, "granted_recently"
    return True, "ok"


def grant_still_eligible(state: CaseState, facts: FactSheet, history, now: datetime | None = None) -> bool:
    """Boolean form of `grant_recheck` for the app's approve endpoint."""
    return grant_recheck(state, facts, history, now)[0]


# --------------------------------------------------------------------------- claims (typed, sanitised only)

_CHARGE_TOPICS = {"STATUS_QUESTION", "CHARGED_AFTER_CANCEL", "REFUND_REQUEST", "PAID_NO_ACCESS", "UNRECOGNISED_CHARGE"}
_PLATFORM_STORE = {"ios": "app_store", "android": "play_store"}


def _claims(intent: Any) -> dict:
    c = intent.get("claims") if isinstance(intent, dict) else getattr(intent, "claims", None)
    return c if isinstance(c, dict) else {}


def claim_mismatch(claims: dict, facts: FactSheet, intent_type: str) -> tuple[bool, bool]:
    """(store_mismatch, amount_mismatch) — same rule as casedesk.ai.templates.charge_claim_mismatch (copied, the
    engine must not import ai): a claimed app_store/play_store that differs from the account's store, or a claimed
    amount that is none of the FactSheet's numbers (only checked when the sheet has a `price`)."""
    if intent_type not in _CHARGE_TOPICS:
        return False, False
    store = facts.fields.get("store")
    cs = claims.get("claimed_store")
    store_mm = bool(cs in ("app_store", "play_store") and store in ("app_store", "play_store") and cs != store)
    amt = claims.get("claimed_amount")
    amount_mm = False
    if isinstance(amt, str) and amt and facts.fields.get("price"):
        variants = {amt, amt.replace(".", ",")}
        if "." in amt and amt.split(".")[1].strip("0") == "":
            variants.add(amt.split(".")[0])
        amount_mm = not (variants & {str(x) for x in facts.allowed_numbers})
    return store_mm, amount_mm


def _never_charged_reason(state_code: str, itype: str) -> str:
    if state_code in ("NO_PURCHASE", "GRANTED_BY_DEVELOPER"):
        return "no_charge_on_account"
    if itype == "CHARGED_AFTER_CANCEL" and state_code in ("CANCELLED_PAID_UP", "EXPIRED_CANCELLED"):
        return "no_charge_on_account"   # B1: a trial cancelled before it converted
    return "nothing_charged"


def _explain(state: CaseState, contradicted: bool, reason: str | None = None, **extra) -> Action:
    params: dict = {"state": state.code, "claim_contradicted": contradicted}
    if reason:
        params["reason"] = reason
    params.update(extra)
    return Action(kind="EXPLAIN_STATUS", params=params)


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
    """Actions for this case. `intent` may be an Intent (uses `.type` and the typed claims listed in the module
    docstring) or the type string; unknown types are treated as OTHER. `now` defaults to facts.as_of."""
    itype = intent if isinstance(intent, str) else getattr(intent, "type", "OTHER")
    itype = str(getattr(itype, "value", itype))
    if itype not in INTENT_TYPES:
        itype = "OTHER"
    claims = {} if isinstance(intent, str) else _claims(intent)
    now = _utc(now or facts.as_of or datetime.now(timezone.utc))
    store = facts.fields.get("store") or (state.primary.store if state.primary else None)
    never_charged = facts.fields.get("ever_charged") == "no" and state.code != "FAMILY_SHARED"

    slots = list(slots_for(state.code, itype))
    if slots == ["charge?"]:
        after = charge_after_cancel(state)
        if after:
            slots = ["explain", "refund", "human"]
        else:
            slots = ["explain!"]
            if claims.get("wants_refund") is True and not never_charged:   # M5
                slots.append("refund")

    # H4: nothing was ever charged -> say so, never send them to a refund form.
    h4_reason = None
    if never_charged and itype in ("REFUND_REQUEST", "CHARGED_AFTER_CANCEL", "UNRECOGNISED_CHARGE"):
        h4_reason = _never_charged_reason(state.code, itype)
        slots = [("explain!" if sl == "explain" else sl) for sl in slots if sl != "refund"]

    # H7: the claimed charge is not this account's.
    store_mm, amount_mm = claim_mismatch(claims, facts, itype)
    if store_mm or amount_mm:
        slots = [("explain!" if sl == "explain" else sl) for sl in slots if sl != "refund"]
        if store_mm and "human" not in slots:
            slots.append("human")

    out: list[Action] = []
    for slot in slots:
        if slot == "explain":
            out.append(_explain(state, False))
        elif slot == "explain!":
            if store_mm or amount_mm:
                out.append(_explain(state, True, "charge_not_found", store_mismatch=store_mm,
                                    amount_mismatch=amount_mm))
                continue
            if h4_reason:
                out.append(_explain(state, True, h4_reason))
                continue
            reason = _contradiction_reason(state.code, itype)
            if itype == "CHARGED_AFTER_CANCEL" and state.code in ("CANCELLED_PAID_UP", "EXPIRED_CANCELLED"):
                if state.primary is not None and last_charge_at(state.primary) is None:
                    reason = "no_charge_on_account"   # a free trial cancelled before it converted: never charged
                else:
                    reason = ("charged_before_cancel" if charge_after_cancel(state) is False
                              else "no_cancellation_recorded")
            out.append(_explain(state, True, reason))
        elif slot in _STORE_SLOTS:
            if itype == "FREE_ACCESS_REQUEST" and store not in MANAGE_URLS:
                continue   # a free-access ask is never worth a human ticket: no store link, no escalation
            out.extend(_store_actions(slot, store))
        elif slot == "restore":
            guessed = state.primary is None and state.access_level is None
            rstore, key = store or "unknown", facts.fields.get("restore_steps_key", "restore_generic")
            if guessed:
                rstore, key = "unknown", "restore_generic"
                claimed = _PLATFORM_STORE.get(str(claims.get("claimed_platform") or claims.get("platform") or "")
                                              .lower())
                if claimed:
                    rstore, key = claimed, RESTORE_KEYS[claimed]
            out.append(Action(kind="RESTORE_PURCHASES_STEPS", params={"store": rstore, "steps_key": key}))
        elif slot == "grant":
            if grant_eligible(state, facts, history, now):
                out.append(Action(kind="PROPOSE_GRANT", requires_approval=True, params={
                    "access_level_id": grant_access_level_id(state), "days": GRANT_DAYS,
                    "expires_at": (now + timedelta(days=GRANT_DAYS)).isoformat(), "reason": state.code}))
        elif slot == "human":
            out.append(Action(kind="ESCALATE_TO_HUMAN",
                              params={"reason": _HUMAN_REASONS.get(itype, f"{state.code}:{itype}")}))
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
    """The decision table as markdown (docs/policy.md and this module's docstring embed exactly this; a test keeps
    them in sync). Two tables: the state-dependent intents, then the six uniform ones ("—" = no actions)."""
    def cell(t):
        return " ".join(t) or "—"
    main = [c for c in INTENT_TYPES if c not in UNIFORM_INTENTS]
    lines = ["| state | " + " | ".join(main) + " |", "|---" * (len(main) + 1) + "|"]
    for state, row in TABLE.items():
        lines.append(f"| {state} | " + " | ".join(cell(row[i]) for i in main) + " |")
    lines += ["", "| state | " + " | ".join(UNIFORM_INTENTS) + " |", "|---" * (len(UNIFORM_INTENTS) + 1) + "|"]
    for state, row in TABLE.items():
        lines.append(f"| {state} | " + " | ".join(cell(row[i]) for i in UNIFORM_INTENTS) + " |")
    return "\n".join(lines)
