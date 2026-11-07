"""Thin local stand-ins for the adapty / engine / ai modules, behind the ARCH.md function names.

Used only while the real modules are missing (see casedesk/app/deps.py). Deliberately small and deterministic.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from pydantic import BaseModel

from casedesk.adapty.models import AccessLevel, Money, Profile, Subscription

UTC = timezone.utc


def _now() -> datetime:
    return datetime.now(UTC)


# --------------------------------------------------------------------------- adapty
def _seed() -> dict[str, Profile]:
    n = _now()
    d = lambda days: n + timedelta(days=days)  # noqa: E731
    p = {}
    p["lumen_ana"] = Profile(
        profile_id="p-ana", customer_user_id="lumen_ana", store_country="RS", platform="iOS", locale="sr-RS",
        subscriptions=[Subscription(vendor_product_id="lumen.pro.monthly", store="app_store", access_level_id="premium",
                                    is_active=False, will_renew=False, starts_at=d(-95), renewed_at=d(-33),
                                    expires_at=d(-3), billing_issue_detected_at=d(-3),
                                    price=Money(amount=4.99, currency="EUR"))],
        access_levels=[AccessLevel(id="premium", is_active=False, expires_at=d(-3), store="app_store",
                                   vendor_product_id="lumen.pro.monthly")],
        sale_context={"acquisition_channel": "Apple Search Ads", "placement": "onboarding_paywall", "flow": "trial_3d"})
    p["lumen_marko"] = Profile(
        profile_id="p-marko", customer_user_id="lumen_marko", store_country="DE", platform="iOS", locale="en-US",
        subscriptions=[Subscription(vendor_product_id="lumen.pro.yearly", store="app_store", access_level_id="premium",
                                    is_active=True, will_renew=False, starts_at=d(-340), renewed_at=d(-340),
                                    expires_at=d(25), unsubscribed_at=d(-2),
                                    price=Money(amount=39.99, currency="EUR"))],
        access_levels=[AccessLevel(id="premium", is_active=True, expires_at=d(25), store="app_store",
                                   vendor_product_id="lumen.pro.yearly")],
        sale_context={"acquisition_channel": "TikTok Ads", "placement": "export_limit_paywall", "flow": "annual_first"})
    p["lumen_lucia"] = Profile(
        profile_id="p-lucia", customer_user_id="lumen_lucia", store_country="ES", platform="Android", locale="es-ES",
        subscriptions=[Subscription(vendor_product_id="lumen_pro_monthly", store="play_store", access_level_id="premium",
                                    is_active=True, will_renew=True, starts_at=d(-50), renewed_at=d(-20),
                                    expires_at=d(10), price=Money(amount=4.99, currency="EUR"))],
        access_levels=[AccessLevel(id="premium", is_active=True, expires_at=d(10), will_renew=True,
                                   store="play_store", vendor_product_id="lumen_pro_monthly")],
        sale_context={"acquisition_channel": "Organic", "placement": "settings_upgrade", "flow": "monthly_default"})
    p["lumen_jonas"] = Profile(
        profile_id="p-jonas", customer_user_id="lumen_jonas", store_country="DE", platform="iOS", locale="de-DE",
        sale_context={"acquisition_channel": "Meta Ads", "placement": "ai_filter_paywall", "flow": "trial_7d"})
    return p


_PROFILES: dict[str, Profile] = _seed()

DEMO_USERS = [
    {"customer_user_id": "lumen_ana", "display_name": "Ana", "locale": "sr-RS",
     "scenario": "Card declined, Premium lapsed 3 days ago"},
    {"customer_user_id": "lumen_marko", "display_name": "Marko", "locale": "en-US",
     "scenario": "Cancelled 2 days ago, still paid up"},
    {"customer_user_id": "lumen_lucia", "display_name": "Lucía", "locale": "es-ES",
     "scenario": "Active monthly on Google Play"},
    {"customer_user_id": "lumen_jonas", "display_name": "Jonas", "locale": "de-DE",
     "scenario": "New phone, no purchase on this account"},
]


def demo_users() -> list[dict]:
    return [dict(u) for u in DEMO_USERS]


class AdaptyClient:
    def __init__(self, *a, **kw):
        pass

    async def get_profile(self, customer_user_id: str) -> Profile | None:
        p = _PROFILES.get(customer_user_id)
        return p.model_copy(deep=True) if p else None

    async def grant_access_level(self, customer_user_id: str, access_level_id: str, expires_at: datetime) -> dict:
        p = _PROFILES.get(customer_user_id)
        if p is None:
            raise KeyError(customer_user_id)
        p.access_levels = [a for a in p.access_levels if a.id != access_level_id] + [
            AccessLevel(id=access_level_id, is_active=True, expires_at=expires_at, is_granted_by_developer=True,
                        store="adapty")]
        return {"ok": True, "access_level_id": access_level_id, "expires_at": expires_at.isoformat()}


def reset() -> None:
    global _PROFILES
    _PROFILES = _seed()


# --------------------------------------------------------------------------- engine
class CaseState(BaseModel):
    code: str
    primary: Subscription | None = None
    evidence: list[str] = []


class FactSheet(BaseModel):
    fields: dict[str, str] = {}
    allowed_numbers: set[str] = set()


class Action(BaseModel):
    kind: str
    params: dict = {}
    requires_approval: bool = False


def classify(profile: Profile, now: datetime) -> CaseState:
    for a in profile.access_levels:
        if a.is_active and a.is_granted_by_developer:
            return CaseState(code="GRANTED_BY_DEVELOPER", evidence=[f"access level {a.id} granted by developer"])
    subs = sorted(profile.subscriptions, key=lambda s: s.expires_at or now, reverse=True)
    if not subs:
        return CaseState(code="NO_PURCHASE", evidence=["no subscriptions on profile"])
    s = subs[0]
    if s.is_active:
        code = "ACTIVE_RENEWING" if s.will_renew else "CANCELLED_PAID_UP"
    elif s.billing_issue_detected_at:
        code = "EXPIRED_BILLING_ERROR"
    else:
        code = "EXPIRED_CANCELLED"
    return CaseState(code=code, primary=s, evidence=[f"{s.vendor_product_id} is_active={s.is_active}"])


_STORE = {"app_store": "App Store", "play_store": "Google Play"}
_MANAGE = {"app_store": "https://apps.apple.com/account/subscriptions",
           "play_store": "https://play.google.com/store/account/subscriptions"}


def build(profile: Profile, state: CaseState, now: datetime) -> FactSheet:
    f: dict[str, str] = {}
    s = state.primary
    if s:
        f["product_name"] = "Lumen Pro (yearly)" if "year" in s.vendor_product_id else "Lumen Pro (monthly)"
        f["store_name"] = _STORE.get(s.store, s.store)
        f["store"] = s.store
        if s.price:
            f["price"] = f"{s.price.amount:.2f} {s.price.currency}"
        if s.expires_at:
            f["expires_on"] = s.expires_at.date().isoformat()
            if s.expires_at > now:
                f["days_left"] = str((s.expires_at - now).days)
        if s.will_renew and s.expires_at:
            f["renews_on"] = s.expires_at.date().isoformat()
        if s.unsubscribed_at:
            f["cancelled_on"] = s.unsubscribed_at.date().isoformat()
        if s.billing_issue_detected_at:
            f["billing_issue_on"] = s.billing_issue_detected_at.date().isoformat()
        f["manage_url"] = _MANAGE.get(s.store, "")
    for a in profile.access_levels:
        if a.is_granted_by_developer and a.expires_at:
            f["granted_until"] = a.expires_at.date().isoformat()
    nums = set()
    for v in f.values():
        nums.update(re.findall(r"\d+(?:[.,]\d+)?", v))
    return FactSheet(fields=f, allowed_numbers=nums)


def decide(state: CaseState, intent, facts: FactSheet, history) -> list[Action]:
    acts = [Action(kind="EXPLAIN_STATUS")]
    t = intent.type
    store = facts.fields.get("store")
    if state.code == "EXPIRED_BILLING_ERROR":
        acts.append(Action(kind="UPDATE_PAYMENT_METHOD", params={"url": facts.fields.get("manage_url", "")}))
        recent = [h for h in (history or []) if (h.get("approval") or {}).get("status") in ("pending", "approved")]
        if not recent:
            acts.append(Action(kind="PROPOSE_GRANT", params={"access_level_id": "premium", "days": 3},
                               requires_approval=True))
    elif t in ("HOW_TO_CANCEL", "CHARGED_AFTER_CANCEL"):
        acts.append(Action(kind="MANAGE_SUBSCRIPTION_LINK", params={"url": facts.fields.get("manage_url", "")}))
    elif t == "REFUND_REQUEST":
        acts.append(Action(kind="REFUND_PATH_APPLE" if store == "app_store" else "REFUND_PATH_GOOGLE",
                           params={"url": "https://reportaproblem.apple.com" if store == "app_store"
                                   else "https://play.google.com/store/account/orderhistory"}))
    elif t in ("RESTORE_NEW_DEVICE", "PAID_NO_ACCESS") or state.code == "NO_PURCHASE":
        acts.append(Action(kind="RESTORE_PURCHASES_STEPS", params={"platform": "ios"}))
    return acts


# --------------------------------------------------------------------------- ai
class Intent(BaseModel):
    type: str
    language: str = "en"
    claims: dict = {}
    injection_suspected: bool = False


class Reply(BaseModel):
    text: str
    used_fallback: bool = False
    violations: list[str] = []


_RULES = [
    ("CHARGED_AFTER_CANCEL", r"charged after|after cancel|naplat|cobrad|abgebucht"),
    ("REFUND_REQUEST", r"refund|povra|reembolso|erstatt|money back"),
    ("HOW_TO_CANCEL", r"\bcancel|otkaž|otkaz|cancelar|kündig"),
    ("RESTORE_NEW_DEVICE", r"new phone|restore|novi telefon|nuevo|neues handy|neues telefon"),
    ("PAID_NO_ACCESS", r"no premium|paid but|platio|platila|pagué|bezahlt"),
    ("BILLING_FAILED", r"card|kartic|tarjeta|karte"),
]


def _lang(message: str, ui_locale: str) -> str:
    m = message.lower()
    if re.search(r"[čćšžđ]|\b(nemam|platio|platila|zašto|kartica|telefon)\b", m):
        return "sr"
    if re.search(r"[ñ¿¡]|\b(hola|pagué|suscripción|cancelar)\b", m):
        return "es"
    if re.search(r"[äöüß]|\b(ich|habe|nicht|kündigen)\b", m):
        return "de"
    if re.search(r"\b(the|i|my|was|how|have)\b", m):
        return "en"
    return (ui_locale or "en").split("-")[0]


def extract(message: str, ui_locale: str) -> Intent:
    m = message.lower()
    t = next((k for k, rx in _RULES if re.search(rx, m)), "STATUS_QUESTION")
    inj = bool(re.search(r"ignore (all|your|previous)|system prompt|give me premium", m))
    return Intent(type=t, language=_lang(message, ui_locale), injection_suspected=inj)


_T = {
    "en": {"ACTIVE_RENEWING": "Your {product_name} is active and renews on {renews_on} via {store_name}.",
           "CANCELLED_PAID_UP": "You cancelled on {cancelled_on}. Your {product_name} stays active until {expires_on} "
                                "and will not renew.",
           "EXPIRED_BILLING_ERROR": "Your {product_name} ended on {expires_on} because {store_name} could not charge "
                                    "your payment method.",
           "NO_PURCHASE": "I can't find a purchase on this account. If you bought Lumen Pro on another device, "
                          "restore purchases with the same store account.",
           "GRANTED_BY_DEVELOPER": "The Lumen team gave you Premium until {granted_until}.",
           "grant": "I've asked the Lumen team to review a short courtesy extension. They decide; I'll show it "
                    "here if it's approved."},
    "sr": {"ACTIVE_RENEWING": "Vaš {product_name} je aktivan i obnavlja se {renews_on} preko {store_name}.",
           "CANCELLED_PAID_UP": "Otkazali ste {cancelled_on}. {product_name} ostaje aktivan do {expires_on} i neće "
                                "se obnoviti.",
           "EXPIRED_BILLING_ERROR": "Vaš {product_name} je istekao {expires_on} jer {store_name} nije uspeo da "
                                    "naplati sa vaše kartice.",
           "NO_PURCHASE": "Ne vidim kupovinu na ovom nalogu. Ako ste kupili na drugom uređaju, vratite kupovine "
                          "sa istim nalogom prodavnice.",
           "GRANTED_BY_DEVELOPER": "Lumen tim vam je odobrio Premium do {granted_until}.",
           "grant": "Zamolio sam Lumen tim da razmotri kratko produženje. Oni odlučuju; ovde ćete videti ako bude "
                    "odobreno."},
    "es": {"ACTIVE_RENEWING": "Tu {product_name} está activa y se renueva el {renews_on} en {store_name}.",
           "CANCELLED_PAID_UP": "Cancelaste el {cancelled_on}. {product_name} sigue activa hasta el {expires_on}.",
           "EXPIRED_BILLING_ERROR": "Tu {product_name} terminó el {expires_on} porque {store_name} no pudo cobrar.",
           "NO_PURCHASE": "No encuentro ninguna compra en esta cuenta. Restaura las compras con la misma cuenta.",
           "GRANTED_BY_DEVELOPER": "El equipo de Lumen te dio Premium hasta el {granted_until}.",
           "grant": "He pedido al equipo de Lumen que revise una extensión de cortesía."},
    "de": {"ACTIVE_RENEWING": "Dein {product_name} ist aktiv und verlängert sich am {renews_on} über {store_name}.",
           "CANCELLED_PAID_UP": "Du hast am {cancelled_on} gekündigt. {product_name} bleibt bis {expires_on} aktiv.",
           "EXPIRED_BILLING_ERROR": "Dein {product_name} endete am {expires_on}, weil {store_name} nicht abbuchen "
                                    "konnte.",
           "NO_PURCHASE": "Ich finde keinen Kauf in diesem Konto. Stelle Käufe mit demselben Store-Konto wieder her.",
           "GRANTED_BY_DEVELOPER": "Das Lumen-Team hat dir Premium bis {granted_until} freigeschaltet.",
           "grant": "Ich habe das Lumen-Team gebeten, eine kurze Kulanz-Verlängerung zu prüfen."},
}


class _Safe(dict):
    def __missing__(self, k):
        return "—"


def reply(intent: Intent, state: CaseState, facts: FactSheet, actions: list[Action], language: str) -> Reply:
    t = _T.get(language, _T["en"])
    text = t.get(state.code, _T["en"].get(state.code, "Here is what I can see on your account.")).format_map(
        _Safe(facts.fields))
    if any(a.kind == "PROPOSE_GRANT" for a in actions):
        text += " " + t["grant"]
    return Reply(text=text, used_fallback=True, violations=[])


# Namespaces mimicking the real module layout
adapty_client = SimpleNamespace(AdaptyClient=AdaptyClient)
adapty_seed = SimpleNamespace(demo_users=demo_users)
engine_state = SimpleNamespace(classify=classify, CaseState=CaseState)
engine_facts = SimpleNamespace(build=build, FactSheet=FactSheet)
engine_policy = SimpleNamespace(decide=decide, Action=Action)
ai_intent = SimpleNamespace(extract=extract, Intent=Intent)
ai_compose = SimpleNamespace(reply=reply, Reply=Reply)
