"""End-to-end UI check with Playwright (Chromium headless shell).

    python tests/e2e_ui.py                 # starts its own demo server on a free port
    python tests/e2e_ui.py --url http://localhost:8137   # against a running demo server

Flow: load / ; open /help, pick the grant-eligible demo user, send a message, see the status card and the reply;
open /console, approve the pending grant; back in /help the status card shows the grant.
Screenshots of each page at 390px and 1280px go to docs/screens/.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
SHOTS = ROOT / "docs" / "screens"
CHROME = (glob.glob("/home/agent/.cache/ms-playwright/chromium_headless_shell-1234/*/chrome-headless-shell") or [None])[0]


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def start_server(stubs: bool) -> tuple[subprocess.Popen, str]:
    port = free_port()
    env = {**os.environ, "CASEDESK_DEMO": "1", "CASEDESK_LLM": os.environ.get("CASEDESK_LLM", "fake"),
           "CASEDESK_NOW": os.environ.get("CASEDESK_NOW", "2026-11-04T00:12:04Z"),
           "CASEDESK_DB": str(Path(tempfile.mkdtemp()) / "e2e.db"), "CASEDESK_CHAT_RATE": "50",
           "CASEDESK_INLINE_WAIT": "0"}  # always take the slow-LLM path: POST returns the status card, the UI polls
    if stubs:
        env["CASEDESK_STUBS"] = "all"
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "casedesk.app.main:app", "--host", "127.0.0.1",
                             "--port", str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(url + "/api/meta", timeout=1)
            return proc, url
        except OSError:
            time.sleep(0.1)
    proc.kill()
    raise RuntimeError("server did not start")


def shot(page, name: str) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.wait_for_timeout(700)  # let entry animations finish
    sw, vw = page.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    assert sw <= vw, f"{name}: page scrolls sideways ({sw}px content in a {vw}px viewport)"
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    print("  screenshot", SHOTS / f"{name}.png")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--dark", action="store_true", help="also take dark-mode screenshots")
    ap.add_argument("--stubs", action="store_true", help="server uses the app's stub engine/ai/adapty (CASEDESK_STUBS=all)")
    args = ap.parse_args()
    proc = None
    url = args.url
    if not url:
        proc, url = start_server(args.stubs)
    print("server:", url)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            schemes = ["light", "dark"] if args.dark else ["light"]
            for scheme in schemes:
                sfx = "" if scheme == "light" else "-dark"
                for w, h in ((390, 844), (1280, 860)):
                    ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme)
                    page = ctx.new_page()
                    errors: list[str] = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.goto(url + "/")
                    expect(page.get_by_role("heading", level=1)).to_contain_text("actually knows")
                    page.wait_for_timeout(3500 if w == 1280 else 3000)
                    shot(page, f"landing-{w}{sfx}")
                    page.goto(url + "/help")
                    expect(page.locator("#statusCard")).to_be_visible()
                    shot(page, f"help-start-{w}{sfx}")
                    assert not errors, errors
                    ctx.close()

            # ---- the flow: chat -> pending grant -> approve in console -> user sees it
            users = json.loads(urllib.request.urlopen(url + "/api/demo/users").read())["users"]
            ids = [u["customer_user_id"] for u in users]
            grant_user = os.environ.get("E2E_GRANT_USER") or next(
                (c for c in ("lumen_demo_00239", "lumen_ana") if c in ids), None) or (
                None if args.stubs else "lumen_demo_00239")  # the seed's only grant-eligible user (docs/requests.md)
            if not grant_user:
                for u in users:
                    q = urllib.parse.urlencode({"customer_user_id": u["customer_user_id"], "signature": u["signature"]})
                    st = json.loads(urllib.request.urlopen(f"{url}/api/status?{q}").read())
                    if st["state_badge"]["code"] in ("EXPIRED_BILLING_ERROR", "BILLING_RETRY"):
                        grant_user = u["customer_user_id"]
                        break
            assert grant_user, "no demo user in a billing-error state"
            print("  grant user:", grant_user)
            ctx = browser.new_context(viewport={"width": 390, "height": 844})
            page = ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            if grant_user in ids:
                page.goto(url + "/help?demo_user=" + grant_user)
            else:  # not in the picker: open it the way a host app would, with a signed uid
                os.environ.setdefault("CASEDESK_DEMO", "1")
                from casedesk.app.auth import sign
                page.goto(f"{url}/help?" + urllib.parse.urlencode({"uid": grant_user, "sig": sign(grant_user)}))
            expect(page.locator("#stateBadge")).to_have_class("badge bad")
            page.locator(".chip").nth(1).click()   # "I paid but have no premium", in the user's language
            bot = page.locator(".msg.bot").last
            expect(bot.locator(".bubble")).not_to_have_class("bubble typing", timeout=60000)
            expect(page.locator(".note.grant")).to_be_visible(timeout=60000)
            expect(page.locator("a.act").first).to_be_visible()
            print("  reply:", bot.locator(".bubble").inner_text()[:120])
            shot(page, "help-reply-390")

            con = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
            con.on("pageerror", lambda e: errors.append(str(e)))
            con.goto(url + "/console")
            expect(con.locator(".q-item")).to_have_count(1, timeout=10000)
            con.locator(".q-item").get_by_role("button", name="Open case").click()
            expect(con.locator(".d-head h2")).to_have_text(grant_user)
            shot(con, "console-pending-1280")
            con.locator(".q-item").get_by_role("button", name="Approve").click()
            expect(con.locator(".appr .st")).to_have_text("approved", timeout=10000)
            shot(con, "console-approved-1280")
            con.set_viewport_size({"width": 390, "height": 844})
            shot(con, "console-390")

            expect(page.locator(".msg.system")).to_be_visible(timeout=15000)
            expect(page.locator("#stateBadge")).to_have_class("badge ok")
            shot(page, "help-granted-390")

            wide = browser.new_context(viewport={"width": 1280, "height": 860}).new_page()
            wide.goto(url + "/help?demo_user=" + users[0]["customer_user_id"])
            expect(wide.locator("#statusCard")).to_be_visible()
            wide.fill("#msg", "Naplatili ste mi pretplatu posle otkazivanja! Zašto?")
            wide.click("#send")
            expect(wide.locator(".typing")).to_be_visible()
            wide.wait_for_timeout(250)
            wide.screenshot(path=str(SHOTS / "help-progress-1280.png"))
            print("  screenshot", SHOTS / "help-progress-1280.png")
            expect(wide.locator(".msg.bot .bubble").last).not_to_have_class("bubble typing", timeout=60000)
            shot(wide, "help-reply-1280")
            assert not errors, errors
            browser.close()
        print("E2E OK")
        return 0
    finally:
        if proc:
            proc.terminate()
            proc.wait(5)


if __name__ == "__main__":
    sys.exit(main())
