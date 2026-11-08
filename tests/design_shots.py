"""Screenshots of the design variants (/help?v=N, /console?v=N) with real seeded data, light and dark, 1440 and 390.

    uv run python tests/design_shots.py --variants 0,1,2,3,4 --out /tmp/shots    # 0 = the default pages

Each variant gets its own fresh demo server (seeded console, template replies, frozen demo clock). The script fails a
variant on any page error or console error, and on sideways scrolling at phone width. It writes report.json to --out.
"""
from __future__ import annotations

import argparse
import json
import os
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
from tests.e2e_ui import free_port  # noqa: E402

AVA, MARKO, DYLAN, NIKOLA = "lumen_demo_00239", "lumen_demo_00009", "lumen_demo_00319", "lumen_demo_02990"
DESK, PHONE = (1440, 900), (390, 844)


def start_server() -> tuple[subprocess.Popen, str]:
    db = Path(tempfile.mkdtemp()) / "shots.db"
    env = {**os.environ, "CASEDESK_DEMO": "1", "CASEDESK_LLM": "fake", "CASEDESK_NOW": "2026-11-04T00:12:04Z",
           "CASEDESK_DB": str(db), "CASEDESK_CHAT_RATE": "200"}
    subprocess.run([sys.executable, "-m", "casedesk.seed", "--db", str(db)], cwd=ROOT, env=env, check=True,
                   stdout=subprocess.DEVNULL)
    port = free_port()
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "casedesk.app.main:app", "--host", "127.0.0.1",
                             "--port", str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.STDOUT)
    url = f"http://127.0.0.1:{port}"
    for _ in range(150):
        try:
            urllib.request.urlopen(url + "/api/meta", timeout=1)
            return proc, url
        except OSError:
            time.sleep(0.1)
    proc.kill()
    raise RuntimeError("server did not start")


class Run:
    def __init__(self, browser, url: str, v: str, out: Path):
        self.browser, self.url, self.v, self.out = browser, url, v, out
        self.errors: list[str] = []
        self.files: list[str] = []
        out.mkdir(parents=True, exist_ok=True)

    def u(self, path: str, **q: str) -> str:
        if self.v and self.v != "0":
            q = {"v": self.v, **q}
        return self.url + path + ("?" + urllib.parse.urlencode(q) if q else "")

    def page(self, size, scheme: str):
        ctx = self.browser.new_context(viewport={"width": size[0], "height": size[1]}, color_scheme=scheme,
                                       device_scale_factor=2 if size[0] < 500 else 1)
        p = ctx.new_page()
        tag = f"{size[0]}-{scheme}"
        p.on("pageerror", lambda e: self.errors.append(f"[{tag}] pageerror: {e}"))
        p.on("console", lambda m: m.type == "error" and self.errors.append(f"[{tag}] console: {m.text}"))
        return p

    def shot(self, p, name: str, full: bool = False) -> None:
        p.wait_for_timeout(900)  # entry animations
        sw, vw = p.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        if sw > vw:
            self.errors.append(f"{name}: page scrolls sideways ({sw}px in {vw}px)")
        f = self.out / f"{name}.png"
        p.screenshot(path=str(f), full_page=full)
        self.files.append(f.name)

    # ---------------------------------------------------------------- help
    def help_flow(self, size, scheme: str, user: str, text: str | None, chip: int | None, name: str) -> None:
        p = self.page(size, scheme)
        p.goto(self.u("/help", demo_user=user))
        expect(p.locator("#statusCard")).to_be_visible(timeout=15000)
        self.shot(p, f"help-start-{name}")
        if chip is not None:
            p.locator(".chip").nth(chip).click()
        else:
            p.fill("#msg", text or "")
            p.click("#send")
        expect(p.locator(".msg.bot .bubble").last).not_to_have_class("bubble typing", timeout=60000)
        p.wait_for_timeout(600)
        self.shot(p, f"help-reply-{name}")
        p.context.close()

    # ---------------------------------------------------------------- console
    def open_case(self, p, user: str) -> None:
        item = p.locator(".c-item", has_text=user.split("_")[-1]).first
        item.click()
        expect(p.locator(".d-head h2")).to_contain_text(user.split("_")[-1], timeout=10000)

    def console_flow(self, size, scheme: str, phone: bool) -> None:
        p = self.page(size, scheme)
        sfx = f"{size[0]}-{scheme}"
        p.goto(self.u("/console"))
        expect(p.locator(".c-item").first).to_be_visible(timeout=15000)
        if phone:
            self.shot(p, f"console-list-{sfx}")
        if p.locator(".q-item .q-open").count():
            p.locator(".q-item .q-open").first.click()
        else:
            self.open_case(p, AVA)
        expect(p.locator(".d-head h2")).to_be_visible(timeout=10000)
        self.shot(p, f"console-ava-{sfx}")
        if not phone:
            self.shot(p, f"console-ava-full-{sfx}", full=True)
        self.open_case(p, DYLAN)
        self.shot(p, f"console-dylan-{sfx}")
        if not phone:
            more = p.locator("details.more summary")
            if more.count():
                more.first.click()
                p.wait_for_timeout(400)
            self.shot(p, f"console-dylan-details-{sfx}", full=True)
            self.open_case(p, NIKOLA)
            self.shot(p, f"console-nikola-{sfx}")
        p.context.close()

    def approve(self) -> None:
        p = self.page(DESK, "light")
        p.goto(self.u("/console"))
        expect(p.locator(".q-item")).to_have_count(1, timeout=15000)
        p.locator(".q-item .q-open").click()
        p.locator(".q-item .btn.approve").click()
        expect(p.locator(".grant.approved .done")).to_contain_text("Premium given", timeout=10000)
        expect(p.locator(".toast")).to_have_count(0, timeout=8000)
        self.shot(p, "console-approved-1440-light")
        p.context.close()

    MARKO_SAYS = "Naplatili ste mi pretplatu posle otkazivanja! Zašto?"

    def run(self) -> None:
        # Ava asks for her premium back (a pending grant for the console) on a phone; Marko writes in Serbian on a
        # laptop (the phone frame next to the demo picker). The dark twins run on a second server (run_dark), so the
        # console shows each conversation once.
        self.help_flow(PHONE, "light", AVA, None, 1, "ava-390-light")
        self.help_flow(DESK, "light", MARKO, self.MARKO_SAYS, None, "marko-1440-light")
        for scheme in ("light", "dark"):
            self.console_flow(DESK, scheme, phone=False)
            self.console_flow(PHONE, scheme, phone=True)
        self.approve()
        # Ava sees the grant
        p = self.page(PHONE, "light")
        p.goto(self.u("/help", demo_user=AVA))
        expect(p.locator("#stateBadge")).to_have_class("badge ok", timeout=15000)
        self.shot(p, "help-ava-granted-390-light")
        p.context.close()

    def run_dark(self) -> None:
        self.help_flow(PHONE, "dark", AVA, None, 1, "ava-390-dark")
        self.help_flow(DESK, "dark", MARKO, self.MARKO_SAYS, None, "marko-1440-dark")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", default="0,1,2,3,4")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    out = Path(args.out)
    report = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox"])
        for v in [x.strip() for x in args.variants.split(",") if x.strip()]:
            proc, url = start_server()
            r = Run(browser, url, v, out / f"v{v}")
            try:
                r.run()
            except Exception as e:  # keep going: one broken variant must not hide the others
                r.errors.append(f"flow failed: {type(e).__name__}: {str(e)[:400]}")
            finally:
                proc.terminate()
                proc.wait(5)
            proc, r.url = start_server()
            try:
                r.run_dark()
            except Exception as e:
                r.errors.append(f"dark help flow failed: {type(e).__name__}: {str(e)[:400]}")
            finally:
                proc.terminate()
                proc.wait(5)
            report[f"v{v}"] = {"errors": r.errors, "files": r.files}
            print(f"v{v}: {len(r.files)} shots, {len(r.errors)} problems")
            for e in r.errors:
                print("   ", e)
        browser.close()
    (out / "report.json").write_text(json.dumps(report, indent=2))
    return 1 if any(x["errors"] for x in report.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
