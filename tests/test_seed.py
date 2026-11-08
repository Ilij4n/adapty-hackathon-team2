"""Seeded demo cases (casedesk.seed): real engine, scripted text, no LLM, idempotent, live demo users untouched."""
from __future__ import annotations

import json
import shutil
from datetime import timedelta
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from casedesk import seed
from casedesk.adapty import mock_server
from casedesk.adapty.client import AdaptyClient, map_profile
from casedesk.adapty.seed_loader import load_raw
from casedesk.ai import compose, intent as intent_mod, llm, validate
from casedesk.ai.intent import Intent
from casedesk.app import auth, deps
from casedesk.app.main import create_app
from casedesk.app.store import Store
from casedesk.engine import facts as F
from casedesk.engine import policy as P
from casedesk.engine.state import classify

NOW = "2026-11-04T00:12:04+00:00"
CON = {"X-Console-Token": "tok"}
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def bundle():
    return load_raw()


@pytest.fixture()
def env(monkeypatch):
    monkeypatch.setenv("CASEDESK_DEMO", "1")
    monkeypatch.setenv("CASEDESK_LLM", "none")
    monkeypatch.setenv("CASEDESK_NOW", NOW)
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "20")
    monkeypatch.setenv("CASEDESK_CHAT_RATE", "50")
    monkeypatch.setenv("CONSOLE_TOKEN", "tok")
    monkeypatch.delenv("APP_SIGNING_SECRET", raising=False)
    monkeypatch.delenv("ADAPTY_API_BASE", raising=False)
    deps.clear_forced()


ENV = {"CASEDESK_DEMO": "1", "CASEDESK_LLM": "none", "CASEDESK_NOW": NOW, "CASEDESK_INLINE_WAIT": "20",
       "CASEDESK_CHAT_RATE": "50", "CONSOLE_TOKEN": "tok"}


@pytest.fixture()
def no_llm(monkeypatch):
    return _block_llm(monkeypatch)


def _block_llm(monkeypatch):
    """Every LLM entry point raises: the seeder must never reach one."""
    calls = []

    def boom(*a, **k):
        calls.append(a)
        raise AssertionError("the seeder called an LLM entry point")

    monkeypatch.setattr(llm, "get_llm", boom)
    for cls in (llm.AnthropicLLM, llm.ClaudeCLILLM, llm.FakeLLM):
        monkeypatch.setattr(cls, "complete", boom)
    monkeypatch.setattr(intent_mod, "get_llm", boom)
    monkeypatch.setattr(intent_mod, "extract", boom)
    monkeypatch.setattr(intent_mod, "_intent_from_llm", boom)
    monkeypatch.setattr(compose, "get_llm", boom)
    monkeypatch.setattr(compose, "reply", boom)
    return calls


@pytest.fixture(scope="module")
def seeded_db(bundle, tmp_path_factory):
    """Seed once per module (with every LLM entry point blocked); tests get their own copy of the database."""
    path = tmp_path_factory.mktemp("seed") / "seed.db"
    with pytest.MonkeyPatch.context() as mp:
        for k, v in ENV.items():
            mp.setenv(k, v)
        calls = _block_llm(mp)
        res = seed.seed(Store(path), bundle=bundle)
        assert not calls
    return path, res


@pytest.fixture()
def seeded(env, seeded_db, tmp_path):
    src, res = seeded_db
    dst = tmp_path / "seed.db"
    shutil.copyfile(src, dst)
    return Store(dst), res


def _turn_times(t: seed.Ticket):
    opened = seed._parse_dt(NOW) - timedelta(hours=t.hours_before)
    return [opened + timedelta(minutes=x.after_min) for x in t.turns]


def _fresh(bundle, t: seed.Ticket, turn: seed.Turn, at):
    """An independent pipeline computation: raw profile -> map_profile -> classify -> facts -> policy."""
    profile = map_profile(bundle["profiles"][t.cuid], at, bundle["extras"].get(t.cuid))
    state = classify(profile, at)
    facts = F.build(profile, state, at, history=[])
    it = Intent(type=turn.intent, language=t.language, claims=dict(turn.claims),
                injection_suspected=turn.injection)
    return state, facts, P.decide(state, it, facts, [])


def test_seeds_all_tickets_without_fallbacks_or_llm(seeded):
    st, res = seeded
    assert len(res.seeded) == len(seed.TICKETS) >= 14 and not res.skipped
    assert res.fallbacks == []          # every scripted reply passed the real validator
    assert len(st.list_cases()) == len(seed.TICKETS)


def test_every_case_equals_a_fresh_pipeline_computation(seeded, bundle):
    st, _ = seeded
    for t in seed.TICKETS:
        c = st.get_case(seed.case_id_for(t.key))
        replies = [m for m in st.messages(c["id"]) if m["role"] == "assistant"]
        assert len(replies) == len(t.turns)
        for turn, at, m in zip(t.turns, _turn_times(t), replies):
            state, facts, actions = _fresh(bundle, t, turn, at)
            acts = [a.model_dump(mode="json") for a in actions]
            assert m["meta"]["actions"] == acts, t.key
            assert validate.check(m["text"], facts, actions, state) == [], (t.key, m["text"])
            assert m["meta"]["used_fallback"] is False and m["meta"]["source"] == "seed"
        # the case row carries the latest turn, as the live app stores it
        assert c["state"]["code"] == state.code and c["state"]["evidence"] == state.evidence, t.key
        assert c["facts"] == facts.fields, t.key
        assert c["actions"] == acts, t.key
        assert c["intent"]["type"] == t.turns[-1].intent and c["language"] == t.language


def test_times_are_in_the_three_days_before_the_demo_clock(seeded):
    st, _ = seeded
    now = seed._parse_dt(NOW)
    for c in st.list_cases():
        created, updated = seed._parse_dt(c["created_at"]), seed._parse_dt(c["updated_at"])
        assert now - timedelta(days=3) <= created <= updated < now
    hours = {seed._parse_dt(c["created_at"]).hour for c in st.list_cases()}
    assert hours & {0, 1, 2, 3, 4}        # some arrive at night


def test_mix_covers_the_scenarios(seeded):
    st, _ = seeded
    cases = st.list_cases()
    langs = {c["language"] for c in cases}
    assert {"sr", "sr-Cyrl", "de", "es", "fr", "pt", "it", "en"} <= langs
    states = {c["state"]["code"] for c in cases}
    assert {"CANCELLED_PAID_UP", "EXPIRED_BILLING_ERROR", "ACTIVE_RENEWING", "TRIAL_ACTIVE", "TRIAL_CANCELLED",
            "LIFETIME", "EXPIRED_CANCELLED"} <= states
    kinds = {a["kind"] for c in cases for m in st.messages(c["id"]) for a in (m["meta"].get("actions") or [])}
    assert {"REFUND_PATH_APPLE", "REFUND_PATH_GOOGLE", "CANCEL_STEPS", "RESTORE_PURCHASES_STEPS",
            "UPDATE_PAYMENT_METHOD", "PROPOSE_GRANT", "ESCALATE_TO_HUMAN"} <= kinds
    trial = st.get_case(seed.case_id_for("trial-when-charged"))
    assert "cancel_before" in trial["facts"]
    never = st.get_case(seed.case_id_for("trial-never-charged"))
    assert never["facts"]["ever_charged"] == "no"
    assert never["actions"][0]["params"]["reason"] == "nothing_charged"
    assert any(len([m for m in st.messages(c["id"]) if m["role"] == "user"]) > 1 for c in cases)   # follow-ups


def test_injection_is_flagged_escalated_and_changes_nothing(seeded, bundle):
    st, _ = seeded
    t = next(t for t in seed.TICKETS if t.turns[0].injection)
    c = st.get_case(seed.case_id_for(t.key))
    assert c["intent"]["injection_suspected"] is True
    assert [a["kind"] for a in c["actions"]] == ["ESCALATE_TO_HUMAN"]
    # the same intent without the injection flag gets exactly the same actions
    at = _turn_times(t)[0]
    profile = map_profile(bundle["profiles"][t.cuid], at, bundle["extras"].get(t.cuid))
    state = classify(profile, at)
    facts = F.build(profile, state, at)
    plain = P.decide(state, Intent(type=t.turns[0].intent, claims=t.turns[0].claims), facts, [])
    assert c["actions"] == [a.model_dump(mode="json") for a in plain]


def test_approvals_only_where_policy_proposed_one(seeded):
    st, _ = seeded
    apprs = st.list_approvals()
    proposed = {c["id"] for c in st.list_cases() if any(a["kind"] == "PROPOSE_GRANT" for a in c["actions"])}
    assert {a["case_id"] for a in apprs} == proposed and len(apprs) == 1
    a = apprs[0]
    assert a["status"] == "denied"      # historical; an approval would need a real Adapty grant
    assert not st.list_approvals("pending")


def test_live_demo_users_are_never_seeded(seeded):
    st, _ = seeded
    demo = {u["customer_user_id"] for u in json.loads((ROOT / "data" / "demo_users.json").read_text())["users"]}
    assert seed.RESERVED <= demo
    assert not ({t.cuid for t in seed.TICKETS} & demo)
    for cuid in seed.RESERVED:
        assert st.user_cases(cuid) == [] and st.user_approvals(cuid) == []


def test_reserved_user_is_refused(env, no_llm, bundle, tmp_path, monkeypatch):
    bad = seed.Ticket("ava", "lumen_demo_00239", "Ava", 5, "en-US", "en",
                      [seed.Turn(0, "I paid but have no premium", "PAID_NO_ACCESS", reply=lambda f: "x")])
    monkeypatch.setattr(seed, "TICKETS", [bad])
    with pytest.raises(ValueError, match="reserved"):
        seed.seed(Store(tmp_path / "x.db"), bundle=bundle)


def test_idempotent_and_reset(seeded, no_llm, bundle):
    st, _ = seeded

    def counts():
        return [st._all(f"SELECT COUNT(*) n FROM {t}")[0]["n"] for t in ("cases", "messages", "approvals", "audit")]

    before = counts()
    res = seed.seed(st, bundle=bundle)
    assert res.seeded == [] and len(res.skipped) == len(seed.TICKETS)
    assert counts() == before
    assert seed.reset(st) == len(seed.TICKETS)
    assert counts() == [0, 0, 0, 0]
    seed.seed(st, bundle=bundle)
    assert counts() == before


def test_reset_keeps_live_cases(seeded):
    st, _ = seeded
    live = st.create_case("lumen_demo_00239", {})
    seed.reset(st)
    assert st.get_case(live) is not None


def test_count_limits(env, no_llm, bundle, tmp_path):
    st = Store(tmp_path / "c.db")
    assert len(seed.seed(st, count=3, bundle=bundle).seeded) == 3
    assert len(st.list_cases()) == 3


def test_rejected_reply_falls_back_to_template(env, no_llm, bundle, tmp_path, monkeypatch):
    t = next(t for t in seed.TICKETS if t.key == "refund-apple")
    bad = seed.Ticket(t.key, t.cuid, t.name, t.hours_before, t.locale, t.language, [seed.Turn(
        0, t.turns[0].message, t.turns[0].intent, t.turns[0].claims,
        reply=lambda f: f"We will refund you {f.p('price')} within 5 days.")])
    monkeypatch.setattr(seed, "TICKETS", [bad])
    st = Store(tmp_path / "f.db")
    res = seed.seed(st, bundle=bundle)
    assert res.fallbacks and res.fallbacks[0][0] == "refund-apple"
    m = [m for m in st.messages(seed.case_id_for(t.key)) if m["role"] == "assistant"][0]
    assert m["meta"]["used_fallback"] is True and m["meta"]["source"] == "template"
    assert "refund you" not in m["text"]


def test_missing_fact_falls_back_to_template(env, no_llm, bundle, tmp_path, monkeypatch):
    t = next(t for t in seed.TICKETS if t.key == "lifetime-renewal")
    bad = seed.Ticket(t.key, t.cuid, t.name, t.hours_before, t.locale, t.language, [seed.Turn(
        0, t.turns[0].message, t.turns[0].intent, reply=lambda f: f"Renews on {f.d('renews_on')}.")])
    monkeypatch.setattr(seed, "TICKETS", [bad])
    res = seed.seed(Store(tmp_path / "m.db"), bundle=bundle)
    assert res.fallbacks[0][2] == ["missing_fact:renews_on"]


def test_console_api_lists_seeded_cases_and_ava_still_gets_her_grant(seeded):
    st, _ = seeded      # the LLM entry points are not blocked here: Ava's live chat runs the real app pipeline
    adapty = AdaptyClient(base_url="http://mock", secret_key="k",
                          transport=httpx.ASGITransport(app=mock_server.create_app()))
    app = create_app(store=st, adapty=adapty)
    with TestClient(app) as c:
        cases = c.get("/api/cases", headers=CON).json()["cases"]
        assert len(cases) == len(seed.TICKETS)
        assert [x["updated_at"] for x in cases] == sorted((x["updated_at"] for x in cases), reverse=True)
        assert all(x["display_name"] == seed.display_name(x["customer_user_id"]) for x in cases)
        assert sum(x["escalated"] for x in cases) == 3 and sum(x["privacy"] for x in cases) == 1
        apprs = c.get("/api/approvals", headers=CON).json()["approvals"]
        assert [a["status"] for a in apprs] == ["denied"]
        detail = c.get(f"/api/cases/{apprs[0]['case_id']}", headers=CON).json()
        assert [m["role"] for m in detail["messages"]] == ["user", "assistant", "system"]
        assert any(e["event"] == "seeded" for e in detail["audit"])
        # live demo on top of the seeded data: Ava's grant request and approval still work
        ava = "lumen_demo_00239"
        r = c.post("/api/chat", json={"customer_user_id": ava, "signature": auth.sign(ava),
                                      "message": "I paid but I have no premium"}).json()
        assert r["pending_approval"] is True and r["approval_id"]
        ok = c.post(f"/api/approvals/{r['approval_id']}/approve", headers=CON)
        assert ok.status_code == 200, ok.text
        assert ok.json()["approval"]["status"] == "approved"
        # the new live case sorts above every seeded one
        assert c.get("/api/cases", headers=CON).json()["cases"][0]["customer_user_id"] == ava


def test_escalated_cases_carry_a_scripted_suggested_reply(seeded):
    """Every escalated seeded case stores a draft for the person (scripted, validated, never an LLM, never sent);
    the others store none."""
    st, _ = seeded
    escalated = 0
    for t in seed.TICKETS:
        c = st.get_case(seed.case_id_for(t.key))
        esc = any(a["kind"] == "ESCALATE_TO_HUMAN" for a in c["actions"]) or c["intent"]["injection_suspected"] \
            or c["intent"]["type"] == "PRIVACY_REQUEST"
        sug = c.get("suggested_reply")
        if not esc:
            assert not sug, t.key
            continue
        escalated += 1
        assert sug["source"] == "seed" and sug["violations"] == [] and sug["sent"] is False, t.key
        assert sug["text"] and sug["text"] not in [m["text"] for m in st.messages(c["id"])]
    assert escalated >= 3
