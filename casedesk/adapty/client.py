"""Async client for Adapty's server-side API v2 (docs/adapty-api.md), mapping raw JSON -> casedesk models.

    client = AdaptyClient()                       # env ADAPTY_API_BASE, ADAPTY_SECRET_KEY
    profile = await client.get_profile("lumen_demo_00009")   # Profile | None (404)
    await client.grant_access_level("lumen_demo_02317", "premium", expires_at)

The server-side profile has no is_active / will_renew / price / store_country / locale fields (documented),
so: activity is derived from expires_at vs `now` (as Adapty's docs instruct); price, store_country,
platform, locale and placement/flow come from an optional "extras" table (for the Lumen demo: the seed's
createProfile payload and transaction prices, written by seed_loader into data/profiles_raw.json.gz).

Clock: `now` defaults to casedesk.clock: env CASEDESK_NOW (ISO) if set — frozen, or ticking from it at real speed
with CASEDESK_CLOCK=ticking (the demo) — else the real UTC time. The seeded data is a
snapshot as of its meta.now (replay end + 1 day = 2026-11-04T00:12:04Z); set CASEDESK_NOW to that for demos.
"""
from __future__ import annotations

import asyncio
import gzip
import json
import os
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from .models import AccessLevel, Money, Profile, Subscription

DEFAULT_BASE = "https://api.adapty.io"


def adapty_cuid(customer_user_id: str) -> str:
    """Our demo ids are `lumen_demo_<i>`; a real Adapty account seeded by the organisers' script holds the same users
    as `lumen_<run>_<i>`, with a random 6-digit run number. CASEDESK_ADAPTY_CUID_PREFIX (e.g. `lumen_123456_`) maps the
    one to the other on the wire only; everything else (cases, signatures, the console) keeps the demo id."""
    prefix = os.environ.get("CASEDESK_ADAPTY_CUID_PREFIX", "").strip()
    if prefix and customer_user_id.startswith("lumen_demo_"):
        return prefix + customer_user_id[len("lumen_demo_"):]
    return customer_user_id
API_PREFIX = "/api/v2/server-side-api"
PROFILE_PATH = f"{API_PREFIX}/profile/"
GRANT_PATH = f"{API_PREFIX}/purchase/profile/grant/access-level/"
REVOKE_PATH = f"{API_PREFIX}/purchase/profile/revoke/access-level/"
DEFAULT_EXTRAS = Path(__file__).resolve().parents[2] / "data" / "profiles_raw.json.gz"

# INFERRED: an access level given by grantAccessLevel (no transaction) reports store "adapty".
GRANT_STORE = "adapty"


# --------------------------------------------------------------------------- errors

class AdaptyError(Exception):
    def __init__(self, message: str, status_code: int | None = None, error_code: str | None = None,
                 body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.body = body


class AdaptyAuthError(AdaptyError):
    """401/403: missing or wrong secret key."""


class AdaptyNotFoundError(AdaptyError):
    """404 on a write call (get_profile returns None instead)."""


class AdaptyRateLimitError(AdaptyError):
    """429 after all retries."""


class AdaptyServerError(AdaptyError):
    """5xx or network failure after all retries."""


class AdaptyRequestError(AdaptyError):
    """Other 4xx (e.g. 400 bad request: unknown access level)."""


# --------------------------------------------------------------------------- helpers

def get_now() -> datetime:
    """The app's one clock (casedesk.clock): CASEDESK_NOW, frozen or ticking per CASEDESK_CLOCK, else real UTC."""
    from casedesk import clock
    return clock.now()


def parse_dt(v: Any) -> datetime | None:
    if v in (None, ""):
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    s = str(v).replace("Z", "+00:00")
    # "+0000" style offsets (docs example "2020-01-15T15:10:36.517975+0000")
    if len(s) > 5 and s[-5] in "+-" and s[-4:].isdigit() and s[-3] != ":":
        s = s[:-2] + ":" + s[-2:]
    dt = datetime.fromisoformat(s)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def _platform_from_store(store: str | None) -> str | None:
    return {"app_store": "iOS", "play_store": "Android", "stripe": "web", "paddle": "web"}.get(store or "")


def load_extras(path: Path | str | None = None) -> dict[str, dict]:
    """customer_user_id -> {store_country, platform, locale, prices, sale_context} (empty if no file)."""
    p = Path(path or os.environ.get("ADAPTY_PROFILE_EXTRAS") or DEFAULT_EXTRAS)
    if not p.exists():
        return {}
    opener = gzip.open if p.suffix == ".gz" else open
    with opener(p, "rt", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("extras", data) if isinstance(data, dict) else {}


# --------------------------------------------------------------------------- mapping

def _active(expires_at: datetime | None, now: datetime, in_grace: bool = False,
            starts_at: datetime | None = None) -> bool:
    if starts_at and starts_at > now:
        return False
    return expires_at is None or expires_at > now or in_grace


def map_profile(raw: dict, now: datetime | None = None, extras: dict | None = None) -> Profile:
    """Map the `data` object of GET /api/v2/server-side-api/profile/ to Profile."""
    now = now or get_now()
    ex = extras or {}
    prices = ex.get("prices") or {}

    def price_for(spid: str) -> Money | None:
        p = prices.get(spid)
        return Money(amount=float(p["amount"]), currency=p["currency"]) if p else None

    raw_als = raw.get("access_levels") or []
    # product -> access level: from the profile's access levels, else the app's catalog (extras)
    al_by_product = dict(ex.get("product_access_levels") or {})
    al_by_product.update({a["store_product_id"]: a.get("access_level_id") for a in raw_als
                          if a.get("store_product_id")})

    access_levels = []
    for a in raw_als:
        exp = parse_dt(a.get("expires_at"))
        starts = parse_dt(a.get("starts_at"))
        grace = bool(a.get("is_in_grace_period"))
        active = _active(exp, now, grace, starts)
        store = a.get("store")
        access_levels.append(AccessLevel(
            id=a["access_level_id"],
            is_active=active,
            is_lifetime=exp is None,
            expires_at=exp,
            will_renew=bool(active and exp is not None and store != GRANT_STORE
                            and not a.get("renewal_cancelled_at") and not a.get("cancellation_reason")),
            store=store,
            vendor_product_id=a.get("store_product_id") or None,
            is_granted_by_developer=store == GRANT_STORE or not a.get("store_transaction_id"),
        ))

    subscriptions = []
    for s in raw.get("subscriptions") or []:
        exp = parse_dt(s.get("expires_at"))
        grace = bool(s.get("is_in_grace_period"))
        active = _active(exp, now, grace)
        reason = s.get("cancellation_reason")
        is_refund = reason == "refund"
        purchased = parse_dt(s.get("purchased_at"))
        original = parse_dt(s.get("originally_purchased_at")) or purchased
        offer = s.get("offer") or None
        subscriptions.append(Subscription(
            vendor_product_id=s["store_product_id"],
            store=s.get("store") or "unknown",
            access_level_id=al_by_product.get(s["store_product_id"]),
            is_active=active and not is_refund,
            is_lifetime=False,
            will_renew=bool(active and not is_refund and not s.get("renewal_cancelled_at") and not reason),
            starts_at=original,
            purchased_at=original,
            renewed_at=purchased if (purchased and original and purchased > original) else None,
            expires_at=exp,
            unsubscribed_at=parse_dt(s.get("renewal_cancelled_at")),
            billing_issue_detected_at=parse_dt(s.get("billing_issue_detected_at")),
            is_in_grace_period=grace,
            is_refund=is_refund,
            refunded_at=exp if is_refund else None,  # INFERRED: refund ends access at the refund time
            is_sandbox=(s.get("environment") or "").lower() == "sandbox",
            is_family_shared=bool(s.get("is_family_shared", False)),
            offer_type=offer.get("type") if offer else None,
            cancellation_reason=reason,
            price=price_for(s["store_product_id"]),
        ))

    for n in raw.get("non_subscriptions") or []:
        if n.get("is_consumable"):
            continue
        spid = n["store_product_id"]
        is_refund = bool(n.get("is_refund"))
        al = next((a for a in raw_als if a.get("store_product_id") == spid), None)
        refunded_at = parse_dt(al.get("expires_at")) if (is_refund and al) else None
        subscriptions.append(Subscription(
            vendor_product_id=spid,
            store=n.get("store") or "unknown",
            access_level_id=al_by_product.get(spid),
            is_active=not is_refund,
            is_lifetime=True,
            will_renew=False,
            starts_at=parse_dt(n.get("purchased_at")),
            purchased_at=parse_dt(n.get("purchased_at")),
            is_refund=is_refund,
            refunded_at=refunded_at,
            is_sandbox=(n.get("environment") or "").lower() == "sandbox",
            cancellation_reason="refund" if is_refund else None,
            price=price_for(spid),
        ))

    attrs: dict[str, str | float | bool | None] = {}
    for kv in raw.get("custom_attributes") or []:
        if isinstance(kv, dict) and "key" in kv:
            attrs[kv["key"]] = kv.get("value")

    sale_context = {k: str(v) for k, v in (ex.get("sale_context") or {}).items() if v not in (None, "")}
    if attrs.get("acquisition_channel") not in (None, ""):
        sale_context["acquisition_channel"] = str(attrs["acquisition_channel"])  # live attribute wins

    platform = ex.get("platform")
    if not platform:
        stores = [s.store for s in subscriptions] + [a.store for a in access_levels]
        platform = next((p for p in map(_platform_from_store, stores) if p), None)

    return Profile(
        profile_id=raw["profile_id"],
        customer_user_id=raw.get("customer_user_id"),
        store_country=ex.get("store_country") or (str(attrs["store_country"]) if attrs.get("store_country") else None),
        platform=platform,
        locale=ex.get("locale") or (str(attrs["locale"]) if attrs.get("locale") else None),
        custom_attributes=attrs,
        access_levels=access_levels,
        subscriptions=subscriptions,
        sale_context=sale_context,
    )


# --------------------------------------------------------------------------- client

class AdaptyClient:
    def __init__(self, base_url: str | None = None, secret_key: str | None = None, *,
                 transport: httpx.AsyncBaseTransport | None = None, timeout: float = 10.0,
                 max_retries: int = 3, backoff: float = 0.5,
                 extras: dict[str, dict] | None = None, now_fn: Callable[[], datetime] | None = None):
        self.base_url = (base_url or os.environ.get("ADAPTY_API_BASE") or DEFAULT_BASE).rstrip("/")
        self.secret_key = secret_key if secret_key is not None else os.environ.get("ADAPTY_SECRET_KEY", "")
        self.max_retries = max_retries
        self.backoff = backoff
        self.now_fn = now_fn or get_now
        self._extras = extras
        self._http = httpx.AsyncClient(base_url=self.base_url, transport=transport, timeout=timeout)

    @property
    def extras(self) -> dict[str, dict]:
        if self._extras is None:
            self._extras = load_extras()
        return self._extras

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "AdaptyClient":
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    def _headers(self, customer_user_id: str) -> dict[str, str]:
        return {"Authorization": f"Api-Key {self.secret_key}", "adapty-customer-user-id": adapty_cuid(customer_user_id),
                "Content-Type": "application/json", "Accept": "application/json"}

    async def _request(self, method: str, path: str, customer_user_id: str, body: dict | None = None
                       ) -> httpx.Response:
        delay = self.backoff
        last: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = await self._http.request(method, path, headers=self._headers(customer_user_id), json=body)
            except httpx.TransportError as e:
                last = AdaptyServerError(f"network error: {e}")
            else:
                if resp.status_code == 429 or resp.status_code >= 500:
                    cls = AdaptyRateLimitError if resp.status_code == 429 else AdaptyServerError
                    last = _error(cls, resp)
                    ra = resp.headers.get("Retry-After")
                    if ra and ra.replace(".", "", 1).isdigit():
                        delay = max(delay, float(ra))
                else:
                    return resp
            if attempt < self.max_retries:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
        assert last is not None
        raise last

    async def get_raw_profile(self, customer_user_id: str) -> dict | None:
        resp = await self._request("GET", PROFILE_PATH, customer_user_id)
        if resp.status_code == 404:
            return None
        _raise_for(resp)
        return resp.json()["data"]

    async def get_profile(self, customer_user_id: str) -> Profile | None:
        raw = await self.get_raw_profile(customer_user_id)
        if raw is None:
            return None
        return map_profile(raw, self.now_fn(), self.extras.get(customer_user_id))

    async def grant_access_level(self, customer_user_id: str, access_level_id: str,
                                 expires_at: datetime | None) -> dict:
        body: dict[str, Any] = {"access_level_id": access_level_id}
        if expires_at is not None:
            body["expires_at"] = _iso(expires_at)
        resp = await self._request("POST", GRANT_PATH, customer_user_id, body)
        if resp.status_code == 404:
            raise _error(AdaptyNotFoundError, resp)
        _raise_for(resp)
        return resp.json()

    async def revoke_access_level(self, customer_user_id: str, access_level_id: str,
                                  revoke_at: datetime | None = None) -> dict:
        body: dict[str, Any] = {"access_level_id": access_level_id}
        if revoke_at is not None:
            body["revoke_at"] = _iso(revoke_at)
        resp = await self._request("POST", REVOKE_PATH, customer_user_id, body)
        if resp.status_code == 404:
            raise _error(AdaptyNotFoundError, resp)
        _raise_for(resp)
        return resp.json()


def _error(cls: type[AdaptyError], resp: httpx.Response) -> AdaptyError:
    try:
        body = resp.json()
    except ValueError:
        body = resp.text
    code = body.get("error_code") if isinstance(body, dict) else None
    msgs = []
    if isinstance(body, dict):
        for e in body.get("errors") or []:
            msgs.extend(e.get("errors") or [])
    return cls(f"Adapty {resp.status_code} {code or ''}: {'; '.join(msgs) or str(body)[:200]}".strip(),
               resp.status_code, code, body)


def _raise_for(resp: httpx.Response) -> None:
    if resp.status_code < 400:
        return
    if resp.status_code in (401, 403):
        raise _error(AdaptyAuthError, resp)
    if resp.status_code == 404:
        raise _error(AdaptyNotFoundError, resp)
    raise _error(AdaptyRequestError, resp)
