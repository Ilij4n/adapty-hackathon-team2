"""The MCP server (casedesk.mcp_server) against a real seeded Case Desk: real engine, in-process mock Adapty, no LLM.

Tools are called through a real MCP client session (in-memory transport), so the tool schemas and the JSON results
are what Claude Code / Claude Desktop would see. The server's HTTP calls go to the app through FastAPI's TestClient."""
from __future__ import annotations

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("mcp")

from mcp.shared.memory import create_connected_server_and_client_session  # noqa: E402

from casedesk import mcp_server as M  # noqa: E402
from casedesk import seed  # noqa: E402
from casedesk.app import auth, deps  # noqa: E402
from casedesk.app.main import create_app  # noqa: E402
from casedesk.app.store import Store  # noqa: E402

AVA = "lumen_demo_00239"
TOKEN = "tok"


@pytest.fixture()
def app_client(monkeypatch, tmp_path):
    monkeypatch.setenv("CASEDESK_DEMO", "1")
    monkeypatch.setenv("CASEDESK_LLM", "none")
    monkeypatch.setenv("CASEDESK_NOW", "2026-11-04T00:12:04Z")
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "20")
    monkeypatch.setenv("CASEDESK_CHAT_RATE", "50")
    monkeypatch.setenv("CONSOLE_TOKEN", TOKEN)
    monkeypatch.delenv("APP_SIGNING_SECRET", raising=False)
    monkeypatch.delenv("ADAPTY_API_BASE", raising=False)
    deps.clear_forced()
    st = Store(tmp_path / "mcp.db")
    seed.seed(st)
    with TestClient(create_app(store=st)) as c:
        yield c
    deps.clear_forced()


def ava_asks(c) -> dict:
    r = c.post("/api/chat", json={"customer_user_id": AVA, "signature": auth.sign(AVA),
                                  "message": "I paid but I have no premium", "locale": "en-US"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["pending_approval"] and d["approval_id"]
    return d


def run(c, calls: list[tuple[str, dict]], token: str = TOKEN) -> list:
    """Call tools in order through a real MCP client session; returns (is_error, structured-or-text) per call."""
    server = M.build_server(M.CaseDesk(url="http://testserver", token=token, client=c))

    async def go():
        out = []
        async with create_connected_server_and_client_session(server._mcp_server) as s:
            for name, args in calls:
                if name == "__list__":
                    out.append((False, (await s.list_tools()).tools))
                    continue
                r = await s.call_tool(name, args)
                out.append((r.isError, r.structuredContent if r.structuredContent is not None
                            else "".join(getattr(b, "text", "") for b in r.content)))
        return out
    return asyncio.run(go())


def call(c, name: str, **args):
    err, res = run(c, [(name, args)])[0]
    assert not err, res
    return res


def test_lists_the_tools_with_safety_annotations(app_client):
    tools = {t.name: t for t in run(app_client, [("__list__", {})])[0][1]}
    assert set(tools) == {"waiting_for_my_ok", "needs_a_person", "list_cases", "get_case", "daily_summary",
                          "approve_grant", "deny_grant"}
    for name in ("waiting_for_my_ok", "needs_a_person", "list_cases", "get_case", "daily_summary"):
        assert tools[name].annotations.readOnlyHint is True
    for name in ("approve_grant", "deny_grant"):
        t = tools[name]
        assert t.annotations.destructiveHint is True and t.annotations.readOnlyHint is False
        assert "confirm" in t.inputSchema["properties"] and "confirm=true" in t.description
    assert tools["list_cases"].inputSchema["properties"]["filter"]["enum"] == ["all", "escalated", "privacy", "waiting"]


def test_waiting_for_my_ok(app_client):
    assert call(app_client, "waiting_for_my_ok")["summary"] == "Nothing is waiting for your OK."
    d = ava_asks(app_client)
    res = call(app_client, "waiting_for_my_ok")
    assert res["summary"].startswith("1 grant waiting for your OK:")
    [w] = res["waiting"]
    assert w["approval_id"] == d["approval_id"] and w["who"] == "Ava · 00239"
    assert w["what"] == "3 days of Premium" and w["days"] == 3 and w["access_level"] == "premium"
    assert w["why"] == ("Paid, then the App Store couldn't take the renewal on 22 Oct 2026 "
                        "(Lumen Premium Weekly, App Store).")
    assert w["asked"] == "just now"
    assert "Ava · 00239: 3 days of Premium." in res["summary"]


def test_needs_a_person(app_client):
    res = call(app_client, "needs_a_person")
    by = {x["reason"]: x for x in res["cases"]}
    assert {"asked for a person", "privacy request", "tried to give orders"} <= set(by), by
    assert by["asked for a person"]["last_message"]
    assert "need a person" in res["summary"]
    # seeded Dylan: asked for a person while trying to give orders -> the orders are what the developer must see
    assert any("Dylan" in x["who"] and x["reason"] == "tried to give orders" for x in res["cases"])


def test_list_cases_filters_and_limit(app_client):
    ava_asks(app_client)
    allc = call(app_client, "list_cases")
    assert len(allc["cases"]) == 17   # 16 seeded + Ava
    assert call(app_client, "list_cases", limit=3)["summary"] == "17 cases (showing 3)."
    waiting = call(app_client, "list_cases", filter="waiting")["cases"]
    assert [w["who"] for w in waiting] == ["Ava · 00239"] and "waiting for your OK" in waiting[0]["flags"]
    priv = call(app_client, "list_cases", filter="privacy")["cases"]
    assert priv and all("privacy" in c["flags"] for c in priv)
    esc = call(app_client, "list_cases", filter="escalated")["cases"]
    assert esc and all("needs a person" in c["flags"] for c in esc)
    err, _ = run(app_client, [("list_cases", {"filter": "everything"})])[0]
    assert err


def test_get_case(app_client):
    d = ava_asks(app_client)
    res = call(app_client, "get_case", case_id=d["case_id"])
    assert res["summary"].startswith("Ava · 00239: Paid, then the App Store couldn't take the renewal")
    assert "A grant is waiting for your OK." in res["summary"]
    assert res["facts"]["expires_on"] == "2026-10-22" and res["facts"]["price"] == "6.99 USD"
    assert [m["from"] for m in res["conversation"]] == ["subscriber", "Case Desk"]
    assert "Asked you for a 3-day courtesy extension (Premium)" in res["what_case_desk_did"]
    assert res["validator"].startswith("Passed")
    assert res["grant_requests"][0]["status"] == "pending"
    err, msg = run(app_client, [("get_case", {"case_id": "../approvals"})])[0]
    assert err and "case_id looks wrong" in msg
    err, msg = run(app_client, [("get_case", {"case_id": "c_nope"})])[0]
    assert err and "No such case" in msg


def test_approve_needs_confirm_then_grants(app_client):
    d = ava_asks(app_client)
    aid = d["approval_id"]
    for args in ({"approval_id": aid}, {"approval_id": aid, "confirm": False}):
        res = call(app_client, "approve_grant", **args)
        assert res["done"] is False and "confirm must be true" in res["summary"]
    assert app_client.get("/api/approvals", headers={"X-Console-Token": TOKEN}).json()["approvals"][0]["status"] \
        == "pending"
    res = call(app_client, "approve_grant", approval_id=aid, confirm=True)
    assert res["done"] is True and res["status"] == "approved"
    assert res["summary"].startswith("Premium given to Ava until 7 Nov 2026.")
    # the demo runs on a frozen clock (4 Nov 2026); the answer says so instead of looking already expired
    assert res["case_desk_clock"] == "4 Nov 2026" and "demo clock" in res["summary"]
    # the console's own refusal comes back in words
    again = call(app_client, "approve_grant", approval_id=aid, confirm=True)
    assert again["done"] is False and again["summary"] == "Case Desk refused to approve: Approval is already approved."
    assert call(app_client, "waiting_for_my_ok")["waiting"] == []
    err, msg = run(app_client, [("approve_grant", {"approval_id": "a_missing", "confirm": True})])[0]
    assert err and "No grant request with id a_missing" in msg


def test_approve_refused_when_recheck_fails(app_client, monkeypatch):
    aid = ava_asks(app_client)["approval_id"]
    monkeypatch.setenv("CASEDESK_NOW", "2026-12-01T00:00:00Z")  # the 14-day window after the failed payment closed
    res = call(app_client, "approve_grant", approval_id=aid, confirm=True)
    assert res["done"] is False and res["summary"].startswith("Case Desk refused to approve: Not eligible any more:")


def test_deny_needs_confirm(app_client):
    aid = ava_asks(app_client)["approval_id"]
    assert call(app_client, "deny_grant", approval_id=aid)["done"] is False
    res = call(app_client, "deny_grant", approval_id=aid, confirm=True, reason="already gave one by email")
    assert res["done"] is True and res["status"] == "denied" and res["summary"].startswith("Denied: Ava gets no")
    assert res["reason_given"] == "already gave one by email"


def test_daily_summary(app_client):
    ava_asks(app_client)
    res = call(app_client, "daily_summary")
    assert res["cases"] == 1 and res["waiting_for_ok"] == 1 and res["intent"] == {"PAID_NO_ACCESS": 1}
    wide = call(app_client, "daily_summary", hours=24 * 30)
    assert wide["cases"] == 17 and wide["needs_a_person"] >= 3 and "sr-Cyrl" in wide["language"]


def test_bad_token_and_no_server_are_clear_errors(app_client):
    err, msg = run(app_client, [("waiting_for_my_ok", {})], token="wrong")[0]
    assert err and "console token" in msg
    import httpx
    server = M.build_server(M.CaseDesk(url="http://127.0.0.1:9", token=TOKEN,
                                       client=httpx.Client(base_url="http://127.0.0.1:9", timeout=2)))

    async def go():
        async with create_connected_server_and_client_session(server._mcp_server) as s:
            return await s.call_tool("list_cases", {})
    r = asyncio.run(go())
    assert r.isError and "Can't reach Case Desk" in r.content[0].text


def test_no_tool_talks_to_subscribers():
    """Read-mostly by construction: the only POSTs are the console's approve/deny endpoints."""
    import inspect
    src = inspect.getsource(M)
    assert "/api/chat" not in src
    assert src.count("cd.post(") == 1 and "/api/approvals/{a['id']}/{verb}" in src


def test_plain_english_helpers():
    assert M.day("2026-11-07T00:12:04+00:00") == "7 Nov 2026" and M.day("2026-10-22") == "22 Oct 2026"
    assert M.reason_text("no_store_self_service:stripe") == "the store (stripe) has no self-service for this"
    assert M.status_sentence({"code": "LIFETIME"}, {}) == "Has lifetime premium."
    assert json.dumps(M.validator_text({"violations": ["llm_error:x"], "llm_error": "llm_error:x"}))

