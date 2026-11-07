"""Regression tests for the backend bug-bash (docs/bugbash-backend.md). One test per fixed bug, plus pins for the
approval paths that were checked and found correct."""
from __future__ import annotations

import threading
from datetime import datetime, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from casedesk.adapty import mock_server
from casedesk.adapty.client import GRANT_PATH, AdaptyClient
from casedesk.adapty.models import Money, Profile, Subscription
from casedesk.app import auth, deps
from casedesk.app.main import create_app
from casedesk.app.store import Store
from casedesk.engine import facts as F
from casedesk.engine import policy as P
from casedesk.engine.state import classify

NOW = datetime(2026, 11, 4, 0, 12, 4, tzinfo=timezone.utc)
GRANT_USER = "lumen_demo_00239"
CON = {"X-Console-Token": "tok"}


def dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def expired_trial() -> Profile:
    """lumen_demo_00540 as the client maps it: free trial cancelled the next day, never converted; the mapped
    price is the catalog price (6.99), not an amount charged."""
    return Profile(profile_id="p", customer_user_id="lumen_demo_00540", platform="iOS", subscriptions=[Subscription(
        vendor_product_id="lumen.weekly", store="app_store", access_level_id="premium", is_active=False,
        starts_at=dt("2026-10-08T04:03:00Z"), purchased_at=dt("2026-10-08T04:03:00Z"),
        expires_at=dt("2026-10-11T04:03:00Z"), unsubscribed_at=dt("2026-10-09T10:00:00Z"),
        offer_type="free_trial", cancellation_reason="voluntarily_cancelled",
        price=Money(amount=6.99, currency="USD"))])


# ---------------------------------------------------------------- engine
def test_never_charged_trial_is_not_told_last_charge_was_before_cancel():
    p = expired_trial()
    st = classify(p, NOW)
    assert st.code == "EXPIRED_CANCELLED"
    acts = P.decide(st, "CHARGED_AFTER_CANCEL", F.build(p, st, NOW), [])
    assert acts[0].params["claim_contradicted"] is True
    assert acts[0].params["reason"] == "no_charge_on_account"   # was "charged_before_cancel" (no charge exists)


def test_never_charged_trial_price_is_labelled_after_trial():
    p = expired_trial()
    st = classify(p, NOW)
    f = F.build(p, st, NOW).fields
    assert "price" not in f and f["price_after_trial"] == "6.99 USD"
    assert "last_charged_on" not in f
    # a running trial keeps `price` for "then it costs X" (and also gets price_after_trial)
    p.subscriptions[0] = p.subscriptions[0].model_copy(update={
        "expires_at": dt("2026-11-06T00:00:00Z"), "unsubscribed_at": None, "will_renew": True, "is_active": True,
        "cancellation_reason": None})
    st = classify(p, NOW)
    assert st.code == "TRIAL_ACTIVE"
    f = F.build(p, st, NOW).fields
    assert f["price"] == f["price_after_trial"] == "6.99 USD"


# ---------------------------------------------------------------- app (real modules, in-process mock Adapty)
@pytest.fixture()
def env(monkeypatch):
    monkeypatch.setenv("CASEDESK_DEMO", "1")
    monkeypatch.setenv("CASEDESK_LLM", "none")
    monkeypatch.setenv("CASEDESK_NOW", "2026-11-04T00:12:04Z")
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "20")
    monkeypatch.setenv("CASEDESK_CHAT_RATE", "50")
    monkeypatch.setenv("CONSOLE_TOKEN", "tok")
    monkeypatch.delenv("APP_SIGNING_SECRET", raising=False)
    monkeypatch.delenv("ADAPTY_API_BASE", raising=False)
    deps.clear_forced()
    yield
    deps.clear_forced()


class Flaky:
    """The mock Adapty app with switchable failures per path ("profile" / "grant")."""

    def __init__(self):
        self.mock = mock_server.create_app()
        self.fail = {"profile": None, "grant": None}

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            status = self.fail["grant" if scope["path"] == GRANT_PATH else "profile"]
            if status:
                await send({"type": "http.response.start", "status": status,
                            "headers": [(b"content-type", b"application/json")]})
                await send({"type": "http.response.body", "body": b'{"error_code":"server_error","errors":[]}'})
                return
        await self.mock(scope, receive, send)


@pytest.fixture()
def app_and_mock(env, tmp_path):
    flaky = Flaky()
    adapty = AdaptyClient(base_url="http://mock", secret_key="k", transport=httpx.ASGITransport(app=flaky),
                          backoff=0.0)
    app = create_app(store=Store(tmp_path / "bb.db"), adapty=adapty)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c, flaky


@pytest.fixture()
def client(app_and_mock):
    return app_and_mock[0]


def chat(c, cuid, msg="I paid but I have no premium", sig=None, **kw):
    return c.post("/api/chat", json={"customer_user_id": cuid, "message": msg,
                                     "signature": auth.sign(cuid) if sig is None else sig, **kw})


def test_validation_error_does_not_echo_input(client):
    r = chat(client, GRANT_USER, msg="a" * 50_000)
    assert r.status_code == 422 and len(r.content) < 1000          # was: the 50k message echoed back
    body = '{"customer_user_id": "lumen_demo_\\ud800", "signature": "ab", "message": "x"}'
    r = client.post("/api/chat", content=body, headers={"content-type": "application/json"})
    assert r.status_code == 422                                       # was: 500 (echoed surrogate un-encodable)
    body = '{"customer_user_id": "%s", "signature": "%s", "message": "hi \\ud800"}' % (GRANT_USER, auth.sign(GRANT_USER))
    assert client.post("/api/chat", content=body, headers={"content-type": "application/json"}).status_code == 422


def test_non_ascii_user_id_or_signature_is_401_not_500(client):
    assert chat(client, "lumen_ü").status_code == 401                 # was: 500 (httpx header encode)
    assert chat(client, "lumen\r\nX-Evil: 1").status_code == 401      # header injection attempt
    assert chat(client, GRANT_USER, sig="é" * 64).status_code == 401  # was: 500 (compare_digest TypeError)
    q = {"customer_user_id": "lumen_ü", "signature": auth.sign("lumen_ü")}
    assert client.get("/api/status", params=q).status_code == 401


def test_poll_with_out_of_range_id_is_422(client):
    q = {"customer_user_id": GRANT_USER, "signature": auth.sign(GRANT_USER)}
    assert client.get("/api/chat/99999999999999999999999", params=q).status_code == 422   # was: 500
    assert client.get("/api/chat/0", params=q).status_code == 422


def test_adapty_profile_failure_is_503(app_and_mock):
    c, flaky = app_and_mock
    flaky.fail["profile"] = 503
    r = chat(c, GRANT_USER)
    assert r.status_code == 503 and "try again" in r.json()["detail"]   # was: bare 500
    q = {"customer_user_id": GRANT_USER, "signature": auth.sign(GRANT_USER)}
    assert c.get("/api/status", params=q).status_code == 503
    flaky.fail["profile"] = None
    assert chat(c, GRANT_USER).status_code == 200


def test_pending_approval_is_created_once_under_concurrency(tmp_path, monkeypatch):
    st = Store(tmp_path / "race.db")
    real = st._all

    def slow_all(sql, args=()):  # widen the check-then-insert window
        out = real(sql, args)
        if "status='pending'" in sql:
            threading.Event().wait(0.02)
        return out

    monkeypatch.setattr(st, "_all", slow_all)
    ids = []
    ts = [threading.Thread(target=lambda: ids.append(st.create_approval_once("c", "u1", "premium", 3, None)))
          for _ in range(12)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert len({i for i, _ in ids}) == 1 and sum(created for _, created in ids) == 1
    assert len(st.list_approvals("pending")) == 1


def test_orphaned_pending_reply_is_reported_after_restart(env, tmp_path, monkeypatch):
    db = tmp_path / "restart.db"
    st = Store(db)
    cid = st.create_case(GRANT_USER, {})
    mid = st.add_message(cid, "assistant", "", {"status": "pending"})
    # the message was written by the previous process 1 minute ago; this process has no worker for it
    st._x("UPDATE messages SET created_at=? WHERE id=?", ("2020-01-01T00:00:00+00:00", mid))
    app = create_app(store=Store(db))
    with TestClient(app) as c:
        q = {"customer_user_id": GRANT_USER, "signature": auth.sign(GRANT_USER)}
        d = c.get(f"/api/chat/{mid}", params=q).json()
    assert d["reply_status"] == "error" and d["reply"]                 # was: "pending" forever


def test_fresh_pending_reply_still_pending(env, tmp_path):
    st = Store(tmp_path / "fresh.db")
    cid = st.create_case(GRANT_USER, {})
    mid = st.add_message(cid, "assistant", "", {"status": "pending"})
    with TestClient(create_app(store=st)) as c:
        q = {"customer_user_id": GRANT_USER, "signature": auth.sign(GRANT_USER)}
        assert c.get(f"/api/chat/{mid}", params=q).json()["reply_status"] == "pending"


def test_malformed_casedesk_now_fails_at_startup(env, monkeypatch, tmp_path):
    monkeypatch.setenv("CASEDESK_NOW", "garbage")
    app = create_app(store=Store(tmp_path / "c.db"))
    with pytest.raises(RuntimeError, match="CASEDESK_NOW"):
        with TestClient(app):
            pass


# ---------------------------------------------------------------- approvals: checked, correct; pinned
def test_grant_failure_marks_failed_and_user_can_ask_again(app_and_mock):
    c, flaky = app_and_mock
    d = chat(c, GRANT_USER).json()
    assert d["pending_approval"] and d["approval_id"]
    flaky.fail["grant"] = 503
    r = c.post(f"/api/approvals/{d['approval_id']}/approve", headers=CON)
    assert r.status_code == 502
    a = c.get("/api/approvals", headers=CON).json()["approvals"][0]
    assert a["status"] == "failed" and "503" in a["result"]["error"]
    # Round 2 retry contract (Builder 4, O6): a failed approval stays open. Asking again reuses it and the user is
    # told it's still under review; the console can retry it, and the retry calls Adapty again.
    d2 = chat(c, GRANT_USER).json()
    assert d2["pending_approval"] and d2["approval_id"] == d["approval_id"]
    assert c.post(f"/api/approvals/{d['approval_id']}/approve", headers=CON).status_code == 502   # still down
    flaky.fail["grant"] = None
    r = c.post(f"/api/approvals/{d['approval_id']}/approve", headers=CON)
    assert r.status_code == 200 and r.json()["approval"]["status"] == "approved"
    assert c.post(f"/api/approvals/{d['approval_id']}/approve", headers=CON).status_code == 409


def test_concurrent_approve_grants_once_and_expiry_follows_clock(client):
    aid = chat(client, GRANT_USER).json()["approval_id"]
    codes = []
    ts = [threading.Thread(target=lambda: codes.append(
        client.post(f"/api/approvals/{aid}/approve", headers=CON).status_code)) for _ in range(6)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    assert sorted(codes) == [200] + [409] * 5
    a = client.get("/api/approvals", headers=CON).json()["approvals"][0]
    assert a["result"]["expires_at"].startswith("2026-11-07T00:12:04")   # CASEDESK_NOW + 3 days
    assert client.post(f"/api/approvals/{aid}/deny", headers=CON).status_code == 409
    d = chat(client, GRANT_USER).json()
    assert d["state_badge"]["code"] == "GRANTED_BY_DEVELOPER" and not d["pending_approval"]


def test_ninety_day_rule():
    p = Profile(profile_id="p", customer_user_id="u", platform="iOS", subscriptions=[Subscription(
        vendor_product_id="lumen.weekly", store="app_store", access_level_id="premium", is_active=False,
        starts_at=dt("2026-10-12T03:53:18Z"), purchased_at=dt("2026-10-12T03:53:18Z"),
        renewed_at=dt("2026-10-15T03:53:18Z"), expires_at=dt("2026-10-22T03:53:18Z"),
        billing_issue_detected_at=dt("2026-10-22T03:53:18Z"), cancellation_reason="billing_error",
        price=Money(amount=6.99, currency="USD"))])
    st = classify(p, NOW)
    f = F.build(p, st, NOW)

    def grants(status, created):
        h = [{"created_at": created, "approval": {"status": status, "decided_at": None}}]
        return [a.kind for a in P.decide(st, "PAID_NO_ACCESS", f, h)].count("PROPOSE_GRANT")

    # cutoff = NOW - 90 days = 2026-08-06T00:12:04Z
    assert grants("approved", "2026-08-07T00:00:00+00:00") == 0
    assert grants("approved", "2026-08-06T00:12:05+00:00") == 0
    assert grants("approved", "2026-08-05T00:00:00+00:00") == 1
    assert grants("pending", "2026-11-01T00:00:00+00:00") == 0
    assert grants("denied", "2026-11-01T00:00:00+00:00") == 1
    assert grants("failed", "2026-11-01T00:00:00+00:00") == 1
