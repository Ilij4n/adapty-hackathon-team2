"""One-command demo: `python -m casedesk.demo` (or `python -m casedesk`).

Starts the Case Desk app in demo mode with the mock Adapty server running in-process (no second server, no network
except the LLM). Listens on 0.0.0.0, port from --port / env PORT / CASEDESK_PORT (default 8100).

    python -m casedesk.demo                      # LLM backend from CASEDESK_LLM (unset: claude CLI if installed)
    python -m casedesk.demo --llm fake --port 8137
    python -m casedesk.demo --external-mock      # mock Adapty as its own HTTP server on port+1 (inspectable)

Env defaults it sets when unset: CASEDESK_DEMO=1, CASEDESK_NOW=<seed snapshot time from data/demo_users.json>,
CASEDESK_DB=./var/casedesk.db, CONSOLE_TOKEN=demo-console (the /console page is pre-authorised in demo mode).
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _seed_now() -> str | None:
    f = ROOT / "data" / "demo_users.json"
    try:
        return json.loads(f.read_text(encoding="utf-8"))["meta"]["now"]
    except (OSError, ValueError, KeyError):
        return None


def _lan_ip() -> str | None:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description="Run the Case Desk demo (app + mock Adapty).")
    ap.add_argument("--host", default=os.environ.get("CASEDESK_HOST", "0.0.0.0"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT") or os.environ.get("CASEDESK_PORT") or 8100))
    ap.add_argument("--llm", help="claude-cli | anthropic | fake | none (sets CASEDESK_LLM)")
    ap.add_argument("--external-mock", action="store_true", help="serve the mock Adapty API on port+1 instead of in-process")
    ap.add_argument("--open", action="store_true", help="open a browser on /help")
    a = ap.parse_args()

    os.environ.setdefault("CASEDESK_DEMO", "1")
    os.environ.setdefault("CONSOLE_TOKEN", "demo-console")
    os.environ.setdefault("CASEDESK_DB", str(Path.cwd() / "var" / "casedesk.db"))
    now = _seed_now()
    if now:
        os.environ.setdefault("CASEDESK_NOW", now)
    if a.llm:
        os.environ["CASEDESK_LLM"] = a.llm

    import uvicorn

    if a.external_mock:
        from casedesk.adapty import mock_server
        mport = a.port + 1
        os.environ.setdefault("ADAPTY_API_BASE", f"http://127.0.0.1:{mport}")
        os.environ.setdefault("ADAPTY_SECRET_KEY", "secret_live_demo")
        cfg = uvicorn.Config(mock_server.create_app(), host="127.0.0.1", port=mport, log_level="warning")
        threading.Thread(target=uvicorn.Server(cfg).run, daemon=True).start()
        time.sleep(0.5)

    shown = "localhost" if a.host in ("0.0.0.0", "::") else a.host
    lan = _lan_ip() if a.host in ("0.0.0.0", "::") else None
    print("\n  Case Desk demo")
    print(f"    landing   http://{shown}:{a.port}/")
    print(f"    help      http://{shown}:{a.port}/help" + (f"   (phones on the LAN: http://{lan}:{a.port}/help)" if lan else ""))
    print(f"    console   http://{shown}:{a.port}/console")
    print(f"    clock     CASEDESK_NOW={os.environ.get('CASEDESK_NOW', '(real time)')}   "
          f"LLM={os.environ.get('CASEDESK_LLM') or '(auto)'}   db={os.environ['CASEDESK_DB']}\n")
    if a.open:
        threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{a.port}/help")).start()
    uvicorn.run("casedesk.app.main:app", host=a.host, port=a.port, log_level="info")


if __name__ == "__main__":
    main()
