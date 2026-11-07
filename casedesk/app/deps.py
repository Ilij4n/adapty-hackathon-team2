"""Resolve the real adapty / engine / ai modules, falling back to casedesk.app._stubs per module.

Resolution is re-tried on every call until the real module imports, so a running dev server picks up modules
as other builders land them. Env CASEDESK_STUBS=all (or a comma list of names below) pins pieces to the stubs. `status()` reports which pieces are real and which are stubs.
"""
from __future__ import annotations

import importlib
import logging
import os
from types import ModuleType

from casedesk.app import _stubs

log = logging.getLogger("casedesk.app")

_SPEC = {
    # name: (real module, required attribute, stub namespace)
    "adapty_client": ("casedesk.adapty.client", "AdaptyClient", _stubs.adapty_client),
    "adapty_seed": ("casedesk.adapty.seed_loader", "demo_users", _stubs.adapty_seed),
    "engine_state": ("casedesk.engine.state", "classify", _stubs.engine_state),
    "engine_facts": ("casedesk.engine.facts", "build", _stubs.engine_facts),
    "engine_policy": ("casedesk.engine.policy", "decide", _stubs.engine_policy),
    "ai_intent": ("casedesk.ai.intent", "extract", _stubs.ai_intent),
    "ai_compose": ("casedesk.ai.compose", "reply", _stubs.ai_compose),
}
_resolved: dict[str, ModuleType] = {}
_forced_stubs: set[str] = set()


def force_stubs(*names: str) -> None:
    """Tests: pin the given pieces (or all, if none given) to the stubs."""
    _forced_stubs.update(names or _SPEC.keys())
    for n in names or _SPEC.keys():
        _resolved.pop(n, None)


def clear_forced() -> None:
    _forced_stubs.clear()
    _resolved.clear()


def get(name: str):
    if name in _resolved:
        return _resolved[name]
    modname, attr, stub = _SPEC[name]
    env = {x.strip() for x in os.environ.get("CASEDESK_STUBS", "").split(",") if x.strip()}
    if name in _forced_stubs or "all" in env or name in env:
        return stub
    try:
        mod = importlib.import_module(modname)
        if not hasattr(mod, attr):
            raise ImportError(f"{modname} has no {attr}")
    except Exception as e:  # noqa: BLE001 — anything wrong in a half-written module means "not landed yet"
        log.debug("using stub for %s: %s", name, e)
        return stub
    _resolved[name] = mod
    log.info("using real %s", modname)
    return mod


def status() -> dict[str, str]:
    return {n: ("stub" if get(n) is _SPEC[n][2] else "real") for n in _SPEC}
