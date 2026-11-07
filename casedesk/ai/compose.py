"""Reply composition: the LLM phrases, code owns the facts, the validator decides.

reply(intent, state, facts, actions, language) -> Reply(text, used_fallback, violations)

1. LLM gets ONLY: the FactSheet fields, the decided actions (kind + safe params), the state code, the user's language.
   It never sees the user's message, so injected text cannot reach the writer.
2. validate.check(); on violations → one retry that lists the violations; still failing (or any LLM error/timeout)
   → templates.render(). `violations` keeps everything the LLM got wrong, for the console.
"""
from __future__ import annotations

import json
import re
from typing import Any, Iterable

from pydantic import BaseModel, Field

from casedesk.ai import templates, validate
from casedesk.ai.llm import LLM, LLMError, compose_model, get_llm

LANG_NAMES = {
    "en": "English", "sr": "Serbian (Latin script)", "sr-Latn": "Serbian (Latin script)",
    "sr-Cyrl": "Serbian (Cyrillic script)", "es": "Spanish", "de": "German", "pt": "Portuguese", "ru": "Russian",
    "fr": "French", "it": "Italian", "hr": "Croatian", "bs": "Bosnian",
}
# Action params the writer may see. Anything else (expires_at timestamps, ids) stays out of the prompt.
_SAFE_PARAMS = {"claim_contradicted", "reason", "store", "url", "decided_by", "developer_can_refund", "promise",
                "steps_key"}


class Reply(BaseModel):
    text: str
    used_fallback: bool = False
    violations: list[str] = Field(default_factory=list)
    source: str = "template"  # "llm" | "llm_retry" | "template"
    attempts: int = 0


COMPOSE_SYSTEM = """You write the reply that a subscription app's in-app help sends to one of its users.
You receive a JSON case file with: "language", "state" (the user's subscription state, decided by code),
"facts" (the ONLY facts you may state), and "actions" (what the system decided to do or tell; in this order).

Write the reply:
- In the requested language (and script). Warm, calm, plain words, like a kind human; at most 80 words; plain text,
  no markdown, no lists, no greeting line, no sign-off, no subject line.
- Use ONLY the facts given. Copy dates, prices and numbers exactly as in "facts" (you may write an ISO date as a
  normal date in the user's language, e.g. 2026-11-03 → 3 November 2026). Never invent or compute a number, date,
  price, percentage, duration, deadline, e-mail, phone number or URL. If a fact is not given, do not mention it.
- URLs: only those that appear in "facts", copied exactly.
- Cover every action, in order:
  EXPLAIN_STATUS: explain the state in one or two sentences. If params.claim_contradicted is true, gently lead with
    what is actually true (params.reason tells you why the user's belief does not match, e.g. charged_before_cancel =
    the last charge happened before they turned off renewal; not_cancelled = no cancellation exists).
  CANCEL_STEPS: how to cancel in their store (App Store: Settings > your name > Subscriptions; Google Play: profile >
    Payments & subscriptions > Subscriptions), plus manage_url.
  MANAGE_SUBSCRIPTION_LINK: give manage_url.
  REFUND_PATH_APPLE: Apple alone decides App Store refunds; the user can request one at refund_url. We cannot refund.
  REFUND_PATH_GOOGLE: the user can request a refund in Google Play at refund_url; Google reviews it.
  RESTORE_PURCHASES_STEPS: sign in with the same Apple ID / Google account used to buy, open the app, tap Restore Purchases.
  UPDATE_PAYMENT_METHOD: update the payment method (payment_url if given); the store then retries the charge.
  PROPOSE_GRANT: say you have REQUESTED a short courtesy extension and the team will review it; it is NOT active yet.
  ESCALATE_TO_HUMAN: say the case was passed to the support team and a person will reply.
- Never promise or announce a refund ("we will refund you", "refund issued" are forbidden, in any language).
- Never say you did something that is not an action above (no "I've restored / granted / cancelled / unlocked").
- Never claim access was granted, extended or unlocked.
Output only the reply text."""


def _kind(a: Any) -> str:
    return str(a.get("kind") if isinstance(a, dict) else getattr(a, "kind", a))


def _params(a: Any) -> dict:
    p = a.get("params") if isinstance(a, dict) else getattr(a, "params", None)
    return p or {}


def _fields(facts: Any) -> dict[str, str]:
    f = facts.get("fields", {}) if isinstance(facts, dict) else getattr(facts, "fields", {})
    return {str(k): str(v) for k, v in (f or {}).items() if v not in (None, "")}


def case_file(state: Any, facts: Any, actions: Iterable[Any], language: str) -> dict:
    """Exactly what the writer LLM is allowed to see."""
    code = str(getattr(state, "code", state) or "")
    return {
        "language": language,
        "language_name": LANG_NAMES.get(language, LANG_NAMES.get(language.split("-")[0], language)),
        "state": code,
        "facts": _fields(facts),
        "actions": [{"kind": _kind(a), "params": {k: v for k, v in _params(a).items() if k in _SAFE_PARAMS}}
                    for a in actions],
    }


def _clean(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^```\w*\s*|\s*```$", "", t).strip()
    if len(t) >= 2 and t[0] == t[-1] and t[0] in "\"'":
        t = t[1:-1].strip()
    # If the model wrapped it as {"text": "..."} anyway, unwrap.
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
          llm: LLM | None | object = _UNSET) -> Reply:
    actions = list(actions or [])
    language = language or getattr(intent, "language", None) or "en"
    itype = getattr(intent, "type", None) if intent is not None else None

    def fallback(violations: list[str], attempts: int) -> Reply:
        text = templates.render(state, actions, facts, language, intent_type=itype)
        return Reply(text=text, used_fallback=True, violations=violations, source="template", attempts=attempts)

    if llm is _UNSET:
        llm = get_llm()
    if llm is None:
        return fallback([], 0)

    payload = json.dumps(case_file(state, facts, actions, language), ensure_ascii=False, indent=1)
    all_violations: list[str] = []
    draft = ""
    for attempt in (1, 2):
        user = "CASE FILE:\n" + payload
        if attempt == 2:
            user += ("\n\nYour previous draft was rejected by the fact checker:\n---\n" + draft + "\n---\nViolations: " +
                     "; ".join(all_violations) + "\nRewrite it so that none of these occur. Same rules.")
        try:
            draft = _clean(llm.complete(COMPOSE_SYSTEM, user, json_mode=False, model=compose_model()))  # type: ignore[union-attr]
        except LLMError as e:
            return fallback(all_violations + [f"llm_error:{str(e)[:80]}"], attempt)
        v = validate.check(draft, facts, actions, state)
        if not v:
            return Reply(text=draft, used_fallback=False, violations=all_violations,
                         source="llm" if attempt == 1 else "llm_retry", attempts=attempt)
        all_violations += [f"try{attempt}:{x}" for x in v]
    return fallback(all_violations, 2)
