"""Reply composition: the LLM phrases, code owns the facts, the validator decides.

reply(intent, state, facts, actions, language, history=None) -> Reply(text, used_fallback, violations, ...)

1. The writer LLM gets a case file with ONLY: the FactSheet fields, the decided actions (kind + safe params), the state
   code, the user's language, and a sanitised view of the request (intent type, whitelisted boolean/enum claim flags,
   whether this is a follow-up, and our own previous reply). It never sees the user's words, so injected text cannot
   reach the writer.
2. validate.check(); on violations → one retry that lists the violations; still failing (or any LLM error/timeout)
   → templates.render(). `violations` keeps everything the LLM got wrong, for the console.
3. For languages the validator's phrase patterns do not cover, the writer also returns an English back-translation,
   and the promise / claimed-action checks run on both.
"""
from __future__ import annotations

import json
import re
from typing import Any, Iterable

from pydantic import BaseModel, Field

from casedesk.ai import templates, validate
from casedesk.ai.llm import LLM, LLMError, compose_model, get_llm, parse_json

LANG_NAMES = {
    "en": "English", "sr": "Serbian (Latin script), formal 'vi'", "sr-Latn": "Serbian (Latin script), formal 'vi'",
    "sr-Cyrl": "Serbian (Cyrillic script), formal 'ви'", "es": "Spanish, informal 'tú'",
    "de": "German, formal 'Sie' throughout (never 'du')", "pt": "Portuguese (Brazilian), 'você'",
    "ru": "Russian, formal 'вы'", "fr": "French, formal 'vous'", "it": "Italian, formal 'Lei'",
    "hr": "Croatian, formal 'vi'", "bs": "Bosnian, formal 'vi'", "hu": "Hungarian, formal 'Ön'",
    "tr": "Turkish, formal 'siz'", "pl": "Polish, formal 'Pan/Pani'", "nl": "Dutch, formal 'u'",
}
# Languages whose refund-promise / claimed-action phrases the validator knows. Others also get an English gloss.
VALIDATED_LANGS = {"en", "sr", "es", "de", "pt", "ru", "fr", "it", "hu", "tr", "pl", "nl", "hr", "bs"}
# Action params the writer may see. Anything else (expires_at timestamps, ids) stays out of the prompt.
_SAFE_PARAMS = {"claim_contradicted", "reason", "store", "url", "decided_by", "developer_can_refund", "promise",
                "steps_key", "own_account_only", "cannot_act_for_user", "store_mismatch", "amount_mismatch"}
# Fact fields the writer does not need (clock leaks, internals).
_HIDDEN_FACTS = {"as_of", "state", "refund_policy", "restore_steps_key", "days_since_expired"}
# Claim flags the writer may see (booleans / closed enums only — never amounts, dates or free text).
_WRITER_FLAGS = {"wants_refund", "wants_to_cancel", "says_cancelled", "says_charged", "says_new_device", "says_paid",
                 "says_no_access", "wants_human", "thanks", "angry", "wants_agent_to_act", "chargeback_threat",
                 "third_party_account", "about_other_app", "privacy_request", "discount_request", "says_never_bought",
                 "wants_free_access", "says_tried_restore"}


# No follow-up offer on these (the reply is a hand-off, a thank-you or off-topic). Escalations are added in case_file.
_NO_FOLLOW_UP_INTENTS = {"ACKNOWLEDGEMENT", "OTHER_APP", "THIRD_PARTY_ACCOUNT", "HUMAN_REQUEST", "PRIVACY_REQUEST"}


class Reply(BaseModel):
    text: str
    used_fallback: bool = False
    violations: list[str] = Field(default_factory=list)
    source: str = "template"  # "llm" | "llm_retry" | "template"
    attempts: int = 0


COMPOSE_SYSTEM = """You write the reply that a subscription app's in-app help sends to one of its users.
You receive a JSON case file with: "language" (and "language_name" with the register to use), "state" (the user's
subscription state, decided by code), "facts" (the ONLY facts you may state), "actions" (what the system decided to
do or tell, in order) and "request" (what kind of message the user sent, as flags, not their words).

Write the reply:
- In the requested language, script and register. Warm, calm, plain words, like a kind human; at most 80 words; plain
  text, no markdown, no lists, no greeting line, no sign-off.
- Never use em dashes (—) or en dashes (–) as punctuation. Use a comma, a colon or a separate sentence instead.
- Answer the CURRENT request first. If request.status_already_given is true, do NOT restate the whole status again;
  answer only the new question (you may refer back briefly). request.previous_reply is what you said last turn.
- Use ONLY the facts given. Copy dates, prices and numbers exactly as in "facts" (you may write an ISO date as a normal
  date in the user's language, e.g. 2026-11-03 → 3 November 2026). Never invent or compute a number, date, price,
  percentage, duration, deadline, e-mail, phone number or URL. No relative time ("3 days from now", "as of …").
- URLs: only those that appear in "facts", copied exactly.
- Never present a price as paid unless facts has last_charged_on. If facts.ever_charged is "no", say plainly that no
  payment was ever taken. For a trial, a price is what it WILL cost after the trial (price_after_trial if given).
  If facts.cancel_before is given for a trial, say to cancel before that date to avoid the charge.
- Only talk about refunds when a REFUND_PATH action is present. Never promise or announce a refund ("we will refund
  you", "refund issued" are forbidden, in any language).
- Never say you did something that is not an action below (no "I've restored / granted / cancelled / unlocked").
- If facts.grant_request is "pending" (or facts.pending_grant is "yes"): say the courtesy-extension request is still
  being reviewed by the team and is not active yet. Never say it was granted.
- Cover every action, in order:
  EXPLAIN_STATUS: explain the state in one or two sentences. If params.claim_contradicted is true, gently lead with
    what is actually true (params.reason, e.g. charged_before_cancel = the last charge happened before they turned off
    renewal; not_cancelled = no cancellation exists; charge_not_found = say clearly "I don't see that charge on your
    {app} account", it may be another Apple ID/Google account or another app, check the store's purchase history;
    nothing_charged / never_charged = no payment was taken).
  CANCEL_STEPS: how to cancel in their store (App Store: Settings > your name > Subscriptions; Google Play: profile >
    Payments & subscriptions > Subscriptions), plus manage_url. If request.wants_agent_to_act: say you cannot cancel
    for them; only they can, from their own Apple ID / Google account.
  MANAGE_SUBSCRIPTION_LINK: give manage_url.
  REFUND_PATH_APPLE: Apple alone decides App Store refunds; the user can request one at refund_url. We cannot refund.
  REFUND_PATH_GOOGLE: the user can request a refund in Google Play at refund_url; Google reviews it.
  RESTORE_PURCHASES_STEPS: sign in with the same Apple ID / Google account used to buy (request.claimed_platform ios =
    Apple ID, android = Google account), open the app, tap Restore Purchases. Say "on your new device" ONLY if
    request.says_new_device is true; otherwise talk about "this device". If request.says_tried_restore is true, the
    user already tried Restore / reinstalling: acknowledge that and do NOT lead with Restore again. Give the next step
    instead: check this device is signed in with the same Apple ID / Google account they bought with, look for the
    purchase in the store's purchase history (facts.refund_url is that history page; use it only as the purchase
    history, not to talk about refunds), and if the purchase is there and premium is still locked, they can write
    here and a person from the team can look into it (do not say it was passed on).
  UPDATE_PAYMENT_METHOD: update the payment method (payment_url if given); the store then retries the charge.
  PROPOSE_GRANT: say you have REQUESTED a short courtesy extension and the team will review it; it is NOT active yet.
  ESCALATE_TO_HUMAN: say the case was passed to the support team and a person will reply.
- By request.intent:
  ACKNOWLEDGEMENT: one or two short sentences. If thanks: "you're welcome". Otherwise ask what they need (cancel,
    refund, missing premium, new device). No status recap, no escalation talk.
  HUMAN_REQUEST: acknowledge they want a person; if ESCALATE_TO_HUMAN is an action, say a person will reply here.
  OTHER_APP: say you can only help with the app_name subscription; for another app, contact that app's support. Do
    not discuss this account's status. Never name the other app.
  PRIVACY_REQUEST: acknowledge the data request; if ESCALATE_TO_HUMAN, say it was passed to the team who will confirm;
    deleting data does not cancel a store subscription. No status recap.
  THIRD_PARTY_ACCOUNT: say you can only see the account this message comes from and cannot share anything about
    someone else's; they can write from their own account. Do not state this account's details.
  DISCOUNT_REQUEST: say you cannot offer discounts or free time yourself. If request.chargeback_threat: a store refund
    request is usually faster than a chargeback, and a chargeback can get the store account locked.
  FREE_ACCESS_REQUEST: the user wants premium without paying. Do NOT talk about discounts or prices being set by the
    store. Politely say you can't switch premium on without a purchase, then what the account shows (one sentence)
    and what they can do: subscribe in the app (a free trial, if one is on offer, is shown there before paying),
    restore if they already paid with another Apple ID / Google account (when RESTORE_PURCHASES_STEPS is an action),
    or fix the payment (when UPDATE_PAYMENT_METHOD is an action). Never promise or hint at free time unless
    PROPOSE_GRANT is an action (then only say it was requested).
  UNRECOGNISED_CHARGE: the user says they never bought anything / don't recognise a charge. This is NOT a
    cancellation complaint: never say "I don't see a cancellation". Say plainly what this account shows: the charges
    with their dates and amounts from facts (last_charged_on, price, purchased_on, product_name, store_name). If a
    REFUND_PATH action is present, say where they can request a refund from their store (never promise one). Then
    suggest checking whether someone in their Family Sharing group or another Apple ID / Google account made the
    purchase; the store's purchase history shows which account paid. If facts.ever_charged is "no", say no charge
    for this app is on this account and the charge may come from another account or app.
- If request.angry: one short, sincere empathy clause, then the facts.
- End with ONE short, natural follow-up offer in the user's language ("Did that sort it out?", "Let me know if that
  works.") unless request.no_follow_up is true. It adds no facts, numbers, dates or promises.
Output only the reply text."""

GLOSS_SUFFIX = """
Because this language is not covered by our automatic checker, output JSON instead:
{"text": "<the reply in the user's language>", "english": "<a faithful, literal English translation of that reply>"}"""


def _kind(a: Any) -> str:
    return str(a.get("kind") if isinstance(a, dict) else getattr(a, "kind", a))


def _params(a: Any) -> dict:
    p = a.get("params") if isinstance(a, dict) else getattr(a, "params", None)
    return p or {}


def _fields(facts: Any) -> dict[str, str]:
    f = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    return {str(k): str(v) for k, v in (f or {}).items() if v not in (None, "")}


def _claims(intent: Any) -> dict:
    c = getattr(intent, "claims", None) if intent is not None else None
    return c if isinstance(c, dict) else {}


def _last(history: Iterable[Any] | None, role: str) -> str | None:
    for h in reversed(list(history or [])):
        if isinstance(h, dict) and h.get("role") == role and (h.get("text") or h.get("content")):
            return str(h.get("text") or h.get("content"))
    return None


def request_view(intent: Any, history: Iterable[Any] | None = None) -> dict:
    """Sanitised view of what was asked: enums and booleans only, plus our OWN previous reply (already validated)."""
    claims = _claims(intent)
    prev_reply = _last(history, "assistant")
    view: dict = {"intent": str(getattr(intent, "type", None) or "OTHER")}
    for k in sorted(_WRITER_FLAGS):
        if claims.get(k) is True:
            view[k] = True
    if claims.get("claimed_platform") in ("ios", "android"):
        view["claimed_platform"] = claims["claimed_platform"]
    if history:
        view["follow_up"] = True
        prev_intent = claims.get("previous_intent")
        if isinstance(prev_intent, str) and re.fullmatch(r"[A-Z_]{2,30}", prev_intent):
            view["previous_intent"] = prev_intent
    if (getattr(intent, "injection_suspected", False) or view["intent"] in _NO_FOLLOW_UP_INTENTS
            or claims.get("says_tried_restore") is True):
        view["no_follow_up"] = True
    view["status_already_given"] = prev_reply is not None
    if prev_reply:
        view["previous_reply"] = prev_reply[:600]
    return view


def case_file(state: Any, facts: Any, actions: Iterable[Any], language: str, intent: Any = None,
              history: Iterable[Any] | None = None) -> dict:
    """Exactly what the writer LLM is allowed to see."""
    code = str(getattr(state, "code", state) or "")
    base = language.split("-")[0]
    actions = list(actions)
    request = request_view(intent, history)
    if any(_kind(a) == "ESCALATE_TO_HUMAN" for a in actions):
        request["no_follow_up"] = True
    return {
        "language": language,
        "language_name": LANG_NAMES.get(language, LANG_NAMES.get(base, language)),
        "state": code,
        "facts": {k: v for k, v in _fields(facts).items() if k not in _HIDDEN_FACTS},
        "actions": [{"kind": _kind(a), "params": {k: v for k, v in _params(a).items() if k in _SAFE_PARAMS}}
                    for a in actions],
        "request": request,
    } | ({"charge_check": "the charge the user describes (store/amount) is NOT on this account: say clearly you don't "
                          "see that charge on their account; it may be another Apple ID/Google account or another app; "
                          "their store's purchase history shows who charged them"}
         if templates.charge_claim_mismatch(_claims(intent), facts, getattr(intent, "type", None)) else {})


def _clean(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^```\w*\s*|\s*```$", "", t).strip()
    if len(t) >= 2 and t[0] == t[-1] and t[0] in "\"'":
        t = t[1:-1].strip()
    if t.startswith("{") and t.endswith("}"):
        try:
            obj = json.loads(t)
            if isinstance(obj, dict) and isinstance(obj.get("text") or obj.get("reply"), str):
                t = (obj.get("text") or obj.get("reply")).strip()
        except json.JSONDecodeError:
            pass
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)  # strip bold markdown
    return t


_UNSET = object()


def reply(intent: Any, state: Any, facts: Any, actions: Iterable[Any] | None, language: str | None = None,
          llm: LLM | None | object = _UNSET, history: list | None = None) -> Reply:
    actions = list(actions or [])
    language = language or getattr(intent, "language", None) or "en"
    itype = getattr(intent, "type", None) if intent is not None else None
    claims = _claims(intent)
    history = [h for h in (history or []) if isinstance(h, dict)][-4:]

    def fallback(violations: list[str], attempts: int) -> Reply:
        text = templates.render(state, actions, facts, language, intent_type=itype, claims=claims, history=history,
                                injection=bool(getattr(intent, "injection_suspected", False)))
        return Reply(text=text, used_fallback=True, violations=violations, source="template", attempts=attempts)

    if llm is _UNSET:
        llm = get_llm()
    if llm is None:
        return fallback([], 0)

    need_gloss = language.split("-")[0].lower() not in VALIDATED_LANGS
    system = COMPOSE_SYSTEM + (GLOSS_SUFFIX if need_gloss else "")
    payload = json.dumps(case_file(state, facts, actions, language, intent, history), ensure_ascii=False, indent=1)
    all_violations: list[str] = []
    draft = ""
    for attempt in (1, 2):
        user = "CASE FILE:\n" + payload
        if attempt == 2:
            user += ("\n\nYour previous draft was rejected by the fact checker:\n---\n" + draft + "\n---\nViolations: " +
                     "; ".join(all_violations) + "\nRewrite it so that none of these occur. Same rules.")
        try:
            raw = llm.complete(system, user, json_mode=need_gloss, model=compose_model())  # type: ignore[union-attr]
        except LLMError as e:
            return fallback(all_violations + [f"llm_error:{str(e)[:80]}"], attempt)
        gloss = None
        if need_gloss:
            try:
                obj = parse_json(raw)
                draft, gloss = str(obj.get("text", "")).strip(), str(obj.get("english", "")).strip()
            except ValueError:
                draft = _clean(raw)
            if not gloss:
                all_violations.append(f"try{attempt}:missing_english_gloss")
                continue
        else:
            draft = _clean(raw)
        v = validate.check(draft, facts, actions, state, gloss=gloss)
        if not v:
            return Reply(text=draft, used_fallback=False, violations=all_violations,
                         source="llm" if attempt == 1 else "llm_retry", attempts=attempt)
        all_violations += [f"try{attempt}:{x}" for x in v]
    return fallback(all_violations, 2)
