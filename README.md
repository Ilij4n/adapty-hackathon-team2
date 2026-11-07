# Case Desk

In-app subscription help for an app's subscribers, built on Adapty. Adapty Hackathon Belgrade 2026, Team 2
(Mateja Subin, Andrija Milikić, Ilijan Kojović).

A subscriber writes "you charged me after I cancelled" or "I paid but have no premium", in any language. Case Desk
reads that user's Adapty profile through the server-side API. Plain code works out what is true: the state, the
facts and which actions are allowed. Claude only writes the words, and a validator blocks any reply that uses a fact
the code didn't supply. A courtesy grant is only ever a request, which the developer approves in the console with
one click.

It is white-labelled for the app ("Lumen Help" in the demo; Lumen is Adapty's hackathon test app).

## Install and run (uv)

```bash
uv sync                          # Python 3.12 + fastapi, pydantic, httpx, uvicorn, pytest
uv run python -m casedesk.demo --port 8100 --fresh
```

Then open:
- http://localhost:8100/help: the subscriber's help screen (pick a demo user at the top)
- http://localhost:8100/console: the developer console with approvals (pre-authorised in demo mode)
- http://localhost:8100/: the landing page

Demo mode runs a mock Adapty server in-process with 11 seeded Lumen users, on a frozen clock (2026-11-04). Good
users to try:
- Marko · 00009: Serbian, cancelled but paid up until July 2027
- Ava · 00239: paid, then lost premium to a billing error; the only one eligible for a grant
- Lucía · 02317: trial payment failed, never paid

`--fresh` clears the case database (`var/casedesk.db`).

### The LLM

`--llm` (or `CASEDESK_LLM`) picks the backend:

| backend | needs |
|---|---|
| `claude-cli` (default if `claude` is on PATH) | Claude Code logged in, or `CLAUDE_CODE_OAUTH_TOKEN` set |
| `anthropic` | `uv sync --extra anthropic` and `ANTHROPIC_API_KEY` |
| `fake` | nothing: canned replies, for tests |
| `none` | nothing: the built-in templates answer |

Whichever backend runs, the validator checks every reply. If the LLM fails or a reply is rejected, a template answers.

### Against real Adapty

Set `ADAPTY_API_BASE` and `ADAPTY_SECRET_KEY`. Outside demo mode, set `CASEDESK_DEMO=0`, an `APP_SIGNING_SECRET`
(the app signs `customer_user_id` with HMAC) and a `CONSOLE_TOKEN`. With `CASEDESK_PUBLIC=1` the server refuses to
start while either is missing or still set to the demo value.

## Tests

```bash
uv run pytest -q                                      # 544 tests; 2 skip without the organisers' seed repo
uv run playwright install chromium && uv run python tests/e2e_ui.py   # UI end-to-end
uv run python eval/run_eval.py --backend claude-cli --concurrency 4  # live eval with real Claude
```

The latest live run (116 tickets, 12 languages, real Claude) is in `eval/live-run-2026-11-07-round2.txt`:
- 0/116 replies with any violation and 0 refund promises
- 16/16 injection attempts flagged, and none of them changed the actions
- intent understood 92.2%
- 0 false injection flags on clean tickets

## Where things are

- `ARCH.md`: the architecture and module contracts
- `docs/policy.md`: the state × intent policy table
- `docs/bugbash-*.md`: the three bug-bash reports
- `casedesk/adapty/`: the Adapty client, mock server and seed loader
- `casedesk/engine/`: state, facts, policy
- `casedesk/ai/`: intent, compose, validator, templates
- `casedesk/app/`: FastAPI app, help widget, console
