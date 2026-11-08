from casedesk.adapty import client as C


def test_prefix_maps_demo_ids_on_the_wire_only(monkeypatch):
    monkeypatch.delenv("CASEDESK_ADAPTY_CUID_PREFIX", raising=False)
    assert C.adapty_cuid("lumen_demo_00239") == "lumen_demo_00239"
    monkeypatch.setenv("CASEDESK_ADAPTY_CUID_PREFIX", "lumen_123456_")
    assert C.adapty_cuid("lumen_demo_00239") == "lumen_123456_00239"
    assert C.adapty_cuid("someone_else") == "someone_else"
    h = C.AdaptyClient(base_url="https://example.invalid", secret_key="k")._headers("lumen_demo_00009")
    assert h["adapty-customer-user-id"] == "lumen_123456_00009"
