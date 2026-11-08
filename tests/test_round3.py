"""Head-to-head fixes (2026-11-08): free-access asks, unrecognised charges, restore advice, follow-up offers and the
suggested replies for people on escalated cases."""
from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from casedesk.ai import compose, suggest, templates, validate
from casedesk.ai.intent import Intent, rules_extract
from casedesk.ai.llm import FakeLLM, LLMError
from casedesk.app import _stubs, auth, deps
from casedesk.app.main import create_app
from casedesk.app.store import Store
from casedesk.engine import policy
from test_ai import case

LANGS = templates.TEMPLATE_LANGS + ("sr-Cyrl",)


def kinds(acts):
    return [a.kind for a in acts]


# ------------------------------------------------------------------------------------------------------------ intents
@pytest.mark.parametrize("msg, lang", [
    ("Give me premium for free", "en"), ("Can I get it free?", "en"), ("free access please", "en"),
    ("Dajte mi premijum besplatno", "sr"), ("Дайте премиум бесплатно", "ru"),
    ("Quiero premium gratis, por favor", None), ("Kann ich Premium kostenlos haben?", "de"),
])
def test_free_access_is_its_own_intent(msg, lang):
    i = rules_extract(msg)
    assert i.type == "FREE_ACCESS_REQUEST"
    assert i.claims.get("wants_free_access") is True
    assert not i.injection_suspected
    if lang:
        assert i.language == lang


@pytest.mark.parametrize("msg, lang", [
    ("Почему с меня списали деньги? Я ничего не покупал", "ru"),
    ("Why was I charged? I never bought anything", "en"),
    ("Zašto ste mi naplatili? Ništa nisam kupio", "sr"),
    ("¿Por qué me cobraron? No compré nada", "es"),
    ("Warum wurde mir Geld abgebucht? Ich habe nichts gekauft", "de"),
    ("Por que fui cobrado? Não comprei nada", "pt"),
])
def test_bought_nothing_is_unrecognised_charge(msg, lang):
    i = rules_extract(msg)
    assert i.type == "UNRECOGNISED_CHARGE", msg
    assert i.language == lang
    assert i.claims.get("says_never_bought") is True and "says_paid" not in i.claims


@pytest.mark.parametrize("msg, itype", [
    ("Can't you just give me a free month?", "DISCOUNT_REQUEST"),
    ("I cancelled and you still charged me", "CHARGED_AFTER_CANCEL"),
    ("I paid but I have no premium", "PAID_NO_ACCESS"),
])
def test_neighbouring_intents_unchanged(msg, itype):
    assert rules_extract(msg).type == itype


def test_restore_claims_split_device_change_from_tried_restore():
    tried = rules_extract("My filters are locked, I tried Restore and reinstalling, still nothing")
    assert tried.type == "RESTORE_NEW_DEVICE"
    assert tried.claims.get("says_tried_restore") is True and "says_new_device" not in tried.claims
    new = rules_extract("New phone, lost premium")
    assert new.claims.get("says_new_device") is True and "says_tried_restore" not in new.claims


def test_intent_prompt_names_new_types():
    from casedesk.ai.intent import INTENT_SYSTEM
    assert "FREE_ACCESS_REQUEST" in INTENT_SYSTEM and "UNRECOGNISED_CHARGE" in INTENT_SYSTEM
    assert "says_tried_restore" in INTENT_SYSTEM


# ------------------------------------------------------------------------------------------------------------- policy
def test_free_access_never_grants_a_never_paid_user():
    st, fs, acts = case("EXPIRED_BILLING_ERROR", "play_store", "trial_never_converted", "FREE_ACCESS_REQUEST")
    assert "PROPOSE_GRANT" not in kinds(acts) and "ESCALATE_TO_HUMAN" not in kinds(acts)
    assert kinds(acts)[0] == "EXPLAIN_STATUS"


def test_free_access_grant_only_where_already_eligible():
    st, fs, acts = case("EXPIRED_BILLING_ERROR", "app_store", None, "FREE_ACCESS_REQUEST")
    assert "PROPOSE_GRANT" in kinds(acts)
    for code in ("ACTIVE_RENEWING", "EXPIRED_CANCELLED", "NO_PURCHASE", "REFUNDED"):
        assert "PROPOSE_GRANT" not in kinds(case(code, "app_store", None, "FREE_ACCESS_REQUEST")[2])


def test_free_access_on_a_storeless_account_never_escalates():
    st, fs, _ = case("NO_PURCHASE", "app_store", None, "OTHER")
    fs.fields.pop("store", None)
    acts = policy.decide(st, "FREE_ACCESS_REQUEST", fs)
    assert "ESCALATE_TO_HUMAN" not in kinds(acts)


def test_unrecognised_charge_actions():
    assert kinds(case("ACTIVE_RENEWING", "app_store", None, "UNRECOGNISED_CHARGE")[2])[:2] == [
        "EXPLAIN_STATUS", "REFUND_PATH_APPLE"]
    assert "REFUND_PATH_GOOGLE" in kinds(case("CANCELLED_PAID_UP", "play_store", None, "UNRECOGNISED_CHARGE")[2])
    for code in ("TRIAL_ACTIVE", "NO_PURCHASE", "FAMILY_SHARED"):
        acts = case(code, "app_store", None, "UNRECOGNISED_CHARGE")[2]
        assert acts[0].params.get("claim_contradicted") is True
        assert not any(k.startswith("REFUND_PATH") for k in kinds(acts))


# ---------------------------------------------------------------------------------------------------------- templates
@pytest.mark.parametrize("lang", LANGS)
def test_free_access_template_is_on_topic(lang):
    st, fs, acts = case("EXPIRED_BILLING_ERROR", "play_store", "trial_never_converted", "FREE_ACCESS_REQUEST")
    text = templates.render(st, acts, fs, lang, intent_type="FREE_ACCESS_REQUEST")
    discount_lead = templates.TEMPLATES[templates.template_lang(lang)[0]]["intent"]["DISCOUNT_REQUEST"][0]
    assert discount_lead[:25] not in text
    assert validate.check(text, fs, acts, st) == []


@pytest.mark.parametrize("lang", LANGS)
def test_unrecognised_charge_template_explains_the_charges(lang):
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "UNRECOGNISED_CHARGE")
    text = templates.render(st, acts, fs, lang, intent_type="UNRECOGNISED_CHARGE")
    f = templates.localize_fields(fs.fields, templates.template_lang(lang)[0])
    assert f["last_charged_on"] in text and f["price"] in text and fs.fields["refund_url"] in text
    not_cancelled = templates.TEMPLATES[templates.template_lang(lang)[0]]["contra"]["not_cancelled"][0]
    assert templates.sr_lat_to_cyr(not_cancelled[:20]) not in text and not_cancelled[:20] not in text
    assert re.search(r"Apple[- ]?ID|ID Apple", text) and validate.check(text, fs, acts, st) == []


def test_unrecognised_charge_never_charged_says_so():
    st, fs, acts = case("TRIAL_ACTIVE", "app_store", None, "UNRECOGNISED_CHARGE")
    text = templates.render(st, acts, fs, "en", intent_type="UNRECOGNISED_CHARGE")
    assert "Nothing has been charged" in text and "reportaproblem" not in text


@pytest.mark.parametrize("lang", LANGS)
def test_restore_says_new_device_only_when_mentioned(lang):
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "RESTORE_NEW_DEVICE")
    T = templates.TEMPLATES[templates.template_lang(lang)[0]]["action"]
    plain = templates.render(st, acts, fs, lang, intent_type="RESTORE_NEW_DEVICE")
    newdev = templates.render(st, acts, fs, lang, intent_type="RESTORE_NEW_DEVICE", claims={"says_new_device": True})
    cyr = lang == "sr-Cyrl"
    nd = T["RESTORE_PURCHASES_STEPS:app_store:new_device"][0][:18]
    nd = templates.sr_lat_to_cyr(nd) if cyr else nd
    assert nd not in plain and nd in newdev
    assert not re.search(r"new (device|phone)", plain, re.I)


@pytest.mark.parametrize("lang", LANGS)
@pytest.mark.parametrize("store", ["app_store", "play_store"])
def test_tried_restore_gets_the_next_step(lang, store):
    st, fs, acts = case("ACTIVE_RENEWING", store, None, "RESTORE_NEW_DEVICE")
    text = templates.render(st, acts, fs, lang, intent_type="RESTORE_NEW_DEVICE",
                            claims={"says_tried_restore": True})
    T = templates.TEMPLATES[templates.template_lang(lang)[0]]["action"]
    plain_restore = T[f"RESTORE_PURCHASES_STEPS:{store}"][0][:25]
    assert plain_restore not in text and templates.sr_lat_to_cyr(plain_restore) not in text
    assert fs.fields["refund_url"] in text      # the store's purchase history
    assert validate.check(text, fs, acts, st) == []


@pytest.mark.parametrize("lang", LANGS)
def test_follow_up_offer_on_normal_replies_only(lang):
    tl = templates.template_lang(lang)[0]
    offers = [templates.TEMPLATES[tl]["extra"][k][0] for k in ("follow_up", "follow_up_steps")]
    offers += [templates.sr_lat_to_cyr(o) for o in offers]
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "STATUS_QUESTION")
    text = templates.render(st, acts, fs, lang, intent_type="STATUS_QUESTION")
    assert any(text.endswith(o) for o in offers) and validate.check(text, fs, acts, st) == []
    inj = templates.render(st, acts, fs, lang, intent_type="STATUS_QUESTION", injection=True)
    assert not any(o in inj for o in offers)
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "HUMAN_REQUEST")
    assert not any(o in templates.render(st, acts, fs, lang, intent_type="HUMAN_REQUEST") for o in offers)
    st, fs, acts = case("NO_PURCHASE", "app_store", None, "REFUND_REQUEST")   # escalated (explain human)
    assert "ESCALATE_TO_HUMAN" in kinds(acts)
    assert not any(o in templates.render(st, acts, fs, lang, intent_type="REFUND_REQUEST") for o in offers)


def test_every_language_has_every_new_key():
    keys = templates.all_keys()
    for lang in templates.TEMPLATE_LANGS:
        for sec in ("intent", "extra", "action", "draft"):
            assert sorted(templates.TEMPLATES[lang][sec]) == keys[sec], (lang, sec)


def test_writer_prompt_covers_the_fixes():
    p = compose.COMPOSE_SYSTEM
    assert "FREE_ACCESS_REQUEST" in p and "UNRECOGNISED_CHARGE" in p and "says_tried_restore" in p
    assert "ONLY if" in p and "follow-up offer" in p


def test_case_file_turns_off_follow_up_for_escalations_and_injection():
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "HUMAN_REQUEST")
    cf = compose.case_file(st, fs, acts, "en", Intent(type="HUMAN_REQUEST"))
    assert cf["request"]["no_follow_up"] is True
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "STATUS_QUESTION")
    assert "no_follow_up" not in compose.case_file(st, fs, acts, "en", Intent(type="STATUS_QUESTION"))["request"]
    cf = compose.case_file(st, fs, acts, "en", Intent(type="STATUS_QUESTION", injection_suspected=True))
    assert cf["request"]["no_follow_up"] is True


# ---------------------------------------------------------------------------------------------- suggested replies
def test_needs_suggestion():
    _, _, human = case("ACTIVE_RENEWING", "app_store", None, "HUMAN_REQUEST")
    _, _, status = case("ACTIVE_RENEWING", "app_store", None, "STATUS_QUESTION")
    assert suggest.needs_suggestion(Intent(type="HUMAN_REQUEST"), human)
    assert suggest.needs_suggestion(Intent(type="PRIVACY_REQUEST"), [])
    assert suggest.needs_suggestion(Intent(type="STATUS_QUESTION", injection_suspected=True), status)
    assert not suggest.needs_suggestion(Intent(type="STATUS_QUESTION"), status)


@pytest.mark.parametrize("lang", LANGS)
@pytest.mark.parametrize("itype, inj", [("HUMAN_REQUEST", False), ("PRIVACY_REQUEST", False), ("HUMAN_REQUEST", True)])
def test_template_draft_passes_the_validator(lang, itype, inj):
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, itype)
    rep = suggest.suggested_reply(Intent(type=itype, language=lang, injection_suspected=inj), st, fs, acts, lang,
                                  llm=None)
    assert rep.source == "template" and rep.text
    assert suggest._draft_violations(rep.text, fs, templates.draft_actions(acts, itype), st) == []
    if itype == "HUMAN_REQUEST":   # the person answers the question: the status is in the draft
        assert templates.localize_fields(fs.fields, templates.template_lang(lang)[0])["renews_on"] in rep.text


def test_llm_draft_is_validated_with_retry_and_fallback():
    st, fs, acts = case("ACTIVE_RENEWING", "app_store", None, "HUMAN_REQUEST")
    intent = Intent(type="HUMAN_REQUEST", language="en")
    good = (f"Hi, this is the Lumen support team. Your {fs.fields['product_name']} is active and renews on "
            f"{fs.fields['renews_on']}. If anything is unclear, just reply here.")
    llm = FakeLLM([good])
    rep = suggest.suggested_reply(intent, st, fs, acts, "en", llm=llm)
    assert rep.source == "llm" and rep.text == good
    assert "user_message" not in llm.calls[0]["user"] and "ESCALATE_TO_HUMAN" not in llm.calls[0]["user"]
    bad = "We will refund you 99.99 EUR right away."
    rep = suggest.suggested_reply(intent, st, fs, acts, "en", llm=FakeLLM([bad, good]))
    assert rep.source == "llm_retry" and rep.text == good
    rep = suggest.suggested_reply(intent, st, fs, acts, "en", llm=FakeLLM([bad]))
    assert rep.used_fallback and rep.source == "template" and "refund you" not in rep.text
    rep = suggest.suggested_reply(intent, st, fs, acts, "en", llm=FakeLLM([LLMError("down")]))
    assert rep.used_fallback and rep.text


# ------------------------------------------------------------------------------------------------------- app + seed
SECRET, TOKEN = "test-signing-secret", "test-console-token"


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_SIGNING_SECRET", SECRET)
    monkeypatch.setenv("CONSOLE_TOKEN", TOKEN)
    monkeypatch.setenv("CASEDESK_LLM", "none")
    monkeypatch.setenv("CASEDESK_INLINE_WAIT", "10")
    monkeypatch.delenv("CASEDESK_DEMO", raising=False)
    _stubs.reset()   # stub Adapty profiles, real engine and AI modules
    app = create_app(store=Store(tmp_path / "t.db"), adapty=_stubs.AdaptyClient())
    with TestClient(app) as c:
        yield c


def _chat(c, cuid, message):
    return c.post("/api/chat", json={"customer_user_id": cuid, "signature": auth.sign(cuid, SECRET),
                                     "message": message, "locale": "en-US"}).json()


def test_escalated_case_stores_a_suggested_reply_not_sent(client):
    d = _chat(client, "lumen_marko", "I want to talk to a real person, not a bot")
    detail = client.get(f"/api/cases/{d['case_id']}", headers={"X-Console-Token": TOKEN}).json()
    assert detail["flags"]["escalated"]
    sug = detail["case"]["suggested_reply"]
    assert sug["text"] and sug["sent"] is False and sug["language"] == "en"
    assistant = [m["text"] for m in detail["messages"] if m["role"] == "assistant"]
    assert sug["text"] not in assistant and d["reply"] != sug["text"]


def test_plain_case_has_no_suggested_reply(client):
    d = _chat(client, "lumen_marko", "When does my subscription end?")
    detail = client.get(f"/api/cases/{d['case_id']}", headers={"X-Console-Token": TOKEN}).json()
    assert not detail["case"].get("suggested_reply")


def test_store_adds_the_column_to_an_old_database(tmp_path):
    import sqlite3
    db = tmp_path / "old.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE cases (id TEXT PRIMARY KEY, customer_user_id TEXT NOT NULL, created_at TEXT NOT NULL, "
                "updated_at TEXT NOT NULL, language TEXT, intent TEXT, state TEXT, facts TEXT, actions TEXT, "
                "sale_context TEXT, validator TEXT)")
    con.commit()
    con.close()
    st = Store(db)
    cid = st.create_case("u1", {})
    st.update_case(cid, suggested_reply={"text": "hi", "sent": False})
    assert st.get_case(cid)["suggested_reply"] == {"text": "hi", "sent": False}
