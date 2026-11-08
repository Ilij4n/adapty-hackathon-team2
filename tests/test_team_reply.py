"""The team reply: the developer writes to the subscriber from the console (POST /api/cases/{id}/reply), the widget
picks it up (signed GET /api/messages), and the MCP tools reply_to_user / resolve_case."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from casedesk.app import _stubs, auth, deps
from casedesk.app.main import create_app, team_fact_check
from casedesk.app.store import Store

SECRET = "test-signing-secret"
TOKEN = "test-console-token"
CON = {"X-Console-Token": TOKEN}
MARKO = "lumen_marko"


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_SIGNING_SECRET", SECRET)
    monkeypatch.setenv("CONSOLE_TOKEN", TOKEN)
    monkeypatch.setenv("CASEDESK_LLM", "fake")
    monkeypatch.setenv("CASEDESK_CHAT_RATE", "50")
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "10")
    monkeypatch.delenv("CASEDESK_DEMO", raising=False)
    deps.force_stubs()
    _stubs.reset()
    app = create_app(store=Store(tmp_path / "t.db"), adapty=_stubs.AdaptyClient())
    with TestClient(app) as c:
        yield c
    deps.clear_forced()


def chat(c, cuid, message, **kw):
    r = c.post("/api/chat", json={"customer_user_id": cuid, "signature": auth.sign(cuid, SECRET), "message": message,
                                  "locale": "en-US", **kw})
    assert r.status_code == 200, r.text
    return r.json()


def team_msgs(c, cuid, after=0, sig=None):
    return c.get("/api/messages", params={"customer_user_id": cuid, "after": after,
                                          "signature": sig if sig is not None else auth.sign(cuid, SECRET)})


def reply(c, case_id, text, headers=CON, **kw):
    return c.post(f"/api/cases/{case_id}/reply", json={"text": text, **kw}, headers=headers)


def test_reply_needs_console_auth(client):
    d = chat(client, MARKO, "I want to talk to a person")
    assert reply(client, d["case_id"], "Hi", headers={}).status_code == 401
    assert reply(client, d["case_id"], "Hi", headers={"X-Console-Token": "nope"}).status_code == 401
    assert reply(client, d["case_id"], "Hi", headers={"Authorization": f"Bearer {TOKEN}"}).status_code == 200
    client.cookies.set("casedesk_console", TOKEN)
    try:
        assert reply(client, d["case_id"], "Hi again", headers={}).status_code == 200
    finally:
        client.cookies.clear()
    assert reply(client, "c_nope", "Hi").status_code == 404


def test_reply_rejects_empty_and_too_long(client):
    cid = chat(client, MARKO, "hello")["case_id"]
    assert reply(client, cid, "").status_code == 422
    assert reply(client, cid, "   \n ").status_code == 422
    assert reply(client, cid, "x" * 2001).status_code == 422
    assert reply(client, cid, "x" * 2000).status_code == 200
    assert client.post(f"/api/cases/{cid}/reply", json={}, headers=CON).status_code == 422


def test_reply_is_stored_audited_and_visible_to_the_user(client):
    d = chat(client, MARKO, "I want a person to look at my billing")
    cid = d["case_id"]
    r = reply(client, cid, "  Hi Marko, I looked at your account myself.  ")
    assert r.status_code == 200, r.text
    out = r.json()
    m = out["message"]
    assert m["role"] == "team" and m["author"] == "Lumen team" and m["text"] == "Hi Marko, I looked at your account myself."
    assert out["status"] == "open" and out["fact_check"] == []
    detail = client.get(f"/api/cases/{cid}", headers=CON).json()
    assert detail["messages"][-1]["role"] == "team" and detail["messages"][-1]["meta"]["author"] == "Lumen team"
    assert detail["messages"][-1]["created_at"] == m["created_at"]
    assert any(a["event"] == "team_reply" for a in detail["audit"])
    assert not any(a["event"] == "case_resolved" for a in detail["audit"])
    # the subscriber's widget sees it (signed), and it is the latest word in that case
    got = team_msgs(client, MARKO).json()
    assert [x["text"] for x in got["messages"]] == [m["text"]]
    x = got["messages"][0]
    assert x["case_id"] == cid and x["author"] == "Lumen team" and x["awaiting"] is True and x["role"] == "team"
    assert got["last_id"] == m["id"]
    assert team_msgs(client, MARKO, after=got["last_id"]).json()["messages"] == []
    # nobody else sees it, and a bad signature is refused
    assert team_msgs(client, "lumen_ana").json()["messages"] == []
    assert team_msgs(client, MARKO, sig="").status_code == 401
    assert team_msgs(client, MARKO, sig=auth.sign("lumen_ana", SECRET)).status_code == 401
    # the user answers: the team message is no longer "awaiting"
    chat(client, MARKO, "thanks!", case_id=cid)
    assert team_msgs(client, MARKO).json()["messages"][0]["awaiting"] is False


def test_team_reply_is_not_sent_to_the_llm_or_rewritten(client):
    cid = chat(client, MARKO, "hello")["case_id"]
    text = "We'll refund you in full tomorrow, promise."   # the validator would block this from Case Desk; a person may
    out = reply(client, cid, text).json()
    assert out["message"]["text"] == text
    # the next AI turn's history only carries user/assistant turns
    d2 = chat(client, MARKO, "ok", case_id=cid)
    assert d2["reply_status"] == "ready"


def test_resolve_flag_and_reopen_on_new_user_message(client):
    cid = chat(client, MARKO, "I want to talk to a person")["case_id"]
    out = reply(client, cid, "Done, all sorted.", resolve=True).json()
    assert out["status"] == "resolved"
    detail = client.get(f"/api/cases/{cid}", headers=CON).json()
    assert detail["case"]["status"] == "resolved"
    events = [a["event"] for a in detail["audit"]]
    assert "team_reply" in events and "case_resolved" in events
    listed = {c["id"]: c for c in client.get("/api/cases", headers=CON).json()["cases"]}
    assert listed[cid]["status"] == "resolved"
    chat(client, MARKO, "actually one more thing", case_id=cid)
    assert client.get(f"/api/cases/{cid}", headers=CON).json()["case"]["status"] == "open"
    # replying without resolve leaves the status alone
    assert reply(client, cid, "Sure, go ahead.").json()["status"] == "open"


def test_fact_check_is_advisory(client):
    d = chat(client, MARKO, "when does my plan end?")
    cid, facts = d["case_id"], d["facts"]
    on_sheet = facts.get("expires_on") or facts.get("renews_on")
    assert on_sheet
    ok = reply(client, cid, f"Your access runs until {on_sheet}.").json()
    assert ok["fact_check"] == []
    warn = reply(client, cid, "I've added access until 4417-99-98, see https://evil.example.com").json()
    toks = {w["token"]: w for w in warn["fact_check"]}
    assert "4417-99-98" in toks and toks["4417-99-98"]["code"] == "unsupported_number"
    assert "isn't in the account facts" in toks["4417-99-98"]["message"]
    assert any(w["code"] == "unknown_url" for w in warn["fact_check"])
    assert warn["message"]["text"].startswith("I've added access")      # sent anyway
    # dry run: the same check without sending
    n = len(client.get(f"/api/cases/{cid}", headers=CON).json()["messages"])
    dry = client.post(f"/api/cases/{cid}/fact-check", json={"text": "until 12 Nov 3999"}, headers=CON).json()
    assert {w["token"] for w in dry["fact_check"]} >= {"3999"}
    assert len(client.get(f"/api/cases/{cid}", headers=CON).json()["messages"]) == n
    assert client.post(f"/api/cases/{cid}/fact-check", json={"text": "x"}).status_code == 401


def test_fact_check_unit():
    fields = {"expires_on": "2026-11-12", "price": "6.99 EUR"}
    assert team_fact_check("Your plan ends 12 Nov 2026 and costs 6,99 EUR.", fields) == []
    w = team_fact_check("It ends on 13 Nov.", fields)
    assert [x["token"] for x in w] == ["13"] and w[0]["message"] == "“13 Nov” isn't in the account facts."
    assert team_fact_check("hello", {}) == []


# ------------------------------------------------------------------ MCP tools (real seeded server, like test_mcp_server)
@pytest.fixture()
def seeded(monkeypatch, tmp_path):
    pytest.importorskip("mcp")   # `uv sync --extra mcp`; the API tests above run without it
    from casedesk import seed
    monkeypatch.setenv("CASEDESK_DEMO", "1")
    monkeypatch.setenv("CASEDESK_LLM", "none")
    monkeypatch.setenv("CASEDESK_NOW", "2026-11-04T00:12:04Z")
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "20")
    monkeypatch.setenv("CONSOLE_TOKEN", "tok")
    monkeypatch.delenv("APP_SIGNING_SECRET", raising=False)
    monkeypatch.delenv("ADAPTY_API_BASE", raising=False)
    deps.clear_forced()
    st = Store(tmp_path / "mcp.db")
    seed.seed(st)
    with TestClient(create_app(store=st)) as c:
        yield c, st
    deps.clear_forced()


def mcp_call(c, name, **args):
    import asyncio
    import json

    from mcp.shared.memory import create_connected_server_and_client_session

    from casedesk import mcp_server as M
    server = M.build_server(M.CaseDesk(url="http://testserver", token="tok", client=c))

    async def go():
        async with create_connected_server_and_client_session(server._mcp_server) as s:
            r = await s.call_tool(name, args)
            return r.isError, (r.structuredContent if r.structuredContent is not None
                               else json.loads(r.content[0].text) if not r.isError else r.content[0].text)
    return asyncio.run(go())


def test_mcp_reply_to_user_needs_confirm(seeded):
    c, st = seeded
    case = next(x for x in st.list_cases() if (x.get("facts") or {}))
    cid = case["id"]
    n = len(st.messages(cid))
    err, res = mcp_call(c, "reply_to_user", case_id=cid, text="Hi, it ends on 4417-01-01.")
    assert not err and res["sent"] is False and "confirm must be true" in res["summary"]
    assert any(w["token"] == "4417-01-01" for w in res["fact_check"]) and "Heads-up" in res["summary"]
    assert len(st.messages(cid)) == n                                   # nothing was sent
    err, res = mcp_call(c, "reply_to_user", case_id=cid, text="Hi, it ends on 4417-01-01.", confirm=True,
                        resolve=True)
    assert not err and res["sent"] is True and res["status"] == "resolved", res
    assert "Heads-up (sent anyway)" in res["summary"]
    last = st.messages(cid)[-1]
    assert last["role"] == "team" and last["text"] == "Hi, it ends on 4417-01-01."
    assert st.get_case(cid)["status"] == "resolved"
    err, _ = mcp_call(c, "reply_to_user", case_id=cid, text="   ", confirm=True)
    assert err


def test_mcp_resolve_case_needs_confirm(seeded):
    c, st = seeded
    cid = st.list_cases()[0]["id"]
    err, res = mcp_call(c, "resolve_case", case_id=cid)
    assert not err and res["done"] is False and st.get_case(cid)["status"] == "open"
    err, res = mcp_call(c, "resolve_case", case_id=cid, confirm=True)
    assert not err and res["done"] is True and st.get_case(cid)["status"] == "resolved"
    err, res = mcp_call(c, "resolve_case", case_id="c_doesnotexist", confirm=True)
    assert not err and res["done"] is False and res["http_status"] == 404
