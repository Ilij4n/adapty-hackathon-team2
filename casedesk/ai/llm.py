"""LLM backends for Case Desk.

Protocol: ``complete(system, user, json_mode=False, model=None) -> str``.

Backends
- ``ClaudeCLILLM``  — headless Claude Code (``claude -p``) on a machine with a logged-in subscription.
                      This is the primary real backend for the demo.
- ``AnthropicLLM``  — official ``anthropic`` SDK with ANTHROPIC_API_KEY.
- ``FakeLLM``       — deterministic, scripted; used by tests.

``get_llm()`` picks one from env ``CASEDESK_LLM`` ∈ {claude-cli, anthropic, fake, none} (unset = none). ``none``
returns ``None`` and the pipeline runs on rules + templates only.

Env
- CASEDESK_MODEL         compose model (default ``claude-sonnet-5-5``)
- CASEDESK_INTENT_MODEL  intent model (default ``claude-haiku-5-5``)
- CASEDESK_LLM_TIMEOUT   seconds per call (default 45)
- CASEDESK_CLAUDE_BIN    path to the ``claude`` executable (default: ``shutil.which('claude')``)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from typing import Callable, Protocol, runtime_checkable

DEFAULT_MODEL = "claude-sonnet-5-5"
DEFAULT_INTENT_MODEL = "claude-haiku-5-5"
DEFAULT_TIMEOUT = 45.0

# Tools the CLI must never use: Case Desk only wants text back.
CLI_DISALLOWED_TOOLS = [
    "Bash", "Edit", "Write", "Read", "Glob", "Grep", "WebFetch", "WebSearch", "NotebookEdit",
    "Task", "Agent", "TodoWrite", "MultiEdit", "LS",
]
# Short, single-line system prompt for the CLI. The real instructions travel through stdin, because on Windows
# `claude` is a .cmd shim and cmd.exe mangles long / multi-line arguments.
CLI_SYSTEM_PROMPT = (
    "You are a text-transformation function inside a customer-support backend. You never use tools, never browse, "
    "never read or write files. Follow the INSTRUCTIONS section of the input exactly and output only what it asks for."
)


class LLMError(RuntimeError):
    """Any backend failure (timeout, auth, bad envelope). Callers fall back to rules/templates."""


@runtime_checkable
class LLM(Protocol):
    name: str

    def complete(self, system: str, user: str, json_mode: bool = False, model: str | None = None) -> str: ...


def compose_model() -> str:
    return os.environ.get("CASEDESK_MODEL") or DEFAULT_MODEL


def intent_model() -> str:
    return os.environ.get("CASEDESK_INTENT_MODEL") or DEFAULT_INTENT_MODEL


def llm_timeout() -> float:
    try:
        return float(os.environ.get("CASEDESK_LLM_TIMEOUT") or DEFAULT_TIMEOUT)
    except ValueError:
        return DEFAULT_TIMEOUT


JSON_SUFFIX = (
    "\n\nOutput format: a single JSON object and nothing else — no prose before or after it, no markdown code fences."
)


# --------------------------------------------------------------------------------------------------------------------
# Anthropic SDK
# --------------------------------------------------------------------------------------------------------------------
class AnthropicLLM:
    name = "anthropic"

    def __init__(self, model: str | None = None, timeout: float | None = None, max_tokens: int = 700):
        try:
            import anthropic  # noqa: F401  (optional dependency)
        except ImportError as e:  # pragma: no cover - depends on env
            raise LLMError("anthropic package not installed (pip install anthropic)") from e
        import anthropic

        self.model = model
        self.timeout = timeout or llm_timeout()
        self.max_tokens = max_tokens
        self._client = anthropic.Anthropic(timeout=self.timeout, max_retries=1)

    def complete(self, system: str, user: str, json_mode: bool = False, model: str | None = None) -> str:
        import anthropic

        sys_prompt = system + (JSON_SUFFIX if json_mode else "")
        try:
            msg = self._client.messages.create(
                model=model or self.model or compose_model(),
                max_tokens=self.max_tokens,
                system=sys_prompt,
                messages=[{"role": "user", "content": user}],
            )
        except anthropic.APIError as e:
            raise LLMError(f"anthropic: {type(e).__name__}: {e}") from e
        except Exception as e:  # network errors, timeouts
            raise LLMError(f"anthropic: {type(e).__name__}: {e}") from e
        text = "".join(getattr(b, "text", "") for b in msg.content if getattr(b, "type", "") == "text")
        if not text.strip():
            raise LLMError("anthropic: empty response")
        return text.strip()


# --------------------------------------------------------------------------------------------------------------------
# Claude Code headless CLI (subscription)
# --------------------------------------------------------------------------------------------------------------------
def find_claude_bin() -> str | None:
    explicit = os.environ.get("CASEDESK_CLAUDE_BIN")
    if explicit:
        return explicit
    for name in ("claude", "claude.cmd", "claude.exe"):
        found = shutil.which(name)
        if found:
            return found
    return None


def parse_cli_envelope(stdout: str) -> str:
    """Parse ``claude -p --output-format json`` output and return its ``result`` text.

    The envelope is one JSON object (``{"type":"result","is_error":false,"result":"..."}``). Some versions print a JSON
    array of events instead; then the last ``type == "result"`` element is used.
    """
    stdout = (stdout or "").strip()
    if not stdout:
        raise LLMError("claude-cli: empty stdout")
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        # Take the last line that parses as JSON (defensive against banner lines).
        data = None
        for line in reversed(stdout.splitlines()):
            line = line.strip()
            if line.startswith("{") or line.startswith("["):
                try:
                    data = json.loads(line)
                    break
                except json.JSONDecodeError:
                    continue
        if data is None:
            raise LLMError(f"claude-cli: stdout is not JSON: {stdout[:200]!r}")
    if isinstance(data, list):
        results = [d for d in data if isinstance(d, dict) and d.get("type") == "result"]
        if not results:
            raise LLMError("claude-cli: no result event in output")
        data = results[-1]
    if not isinstance(data, dict):
        raise LLMError("claude-cli: unexpected envelope")
    if data.get("is_error"):
        raise LLMError(f"claude-cli: is_error ({data.get('subtype')}): {str(data.get('result'))[:200]}")
    result = data.get("result")
    if not isinstance(result, str) or not result.strip():
        raise LLMError(f"claude-cli: missing result (subtype={data.get('subtype')})")
    return result.strip()


class ClaudeCLILLM:
    """Runs ``claude -p --output-format json --model <m>`` with the prompt on stdin (UTF-8).

    Tools are disabled with ``--disallowedTools`` and the agent is limited to one turn, so the CLI can only return
    text. Instructions are sent on stdin rather than argv (Windows .cmd shims break on long/multi-line arguments).
    """

    name = "claude-cli"

    def __init__(self, binary: str | None = None, model: str | None = None, timeout: float | None = None,
                 runner: Callable[..., subprocess.CompletedProcess] | None = None):
        self.binary = binary or find_claude_bin()
        if not self.binary:
            raise LLMError("claude-cli: executable not found (set CASEDESK_CLAUDE_BIN or put `claude` on PATH)")
        self.model = model
        self.timeout = timeout or llm_timeout()
        self._run = runner or subprocess.run
        self._minimal_flags = False  # set if the installed CLI rejects one of the optional flags

    def build_args(self, model: str) -> list[str]:
        args = [self.binary, "-p", "--output-format", "json", "--model", model]
        if not self._minimal_flags:
            args += ["--max-turns", "1", "--system-prompt", CLI_SYSTEM_PROMPT,
                     "--disallowedTools", ",".join(CLI_DISALLOWED_TOOLS)]
        return args

    @staticmethod
    def build_stdin(system: str, user: str, json_mode: bool) -> str:
        return (
            "=== INSTRUCTIONS ===\n" + system + (JSON_SUFFIX if json_mode else "") +
            "\n=== END INSTRUCTIONS ===\n\n=== INPUT ===\n" + user + "\n=== END INPUT ===\n"
        )

    def complete(self, system: str, user: str, json_mode: bool = False, model: str | None = None) -> str:
        m = model or self.model or compose_model()
        stdin = self.build_stdin(system, user, json_mode)
        env = dict(os.environ)
        env.setdefault("PYTHONIOENCODING", "utf-8")
        for attempt in range(2):
            try:
                proc = self._run(
                    self.build_args(m), input=stdin, capture_output=True, text=True, encoding="utf-8",
                    errors="replace", timeout=self.timeout, env=env,
                )
            except subprocess.TimeoutExpired as e:
                raise LLMError(f"claude-cli: timeout after {self.timeout:.0f}s") from e
            except OSError as e:
                raise LLMError(f"claude-cli: cannot start {self.binary}: {e}") from e
            err = (proc.stderr or "").lower()
            if proc.returncode != 0 and not self._minimal_flags and attempt == 0 and (
                "unknown option" in err or "unknown argument" in err or "error: option" in err
            ):
                self._minimal_flags = True  # older CLI: retry with only the essential flags
                continue
            if proc.returncode != 0 and not (proc.stdout or "").strip():
                raise LLMError(f"claude-cli: exit {proc.returncode}: {(proc.stderr or '')[:300]}")
            return parse_cli_envelope(proc.stdout)
        raise LLMError("claude-cli: failed")  # pragma: no cover


# --------------------------------------------------------------------------------------------------------------------
# Fake (tests)
# --------------------------------------------------------------------------------------------------------------------
class FakeLLM:
    """Deterministic scripted LLM.

    ``FakeLLM(responses=[...])`` returns the responses in order (the last one repeats). An item may be a string, an
    Exception instance (raised), or a callable ``(system, user, json_mode) -> str``. ``FakeLLM(handler=fn)`` calls
    ``fn(system, user, json_mode)`` for every request. Every call is recorded in ``.calls``.
    """

    name = "fake"

    def __init__(self, responses: list | None = None, handler: Callable[[str, str, bool], str] | None = None):
        self.responses = list(responses or [])
        self.handler = handler
        self.calls: list[dict] = []

    def complete(self, system: str, user: str, json_mode: bool = False, model: str | None = None) -> str:
        self.calls.append({"system": system, "user": user, "json_mode": json_mode, "model": model})
        if self.handler is not None:
            return self.handler(system, user, json_mode)
        if not self.responses:
            raise LLMError("fake: no scripted response")
        item = self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        if isinstance(item, BaseException):
            raise item
        if callable(item):
            return item(system, user, json_mode)
        return item


# --------------------------------------------------------------------------------------------------------------------
def get_llm(kind: str | None = None) -> LLM | None:
    """Backend from env CASEDESK_LLM (explicit opt-in; unset = none, so tests never reach a real model).
    A backend that cannot start returns None (rules + templates) instead of crashing the app."""
    kind = (kind if kind is not None else os.environ.get("CASEDESK_LLM", "none")).strip().lower() or "none"
    if kind in ("none", "off", "rules", "templates"):
        return None
    if kind == "fake":
        return FakeLLM(handler=_default_fake_handler)
    if kind not in ("claude-cli", "claude_cli", "cli", "claude", "anthropic"):
        raise ValueError(f"unknown CASEDESK_LLM={kind!r} (expected anthropic | claude-cli | fake | none)")
    try:
        if kind == "anthropic":
            return AnthropicLLM()
        return ClaudeCLILLM()
    except LLMError:
        return None


def _default_fake_handler(system: str, user: str, json_mode: bool) -> str:
    # The env-selected fake answers "I don't know" so the pipeline exercises its fallbacks deterministically.
    raise LLMError("fake: unscripted")


# --------------------------------------------------------------------------------------------------------------------
# JSON parse + repair
# --------------------------------------------------------------------------------------------------------------------
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I)


def parse_json(text: str) -> dict:
    """Parse a JSON object from model output, tolerating code fences, prose around it, trailing commas and smart
    quotes. Raises ValueError if nothing usable is found."""
    if text is None:
        raise ValueError("no text")
    t = _FENCE.sub("", text.strip()).strip()
    candidates = [t]
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end > start:
        candidates.append(t[start:end + 1])
    for c in candidates:
        for fixed in (c, _repair(c)):
            try:
                obj = json.loads(fixed)
            except (json.JSONDecodeError, TypeError):
                continue
            if isinstance(obj, dict):
                return obj
    raise ValueError(f"not a JSON object: {text[:120]!r}")


def _repair(s: str) -> str:
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    s = re.sub(r",\s*([}\]])", r"\1", s)  # trailing commas
    s = re.sub(r"\bTrue\b", "true", s)
    s = re.sub(r"\bFalse\b", "false", s)
    s = re.sub(r"\bNone\b", "null", s)
    return s
