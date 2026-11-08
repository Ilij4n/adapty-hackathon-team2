"""casedesk.clock: one clock for Adapty state, approvals, messages, cases and the audit log."""
from datetime import datetime, timedelta, timezone

from casedesk import clock
from casedesk.adapty import client
from casedesk.app import store

NOW = "2026-11-04T00:12:04Z"
BASE = datetime(2026, 11, 4, 0, 12, 4, tzinfo=timezone.utc)


def test_real_without_casedesk_now(monkeypatch):
    monkeypatch.delenv("CASEDESK_NOW", raising=False)
    monkeypatch.setenv("CASEDESK_CLOCK", "ticking")
    assert clock.mode() == "real"
    assert abs((clock.now() - datetime.now(timezone.utc)).total_seconds()) < 2


def test_frozen_is_the_default(monkeypatch):
    monkeypatch.setenv("CASEDESK_NOW", NOW)
    monkeypatch.delenv("CASEDESK_CLOCK", raising=False)
    assert clock.mode() == "frozen"
    assert clock.now() == BASE == client.get_now()
    assert store.now_iso() == "2026-11-04T00:12:04+00:00"


def test_ticking_starts_at_casedesk_now_and_runs_at_real_speed(monkeypatch):
    monkeypatch.setenv("CASEDESK_NOW", NOW)
    monkeypatch.setenv("CASEDESK_CLOCK", "ticking")
    t0 = datetime(2026, 11, 8, 9, 0, tzinfo=timezone.utc)
    real = [t0]

    class FakeDT(datetime):
        @classmethod
        def now(cls, tz=None):
            return real[0]

    monkeypatch.setattr(clock, "datetime", FakeDT)
    monkeypatch.setattr(clock, "_anchor", None)
    assert clock.now() == BASE
    real[0] = t0 + timedelta(hours=16, seconds=5)
    assert clock.now() == BASE + timedelta(hours=16, seconds=5)
    assert client.get_now() == clock.now()
    assert store.now_iso() == "2026-11-04T16:12:09+00:00"
