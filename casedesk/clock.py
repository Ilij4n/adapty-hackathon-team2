"""Case Desk's one clock.

Outside demo mode (no CASEDESK_NOW) it is the real UTC time and nothing else.

With CASEDESK_NOW set (the seeded Adapty snapshot's time, 2026-11-04T00:12:04Z), every "now" in the app — Adapty
state checks, facts, policy windows, approvals, grant expiry, chat messages, cases, audit log — comes from here, so
the console never shows a grant dated 4 Nov beside a message dated 8 Nov. CASEDESK_CLOCK picks how it moves:

  frozen   (default) always exactly CASEDESK_NOW — the tests rely on this
  ticking  starts at CASEDESK_NOW when the process first reads the clock and then runs at real speed:
           now = CASEDESK_NOW + (real_now - process_start). `python -m casedesk.demo` sets this.

Rate-limit windows and timeouts stay on real/monotonic time: they are relative and never shown.
"""
from __future__ import annotations

import os
import threading
from datetime import datetime, timedelta, timezone

_lock = threading.Lock()
_anchor: tuple[str, datetime] | None = None   # (CASEDESK_NOW value, real time when it was first read)


def _parse(v: str) -> datetime:
    s = v.strip().replace("Z", "+00:00")
    if len(s) > 5 and s[-5] in "+-" and s[-4:].isdigit() and s[-3] != ":":
        s = s[:-2] + ":" + s[-2:]
    dt = datetime.fromisoformat(s)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def mode() -> str:
    """'real' (no CASEDESK_NOW), 'frozen' or 'ticking'."""
    if not os.environ.get("CASEDESK_NOW"):
        return "real"
    return "ticking" if os.environ.get("CASEDESK_CLOCK", "frozen").strip().lower() == "ticking" else "frozen"


def start() -> None:
    """Pin the ticking clock's start to this moment (demo.py calls it before seeding and serving)."""
    if mode() == "ticking":
        now()


def now() -> datetime:
    """The app's current time (UTC, aware). Raises ValueError if CASEDESK_NOW is not an ISO date-time."""
    global _anchor
    env = os.environ.get("CASEDESK_NOW")
    real = datetime.now(timezone.utc)
    if not env:
        return real
    base = _parse(env)
    if mode() != "ticking":
        return base
    with _lock:
        if _anchor is None or _anchor[0] != env:
            _anchor = (env, real)
        started = _anchor[1]
    return base + max(real - started, timedelta(0))


def now_iso() -> str:
    return now().isoformat(timespec="seconds")
