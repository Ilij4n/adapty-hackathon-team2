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

### Seeded demo data

`python -m casedesk.demo --fresh --seed` (or `python -m casedesk.seed [--db PATH] [--reset] [--count N]`) fills
the console with 16 realistic cases from the 3 days before the demo clock: 8 languages including Serbian Cyrillic,
refunds through Apple and Google, a privacy request, a request for a person, a prompt-injection attempt and one
historical grant request the team denied. Each case belongs to a real Lumen replay user. Their state, facts and
actions come from the real engine (mock Adapty profile, `classify`, `facts.build`, `policy.decide`), and everything is
stored the same way live cases are. Only the user's message, the intent and the reply text are scripted. The replies
are filled from each case's FactSheet and must pass the validator; if one fails, a template answers instead.
Seeding never calls an LLM. Ava (00239), Marko (00009) and the other `/help` picker users are never seeded, so the
live demo starts clean. Running it twice adds nothing; `--reset` removes and re-adds only the seeded cases.

## Use it from Claude (MCP)

`casedesk/mcp_server.py` is an MCP server, so you can run your support from Claude Code or Claude Desktop. You can
ask what is waiting for your OK, which cases need a person, or what happened in a case, and approve or deny a
grant. It calls a running Case Desk's console API. You still make the decision: approving or denying needs your OK
in the client, and the call must also include `confirm: true`. Without it nothing changes. No tool sends anything to
a subscriber.

Tools: `waiting_for_my_ok`, `needs_a_person`, `list_cases(filter, limit)`, `get_case(case_id)`, `daily_summary(hours)`,
`approve_grant(approval_id, confirm)`, `deny_grant(approval_id, confirm, reason?)`.

```bash
uv sync --extra mcp
claude mcp add casedesk -e CASEDESK_URL=http://127.0.0.1:8100 -e CASEDESK_CONSOLE_TOKEN=demo-console \
  -e PYTHONPATH="$(pwd)" -- "$(pwd)/.venv/bin/python" -m casedesk.mcp_server
claude "What is waiting for my OK in Case Desk?"
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "casedesk": {
      "command": "/path/to/case-desk/.venv/bin/python",
      "args": ["-m", "casedesk.mcp_server"],
      "env": {"PYTHONPATH": "/path/to/case-desk", "CASEDESK_URL": "http://127.0.0.1:8100",
              "CASEDESK_CONSOLE_TOKEN": "demo-console"}
    }
  }
}
```

`demo-console` is the demo token. Against a real deployment, use its `CONSOLE_TOKEN`.

## Rules: you choose what Case Desk does on its own

The console's **Rules** button (Night Shift, top right) opens three rows:

- **Courtesy premium**: *Ask me* (default: every grant waits for your OK, as above), *Automatic up to N days*
  (1–7), or *Never*. Automatic grants go through the same approve path as the console button (Adapty re-read, policy
  re-check, Adapty grant) and are recorded as approved by `rule: auto up to N days`; the user is told the extension
  is active. The code only allows it for a user who paid, was never refunded and is in a state policy already grants
  in (payment failed, at most 14 days ago), once per user per 90 days. A longer grant, anything outside those limits,
  or a failed re-check / Adapty error stays a normal pending request. *Never* drops the proposal before the reply is
  written, so the reply doesn't mention it.
- **Privacy, attacks and "I want a person"**: always a person, by design (not configurable).
- **Answers about status, charges, cancelling, restore**: automatic, every reply checked (not configurable).

Grants a rule gave show in teal in the case and the list ("Given automatically by your rule"), with a one-click
"Switch rule to Ask me". Every rule change is in the audit log (`rules changed: grants ask → auto (3 days)`).

API (console token in `X-Console-Token`, or the demo console cookie), ready for an MCP `set_grant_rule` tool:

```bash
curl -H "X-Console-Token: $CONSOLE_TOKEN" localhost:8100/api/rules
curl -X PUT -H "X-Console-Token: $CONSOLE_TOKEN" -H 'content-type: application/json' \
     -d '{"courtesy_grants": "auto", "max_days": 3}' localhost:8100/api/rules
```

`courtesy_grants` is `ask | auto | off`, `max_days` 1–7; both optional (a partial PUT keeps the other); any other
key is a 422. Both calls return `{"rules": {...}, "limits": {...}, "locked": [...]}`. Code: `casedesk/app/rules.py`.

### Suggested replies for people

When a case goes to a person (the user asked for one, a privacy request, or a message that tried to give orders),
Case Desk also drafts the person's answer: built from the FactSheet, in the user's language, checked by the same
validator (template fallback), stored as `suggested_reply` on the case and shown with a Copy button in the console's
"A person needs to answer this" panel. It is never sent to the user.

## Tests

```bash
uv run pytest -q                                      # 721 tests; 2 skip without the organisers' seed repo
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
