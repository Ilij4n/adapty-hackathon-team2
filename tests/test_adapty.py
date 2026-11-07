"""Builder 1: Adapty models, raw-JSON mapping, client errors/retries, mock server, seeded data."""
import asyncio
import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from casedesk.adapty import client as client_mod
from casedesk.adapty.client import (AdaptyAuthError, AdaptyClient, AdaptyNotFoundError, AdaptyRateLimitError,
                                    AdaptyRequestError, AdaptyServerError, map_profile)
from casedesk.adapty.mock_server import create_app
from casedesk.adapty.models import Profile
from casedesk.adapty.seed_loader import DATA_DIR, load_raw, situation

NOW = datetime(2026, 11, 4, 0, 12, 4, tzinfo=timezone.utc)
UTC = timezone.utc


def run(coro):
    return asyncio.run(coro)


# --------------------------------------------------------------------------- raw fixture (documented shape)

def _sub(**kw):
    base = {
        "store": "app_store", "store_product_id": "lumen.annual", "store_base_plan_id": None,
        "store_transaction_id": "2000000815013007", "store_original_transaction_id": "2000000815013001",
        "offer": None, "environment": "Production",
        "purchased_at": "2026-10-01T10:00:00+00:00", "originally_purchased_at": "2025-10-01T10:00:00+00:00",
        "expires_at": "2027-10-01T10:00:00+00:00", "renewal_cancelled_at": None,
        "billing_issue_detected_at": None, "is_in_grace_period": False, "cancellation_reason": None,
    }
    base.update(kw)
    return base


def _al(**kw):
    s = _sub(**{k: v for k, v in kw.items() if k != "access_level_id"})
    s.pop("environment")
    return {"access_level_id": kw.get("access_level_id", "premium"), "starts_at": None, **s}


RAW = {
    "app_id": "14c3d333-2f3a-455a-aa86-ef83dff6913b",
    "profile_id": "d8533a10-bcce-4e33-8c9d-88b05ac56559",
    "customer_user_id": "cust_1",
    "total_revenue_usd": 49.99, "segment_hash": "fdaeef7f8aaa33c9", "timestamp": 1733324566777,
    "custom_attributes": [{"key": "acquisition_channel", "value": "tiktok_ads"},
                          {"key": "photos_imported", "value": 35.0}],
    "access_levels": [
        _al(),  # renewing annual
        _al(access_level_id="pro", store="play_store", store_product_id="lumen_pro_annual",
            expires_at="2026-11-10T00:00:00Z", renewal_cancelled_at="2026-10-05T00:00:00+0000",
            cancellation_reason="voluntarily_cancelled"),
    ],
    "subscriptions": [
        _sub(),
        _sub(store="play_store", store_product_id="lumen_pro_annual", store_transaction_id="GPA.1",
             store_original_transaction_id="GPA.1", purchased_at="2026-09-01T00:00:00Z",
             originally_purchased_at="2026-09-01T00:00:00Z", expires_at="2026-11-10T00:00:00Z",
             renewal_cancelled_at="2026-10-05T00:00:00+0000", cancellation_reason="voluntarily_cancelled",
             environment="Sandbox"),
        _sub(store_product_id="lumen.weekly", offer={"category": "introductory", "type": "free_trial", "id": None},
             purchased_at="2026-08-01T00:00:00Z", originally_purchased_at="2026-08-01T00:00:00Z",
             expires_at="2026-08-03T00:00:00Z", cancellation_reason="refund"),
        _sub(store_product_id="lumen.monthly", purchased_at="2026-10-01T00:00:00Z",
             originally_purchased_at="2026-10-01T00:00:00Z", expires_at="2026-11-01T00:00:00Z",
             billing_issue_detected_at="2026-11-01T00:00:00Z", is_in_grace_period=True),
    ],
    "non_subscriptions": [
        {"purchase_id": "7a5f9a7d-e236-33e6-96d8-53a3c59c5562", "store": "app_store",
         "store_product_id": "lumen.lifetime", "store_base_plan_id": None, "store_transaction_id": "30002109551456",
         "store_original_transaction_id": "30002109551456", "purchased_at": "2022-10-12T09:42:50+00:00",
         "environment": "Production", "is_refund": False, "is_consumable": False},
        {"purchase_id": "x", "store": "app_store", "store_product_id": "coins.100", "store_base_plan_id": None,
         "store_transaction_id": "1", "store_original_transaction_id": "1",
         "purchased_at": "2022-10-12T09:42:50+00:00", "environment": "Production",
         "is_refund": False, "is_consumable": True},
    ],
}
EXTRAS = {"store_country": "RS", "platform": "iOS", "locale": "sr_RS",
          "prices": {"lumen.annual": {"amount": 46.99, "currency": "EUR"}},
          "sale_context": {"acquisition_channel": "old_value", "placement": "main", "flow": "main_lifetime"}}


def test_map_profile_top_level_fields():
    p = map_profile(RAW, NOW, EXTRAS)
    assert isinstance(p, Profile)
    assert p.profile_id == RAW["profile_id"] and p.customer_user_id == "cust_1"
    assert (p.store_country, p.platform, p.locale) == ("RS", "iOS", "sr_RS")
    assert p.custom_attributes == {"acquisition_channel": "tiktok_ads", "photos_imported": 35.0}
    # live custom attribute wins over the CSV stand-in; placement/flow come from extras
    assert p.sale_context == {"acquisition_channel": "tiktok_ads", "placement": "main", "flow": "main_lifetime"}


def test_map_access_levels():
    p = map_profile(RAW, NOW, EXTRAS)
    prem, pro = p.access_levels
    assert prem.id == "premium" and prem.is_active and not prem.is_lifetime and prem.will_renew
    assert prem.expires_at == datetime(2027, 10, 1, 10, tzinfo=UTC)
    assert prem.store == "app_store" and prem.vendor_product_id == "lumen.annual"
    assert not prem.is_granted_by_developer
    assert pro.id == "pro" and pro.is_active and not pro.will_renew  # cancelled, paid up
    assert pro.store == "play_store" and pro.vendor_product_id == "lumen_pro_annual"


def test_map_subscription_every_field():
    p = map_profile(RAW, NOW, EXTRAS)
    by = {s.vendor_product_id: s for s in p.subscriptions}
    a = by["lumen.annual"]
    assert a.store == "app_store" and a.access_level_id == "premium"
    assert a.is_active and a.will_renew and not a.is_lifetime
    assert a.starts_at == a.purchased_at == datetime(2025, 10, 1, 10, tzinfo=UTC)  # original purchase
    assert a.renewed_at == datetime(2026, 10, 1, 10, tzinfo=UTC)  # latest renewal
    assert a.expires_at == datetime(2027, 10, 1, 10, tzinfo=UTC)
    assert a.unsubscribed_at is None and a.billing_issue_detected_at is None and not a.is_in_grace_period
    assert not a.is_refund and a.refunded_at is None and not a.is_sandbox and not a.is_family_shared
    assert a.offer_type is None and a.cancellation_reason is None
    assert a.price.amount == 46.99 and a.price.currency == "EUR"

    pro = by["lumen_pro_annual"]
    assert pro.access_level_id == "pro" and pro.is_active and not pro.will_renew
    assert pro.unsubscribed_at == datetime(2026, 10, 5, tzinfo=UTC)  # "+0000" offset parsed
    assert pro.cancellation_reason == "voluntarily_cancelled" and pro.is_sandbox
    assert pro.renewed_at is None and pro.price is None

    w = by["lumen.weekly"]
    assert w.offer_type == "free_trial" and w.is_refund and not w.is_active and not w.will_renew
    assert w.refunded_at == datetime(2026, 8, 3, tzinfo=UTC)
    assert w.access_level_id is None

    m = by["lumen.monthly"]
    assert m.is_in_grace_period and m.is_active  # expired but in grace => still active
    assert m.billing_issue_detected_at == datetime(2026, 11, 1, tzinfo=UTC)

    life = by["lumen.lifetime"]
    assert life.is_lifetime and life.is_active and not life.will_renew and not life.is_refund
    assert life.purchased_at == datetime(2022, 10, 12, 9, 42, 50, tzinfo=UTC)
    assert "coins.100" not in by  # consumables are not subscriptions


def test_platform_fallback_without_extras():
    p = map_profile(RAW, NOW, None)
    assert p.platform == "iOS" and p.store_country is None and p.locale is None
    assert p.sale_context == {"acquisition_channel": "tiktok_ads"}


def test_granted_access_level_mapping():
    raw = {**RAW, "subscriptions": [], "non_subscriptions": [], "access_levels": [
        {"access_level_id": "premium", "store": "adapty", "store_product_id": "", "store_base_plan_id": None,
         "store_transaction_id": "", "store_original_transaction_id": "", "offer": None, "starts_at": None,
         "purchased_at": "2026-11-04T00:00:00Z", "originally_purchased_at": "2026-11-04T00:00:00Z",
         "expires_at": "2026-11-07T00:00:00Z", "renewal_cancelled_at": None, "billing_issue_detected_at": None,
         "is_in_grace_period": False, "cancellation_reason": None}]}
    al = map_profile(raw, NOW).access_levels[0]
    assert al.is_granted_by_developer and al.is_active and not al.will_renew and al.vendor_product_id is None


# --------------------------------------------------------------------------- client against MockTransport

def _client(handler, **kw):
    kw.setdefault("backoff", 0)
    return AdaptyClient("https://api.adapty.io", "secret_live_x", transport=httpx.MockTransport(handler),
                        extras={}, now_fn=lambda: NOW, **kw)


def test_request_format_and_get_profile():
    seen = {}

    def handler(req: httpx.Request):
        seen["url"], seen["h"] = str(req.url), req.headers
        return httpx.Response(200, json={"data": RAW})

    p = run(_client(handler).get_profile("cust_1"))
    assert seen["url"] == "https://api.adapty.io/api/v2/server-side-api/profile/"
    assert seen["h"]["authorization"] == "Api-Key secret_live_x"
    assert seen["h"]["adapty-customer-user-id"] == "cust_1"
    assert p.customer_user_id == "cust_1"


def test_404_returns_none():
    body = {"errors": [{"source": None, "errors": ["Profile not found"]}],
            "error_code": "profile_does_not_exist", "status_code": 404}
    assert run(_client(lambda r: httpx.Response(404, json=body)).get_profile("nobody")) is None
    with pytest.raises(AdaptyNotFoundError):
        run(_client(lambda r: httpx.Response(404, json=body)).grant_access_level("nobody", "premium", NOW))


def test_401_typed_no_retry():
    calls = []

    def handler(req):
        calls.append(1)
        return httpx.Response(401, json={"errors": [{"source": "non_field_errors", "errors": [
            "Authentication credentials were not provided."]}], "error_code": "not_authenticated",
            "status_code": 401})

    with pytest.raises(AdaptyAuthError) as ei:
        run(_client(handler).get_profile("x"))
    assert ei.value.error_code == "not_authenticated" and len(calls) == 1


def test_429_and_5xx_retry_then_succeed():
    seq = [httpx.Response(429, headers={"Retry-After": "0"}), httpx.Response(503), httpx.Response(200, json={"data": RAW})]
    assert run(_client(lambda r: seq.pop(0)).get_profile("cust_1")) is not None
    assert not seq


def test_retries_exhausted():
    with pytest.raises(AdaptyRateLimitError):
        run(_client(lambda r: httpx.Response(429), max_retries=2).get_profile("x"))
    calls = []

    def boom(r):
        calls.append(1)
        return httpx.Response(500)

    with pytest.raises(AdaptyServerError):
        run(_client(boom, max_retries=2).get_profile("x"))
    assert len(calls) == 3

    def neterr(r):
        raise httpx.ConnectError("down")

    with pytest.raises(AdaptyServerError):
        run(_client(neterr, max_retries=1).get_profile("x"))


# --------------------------------------------------------------------------- mock server (seeded data)

@pytest.fixture(scope="module")
def bundle():
    if not (DATA_DIR / "profiles_raw.json.gz").exists():
        pytest.skip("run `python -m casedesk.adapty.seed_loader` first")
    return load_raw()


def _mock_client(bundle, **kw):
    app = create_app(bundle=bundle, secret_key=kw.pop("server_key", None), now_fn=lambda: NOW)
    return AdaptyClient("http://mock", kw.pop("key", "secret_live_demo"), transport=httpx.ASGITransport(app=app),
                        extras=bundle["extras"], now_fn=lambda: NOW, backoff=0, **kw)


def test_mock_serves_documented_shape(bundle):
    async def go():
        c = _mock_client(bundle)
        raw = await c.get_raw_profile("lumen_demo_00009")
        await c.aclose()
        return raw
    raw = run(go())
    assert set(raw) == {"app_id", "profile_id", "customer_user_id", "total_revenue_usd", "segment_hash",
                        "timestamp", "custom_attributes", "access_levels", "subscriptions", "non_subscriptions"}
    assert set(raw["subscriptions"][0]) == set(_sub())
    assert set(raw["access_levels"][0]) == set(_al())


def test_mock_404_and_401(bundle):
    assert run(_mock_client(bundle).get_profile("lumen_demo_99999")) is None
    with pytest.raises(AdaptyAuthError):
        run(_mock_client(bundle, key="", max_retries=0).get_profile("lumen_demo_00009"))
    with pytest.raises(AdaptyAuthError):
        run(_mock_client(bundle, key="wrong", server_key="right").get_profile("lumen_demo_00009"))
    with pytest.raises(AdaptyRequestError):
        run(_mock_client(bundle).grant_access_level("lumen_demo_00009", "gold", NOW))


def test_u00009_serbian_cancelled_paid_up(bundle):
    p = run(_mock_client(bundle).get_profile("lumen_demo_00009"))
    assert (p.platform, p.store_country, p.locale) == ("iOS", "RS", "sr_RS")
    (s,) = p.subscriptions
    assert s.vendor_product_id == "lumen.pro_annual" and s.store == "app_store" and s.access_level_id == "pro"
    assert s.is_active and not s.will_renew and s.cancellation_reason == "voluntarily_cancelled"
    assert s.unsubscribed_at.date().isoformat() == "2026-09-23"
    assert s.expires_at.date().isoformat() == "2027-07-13"
    assert 250 < (s.expires_at - NOW).days <= 252
    assert s.price.amount == 66.99 and s.price.currency == "EUR"
    assert p.sale_context["acquisition_channel"] == "apple_search_ads"
    assert p.sale_context["placement"] == "ai_limit_reached" and p.sale_context["flow"] == "ai_limit"


def test_grant_round_trip(bundle):
    cuid = "lumen_demo_02317"  # es_MX Android, expired on billing error

    async def go():
        c = _mock_client(bundle)
        before = await c.get_profile(cuid)
        resp = await c.grant_access_level(cuid, "premium", NOW + timedelta(days=3))
        after = await c.get_profile(cuid)
        other = await c.get_profile("lumen_demo_00009")
        await c.aclose()
        return before, resp, after, other

    before, resp, after, other = run(go())
    assert not any(a.is_active for a in before.access_levels)
    assert resp["data"]["customer_user_id"] == cuid
    (al,) = [a for a in after.access_levels if a.id == "premium"]
    assert al.is_active and al.is_granted_by_developer and al.expires_at == NOW + timedelta(days=3)
    assert after.subscriptions == before.subscriptions  # the grant is not a transaction
    assert not any(a.is_granted_by_developer for a in other.access_levels)
    # original bundle untouched (mock copies its state)
    assert bundle["profiles"][cuid]["access_levels"][0]["store"] == "play_store"


def test_revoke_round_trip(bundle):
    async def go():
        c = _mock_client(bundle)
        await c.revoke_access_level("lumen_demo_00009", "pro")
        p = await c.get_profile("lumen_demo_00009")
        await c.aclose()
        return p
    p = run(go())
    assert not p.access_levels[0].is_active


def test_lookup_by_profile_id(bundle):
    app = create_app(bundle=bundle, now_fn=lambda: NOW)
    pid = bundle["profiles"]["lumen_demo_00054"]["profile_id"]

    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://m") as h:
            return await h.get("/api/v2/server-side-api/profile/",
                               headers={"Authorization": "Api-Key k", "adapty-profile-id": pid})
    r = run(go())
    assert r.status_code == 200 and r.json()["data"]["customer_user_id"] == "lumen_demo_00054"


# --------------------------------------------------------------------------- seeded population

def test_demo_users_file_consistent(bundle):
    demo = json.loads((DATA_DIR / "demo_users.json").read_text())
    now = datetime.fromisoformat(demo["meta"]["now"])
    sits = {d["situation"] for d in demo["users"]}
    for need in ("CANCELLED_PAID_UP", "EXPIRED_BILLING_ERROR", "REFUNDED", "LIFETIME", "ACTIVE_RENEWING",
                 "TRIAL_ACTIVE", "NO_PURCHASE"):
        assert need in sits
    for d in demo["users"]:
        assert situation(bundle["profiles"][d["customer_user_id"]], now) == d["situation"]
    assert sum(demo["population"].values()) == 5000


def test_every_seeded_profile_maps(bundle):
    for cuid, raw in bundle["profiles"].items():
        p = map_profile(raw, NOW, bundle["extras"][cuid])
        assert p.customer_user_id == cuid
        for s in p.subscriptions:
            assert s.access_level_id in ("premium", "pro")
            assert s.price is not None


def test_default_env(monkeypatch):
    monkeypatch.setenv("ADAPTY_API_BASE", "http://localhost:8090/")
    monkeypatch.setenv("ADAPTY_SECRET_KEY", "k1")
    monkeypatch.setenv("CASEDESK_NOW", "2026-11-04T00:12:04Z")
    c = AdaptyClient(extras={})
    assert c.base_url == "http://localhost:8090" and c.secret_key == "k1"
    assert client_mod.get_now() == NOW
