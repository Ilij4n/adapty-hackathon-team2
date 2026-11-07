"""FactSheet: the only facts a reply may state (contract: ARCH.md "Engine", non-negotiable 1).

All values are pre-formatted and locale-neutral: ISO dates (YYYY-MM-DD), integer day counts, prices as
"<amount> <currency>" with "." as decimal separator. The LLM may re-phrase them ("3 November 2026", "6,99 EUR"),
so `allowed_numbers` holds every number those values can legitimately turn into (see `_numbers_of`).
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Iterable

from pydantic import BaseModel

from casedesk.adapty.models import Profile, Subscription
from casedesk.engine.state import CaseState, _utc, ever_paid, is_lifetime, is_live, is_trial, last_charge_at

GRANT_DAYS = 3                 # ARCH grant policy: 3 days
GRANT_WINDOW_DAYS = 14         # EXPIRED_BILLING_ERROR is grant-eligible for 14 days after expiry
GRANT_COOLDOWN_DAYS = 90       # at most once per user per 90 days

APP_NAME = "Lumen"

# Lumen catalog (seed_adapty.py PRODUCTS). iOS ids use "lumen.<key>", Google uses "lumen_<key>" and Adapty may add
# ":<base-plan>" for Play subscriptions. Names deliberately carry no numbers (the trial length is a separate fact).
PRODUCT_NAMES = {
    "weekly": "Lumen Premium Weekly",
    "monthly": "Lumen Premium Monthly",
    "annual": "Lumen Premium Annual",
    "annual_trial": "Lumen Premium Annual",
    "lifetime": "Lumen Premium Lifetime",
    "pro_annual": "Lumen Pro Annual (AI Studio)",
}
ACCESS_LEVEL_NAMES = {"premium": "Lumen Premium", "pro": "Lumen Pro (AI Studio)"}

STORE_NAMES = {
    "app_store": "App Store", "play_store": "Google Play", "stripe": "Stripe (web checkout)",
    "paddle": "Paddle (web checkout)", "amazon": "Amazon Appstore", "adapty": "Lumen (granted by the app team)",
    "promotional": "Lumen (granted by the app team)",
}
MANAGE_URLS = {
    "app_store": "https://apps.apple.com/account/subscriptions",
    "play_store": "https://play.google.com/store/account/subscriptions",
}
REFUND_URLS = {
    "app_store": "https://reportaproblem.apple.com",
    "play_store": "https://play.google.com/store/account/orderhistory",
}
PAYMENT_URLS = {
    "app_store": "https://apps.apple.com/account/billing",
    "play_store": "https://play.google.com/store/paymentmethods",
}
# Who can refund: Apple only (developer cannot); Google: user requests via Play, developer can also refund.
REFUND_POLICY = {"app_store": "apple_only", "play_store": "google_request"}
RESTORE_KEYS = {"app_store": "restore_ios", "play_store": "restore_android"}
ZERO_DECIMAL = {"JPY", "KRW", "VND", "CLP", "ISK", "UGX", "PYG", "IDR"}


class FactSheet(BaseModel):
    fields: dict[str, str] = {}
    allowed_numbers: set[str] = set()
    as_of: datetime | None = None   # the `now` the sheet was built for (policy uses it for the grant windows)


def _key_of(vendor_product_id: str) -> str:
    pid = vendor_product_id.split(":", 1)[0].lower()
    for prefix in ("lumen.", "lumen_"):
        if pid.startswith(prefix):
            return pid[len(prefix):]
    return pid


def product_name(vendor_product_id: str | None, access_level_id: str | None = None) -> str:
    if vendor_product_id:
        key = _key_of(vendor_product_id)
        if key in PRODUCT_NAMES:
            return PRODUCT_NAMES[key]
    if access_level_id and access_level_id in ACCESS_LEVEL_NAMES:
        return ACCESS_LEVEL_NAMES[access_level_id]
    if vendor_product_id:  # generic fallback: "com.acme.pro_monthly" -> "Pro Monthly"
        words = re.split(r"[._\-]+", vendor_product_id.split(":", 1)[0].split(".")[-1])
        words = [w for w in words if w]
        if words:
            return " ".join(w.capitalize() for w in words if w)
    return f"{APP_NAME} subscription"


def store_name(store: str | None) -> str:
    if not store:
        return "the store"
    return STORE_NAMES.get(store, store.replace("_", " ").title())


def format_price(amount: float, currency: str) -> str:
    cur = currency.upper()
    if cur in ZERO_DECIMAL:
        return f"{round(amount):d} {cur}"
    return f"{amount:.2f} {cur}"


def _iso(dt: datetime | None) -> str | None:
    return _utc(dt).date().isoformat() if dt else None


def _store_of_platform(platform: str | None) -> str | None:
    p = (platform or "").lower()
    if p in ("ios", "ipados", "macos"):
        return "app_store"
    if p == "android":
        return "play_store"
    return None


_NUM = re.compile(r"\d+(?:[.,]\d+)?")
_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def _numbers_of(key: str, value: str) -> set[str]:
    """Every number string `value` may legitimately appear as in a reply."""
    if key.endswith("_url"):
        return set()
    out: set[str] = set()
    m = _DATE.match(value)
    if m:  # 2026-11-03 -> 2026-11-03, 2026, 11, 03, 3, 03.11.2026-style parts are covered by the pieces
        y, mo, d = m.groups()
        return {value, y, mo, d, str(int(mo)), str(int(d))}
    for n in _NUM.findall(value):
        out.add(n)
        if "." in n:
            out.add(n.replace(".", ","))
            whole, frac = n.split(".")
            if frac.strip("0") == "":
                out.add(whole)
    return out


def build(profile: Profile, state: CaseState, now: datetime, history: Iterable[Any] | None = None) -> FactSheet:
    """`history` (optional) = the app's case/approval records for this user (same shape policy.decide gets); used only
    for `grant_request`. Without it the app may set fields["grant_request"] itself."""
    now = _utc(now)
    f: dict[str, str] = {"state": state.code, "app_name": APP_NAME, "as_of": now.date().isoformat()}
    s: Subscription | None = state.primary
    al = state.access_level

    store = (s.store if s else None) or (al.store if al else None) or _store_of_platform(profile.platform)
    if s is not None:
        f["product_name"] = product_name(s.vendor_product_id, s.access_level_id)
        f["access_level_name"] = ACCESS_LEVEL_NAMES.get(s.access_level_id or "", f["product_name"])
    elif al is not None:
        f["product_name"] = product_name(al.vendor_product_id, al.id)
        f["access_level_name"] = ACCESS_LEVEL_NAMES.get(al.id, f["product_name"])
    if store:
        f["store"] = store
        f["store_name"] = store_name(store)
        if store in MANAGE_URLS:
            f["manage_url"] = MANAGE_URLS[store]
            f["refund_url"] = REFUND_URLS[store]
            f["payment_url"] = PAYMENT_URLS[store]
            f["refund_policy"] = REFUND_POLICY[store]
        # H5: when the store is only guessed from the device platform (no purchase / access level tells us), the
        # restore steps must not assume it.
        guessed = s is None and al is None
        f["restore_steps_key"] = "restore_generic" if guessed else RESTORE_KEYS.get(store, "restore_generic")
    else:
        f["restore_steps_key"] = "restore_generic"

    if s is not None:
        if s.price is not None and s.price.amount > 0:
            price = format_price(s.price.amount, s.price.currency)
            if is_trial(s) and last_charge_at(s) is None:
                # Never charged (free trial that did not convert): the catalog price is what the trial WOULD cost,
                # never an amount already paid (lead decision 5). TRIAL_ACTIVE keeps `price` for "then X".
                f["price_after_trial"] = price
                if state.code == "TRIAL_ACTIVE":
                    f["price"] = price
            else:
                f["price"] = price
        if (d := _iso(s.purchased_at or s.starts_at)):
            f["purchased_on"] = d
        if (d := _iso(s.starts_at)):
            f["started_on"] = d
        if (d := _iso(last_charge_at(s))):
            f["last_charged_on"] = d
        if s.unsubscribed_at:
            f["cancelled_on"] = _iso(s.unsubscribed_at)
        if s.refunded_at:
            f["refunded_on"] = _iso(s.refunded_at)
        if s.billing_issue_detected_at:
            f["billing_issue_on"] = _iso(s.billing_issue_detected_at)
        exp = _utc(s.expires_at)
        if is_lifetime(s):
            f["lifetime"] = "yes"
        elif exp is not None:
            f["expires_on"] = exp.date().isoformat()
            if exp > now:
                f["days_left"] = str(max(0, (exp.date() - now.date()).days))
            else:
                f["days_since_expired"] = str(max(0, (now.date() - exp.date()).days))
            if state.code in ("ACTIVE_RENEWING", "TRIAL_ACTIVE", "GRACE_PERIOD", "BILLING_RETRY"):
                f["renews_on"] = exp.date().isoformat()
            if is_trial(s) and state.code in ("TRIAL_ACTIVE", "TRIAL_CANCELLED"):
                f["trial_ends_on"] = exp.date().isoformat()
            if is_trial(s) and state.code == "TRIAL_ACTIVE":
                # M6: Apple needs the cancellation at least 24 hours before the trial ends; Google until the end.
                cb = exp - timedelta(days=1) if s.store == "app_store" else exp
                f["cancel_before"] = cb.date().isoformat()
            if state.code == "GRACE_PERIOD":
                f["grace_ends_on"] = exp.date().isoformat()
        if s.is_family_shared:
            f["family_shared"] = "yes"
    elif al is not None:
        if al.is_lifetime or al.expires_at is None:
            f["lifetime"] = "yes" if al.is_lifetime else "no"
        else:
            exp = _utc(al.expires_at)
            f["expires_on"] = exp.date().isoformat()
            if exp > now:
                f["days_left"] = str(max(0, (exp.date() - now.date()).days))
        if state.code == "GRANTED_BY_DEVELOPER" and al.expires_at:
            f["granted_until"] = _iso(al.expires_at)

    # H4: was this account ever charged for the subscription the case is about? (refunded charges count as charged;
    # a family-shared member was not charged; access-level-only paid states are unknown -> omitted)
    if s is not None:
        f["ever_charged"] = "yes" if (last_charge_at(s) is not None and not s.is_family_shared) else "no"
    elif state.code in ("NO_PURCHASE", "GRANTED_BY_DEVELOPER"):
        f["ever_charged"] = "no"

    # H2: latest courtesy-extension request for this user within 90 days.
    if (gr := latest_grant_request(history, now)) is not None:
        f["grant_request"] = gr

    # Grant facts exist only when the state/time window allows one (the 90-day history check is policy's job).
    if grant_window_open(state, now):
        f["grant_days"] = str(GRANT_DAYS)
        f["grant_access_level"] = ACCESS_LEVEL_NAMES.get(grant_access_level_id(state), "Lumen Premium")

    others = [o for o in state.others if is_live(o, now)]
    if others:
        f["other_active_products"] = ", ".join(sorted({product_name(o.vendor_product_id, o.access_level_id)
                                                        for o in others}))
    if state.sandbox:
        f["sandbox_purchases_ignored"] = "yes"

    allowed: set[str] = set()
    for k, v in f.items():
        allowed |= _numbers_of(k, v)
    return FactSheet(fields=f, allowed_numbers=allowed, as_of=now)


def _parse_dt(v: Any) -> datetime | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return _utc(v)
    try:
        return _utc(datetime.fromisoformat(str(v).replace("Z", "+00:00")))
    except ValueError:
        return None


def grant_records(history: Iterable[Any] | None) -> list[tuple[str, datetime | None]]:
    """(status, when) for every grant approval in `history`. Accepts the app's case records
    ({"created_at", "approval": {"status", "created_at", "decided_at", ...}}) and flat records
    ({"kind": "PROPOSE_GRANT", "status", "at"/"created_at"}). `when` = the latest timestamp known (None if none)."""
    out: list[tuple[str, datetime | None]] = []
    for h in history or []:
        rec = h if isinstance(h, dict) else getattr(h, "__dict__", {})
        appr = rec.get("approval")
        if isinstance(appr, dict):
            status = str(appr.get("status") or "")
            stamps = [appr.get("decided_at"), appr.get("created_at"), rec.get("created_at")]
        elif rec.get("kind") in ("PROPOSE_GRANT", "GRANT"):
            status = str(rec.get("status", "pending"))
            stamps = [rec.get("at"), rec.get("created_at"), rec.get("decided_at")]
        else:
            continue
        out.append((status, max(filter(None, map(_parse_dt, stamps)), default=None)))
    return out


def latest_grant_request(history: Iterable[Any] | None, now: datetime) -> str | None:
    """pending | approved | denied: the latest grant approval within the 90-day window (None if there is none)."""
    cutoff = _utc(now) - timedelta(days=GRANT_COOLDOWN_DAYS)
    recs = [(w, st) for st, w in grant_records(history)
            if st in ("pending", "approved", "denied") and (w is None or w >= cutoff)]
    if not recs:
        return None
    if any(st == "pending" for _, st in recs):   # an open request always shows
        return "pending"
    return max(recs, key=lambda r: r[0] or cutoff)[1]


def grant_access_level_id(state: CaseState) -> str:
    if state.primary is not None and state.primary.access_level_id:
        return state.primary.access_level_id
    if state.primary is not None and _key_of(state.primary.vendor_product_id) == "pro_annual":
        return "pro"
    return "premium"


def grant_window_open(state: CaseState, now: datetime) -> bool:
    """ARCH grant policy, state + time part, plus the lead's paid-user rule:
      - state BILLING_RETRY, or EXPIRED_BILLING_ERROR expired at most 14 days before `now`;
      - and the subscription has at least one paid, non-refunded transaction (`state.ever_paid`): a failed free-trial
        conversion is not "lost premium after a billing error" and gets UPDATE_PAYMENT_METHOD + explain only.
    GRACE_PERIOD is allowed by ARCH but deliberately not used: the user still has access during grace, so a grant
    would add nothing. Once-per-90-days is checked in policy against history."""
    s = state.primary
    if s is None or not ever_paid(s):
        return False
    if state.code == "BILLING_RETRY":
        return True
    if state.code == "EXPIRED_BILLING_ERROR" and s.expires_at:
        return (_utc(now) - _utc(s.expires_at)).total_seconds() <= GRANT_WINDOW_DAYS * 86400
    return False


__all__ = ["FactSheet", "build", "product_name", "store_name", "format_price", "grant_window_open",
           "grant_access_level_id", "GRANT_DAYS", "GRANT_WINDOW_DAYS", "GRANT_COOLDOWN_DAYS"]
