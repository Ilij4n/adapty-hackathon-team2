<p align="center"><img src="docs/img/banner.svg" width="100%" alt="Case Desk: in-app subscription help, built on Adapty"></p>

# Case Desk

In-app subscription help for an app's subscribers, built on Adapty. Adapty Hackathon Belgrade 2026, Team 2
(Mateja Subin, Andrija Milikić, Ilijan Kojović).

A subscriber writes "you charged me after I cancelled" or "I paid but have no premium", in any language. Case Desk
reads that user's Adapty profile through the server-side API. Plain code works out what is true: the state, the
facts and which actions are allowed. Claude only writes the words, and a validator blocks any reply that uses a fact
the code didn't supply. By default a courtesy grant is only a request, which the developer approves in the console
with one click; the owner can change that with a rule (ask me, automatic up to N days within code limits, or never).

It is white-labelled for the app ("Lumen Help" in the demo; Lumen is Adapty's hackathon test app).

<p align="center"><img src="docs/img/architecture.svg" width="100%" alt="Architecture: code decides the facts, Claude writes the words, you approve the money"></p>

<p align="center"><img src="docs/img/request-flow.svg" width="100%" alt="One message step by step: status card at once, checked reply after, and where an injection stops"></p>

## Who it's for

- **Subscribers** of an app that sells subscriptions through Adapty. They get a true answer about a charge, a
  cancellation, a refund or missing premium, in their own language, inside the app, at 2 a.m.
- **The app's developer or support team**: usually one person at a small app. The developer only steps in for money
  (a courtesy grant), unless they set a rule, and for anything that needs a person. A suggested reply, a reply box
  and the MCP server cut that work to a click.
- **Adapty**: a natural add-on next to Refund Saver, and a labelled record of what subscribers complain about and
  what fixed it.

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
grant, write to a subscriber or close a case. It calls a running Case Desk's console API. You still make the decision:
every tool that changes something needs your OK in the client, and the call must also include `confirm: true`. Without
it nothing changes. `reply_to_user` is the only tool that sends anything to a subscriber, and it sends your words as
written; without `confirm: true` it sends nothing but still returns its fact check (numbers, dates or links the
account facts don't hold), so Claude can tell you before you say yes.

Tools: `waiting_for_my_ok`, `needs_a_person`, `list_cases(filter, limit)`, `get_case(case_id)`, `daily_summary(hours)`,
`approve_grant(approval_id, confirm)`, `deny_grant(approval_id, confirm, reason?)`,
`reply_to_user(case_id, text, confirm, resolve=false)`, `resolve_case(case_id, confirm)`.

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

<p align="center"><img src="docs/img/grant-flow.svg" width="100%" alt="The money path: propose, your rule (ask, auto, never), one approve path, Adapty grant"></p>

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
"A person needs to answer this" panel. It is never sent to the user by Case Desk.

### Replying to the subscriber from the console

The panel has a reply box under the draft: **Use the draft** puts the suggested reply in it to edit, then **Send** or
**Send and mark resolved** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> sends). Every other case has a smaller
**Write to <name>** link at the end of the conversation, so you can write to anyone. The message is yours: it is not
passed through the model and the validator does not block it. While you type, the validator's number/date/link check
runs against the case's FactSheet as advice ("Heads-up: “12 Nov 2031” isn't in the account facts"); if it finds
something, the first click shows it and the button becomes **Send anyway**. The message appears in the case as
"You (Lumen team)" and in the subscriber's open help chat as a teal "Lumen team" bubble (the widget polls every 4 s;
an unanswered team reply is shown again when they open help). If they answer, the conversation continues in that case
and a resolved case opens again.

```bash
curl -X POST -H "X-Console-Token: $CONSOLE_TOKEN" -H 'content-type: application/json' \
     -d '{"text": "Hi Isla, I checked your account myself…", "resolve": true}' localhost:8100/api/cases/c_…/reply
# -> {"message": {"id", "role": "team", "author": "Lumen team", "text", "created_at"}, "fact_check": [...], "status"}
```

`text` is 1–2000 characters (blank is a 422); `resolve` also marks the case resolved. Audit: `team_reply` (and
`case_resolved`). `POST /api/cases/{id}/fact-check` runs the same advisory check without sending. The widget reads the
team's messages with `GET /api/messages?customer_user_id=…&signature=…&after=<message id>` (signed like `/api/status`).
The author label is `<CASEDESK_APP_NAME> team`.

## What's real vs mocked

| Real | Mocked or stand-in |
|---|---|
| Claude writes every reply live (`claude-cli`), and every reply passes the validator | The Adapty API is a local mock server that serves Adapty's Lumen hackathon seed data in the real server-side API v2 shapes |
| The state engine, FactSheet, policy table, rules, approvals, audit log and console | We haven't run against a live Adapty account yet. The client targets the real API, and switching is `ADAPTY_API_BASE` + `ADAPTY_SECRET_KEY` |
| The MCP server, tested with real Claude Code | The 16 seeded console cases: scripted text, but state, facts and actions come from the real engine, and no LLM is called |
| 730 tests, the UI end-to-end run, and a live eval with real Claude (116 tickets, 12 languages) | The demo runs on a demo clock (4 Nov 2026, ticking from start-up) so the seed data's dates hold |
| Signed user ids, console token, rate limits | The demo users in `/help` are picked from a list; a real app would sign the id itself |

## What we'd do next

- Connect a real Adapty app: keys, webhooks for state changes, and a "Case Desk" tab in the Adapty dashboard.
- Search, paging and assignment ("someone is on this") for bigger support teams. The scale review is in
  `docs/reports/ui-review-scale.md`.
- Price it as an add-on like Refund Saver. That's Adapty's call.
- Give Adapty the complaint signal across apps: what subscribers misunderstand, and which fixes work.
- Test more languages live, and add bulk approve with per-grant eligibility re-checks.

## Built during the hackathon (and what existed before)

All the code in this repository was written during the event. The first commit is Sat 7 Nov 2026, 16:17 UTC (rule 1).
What existed before, or isn't ours:
- **Adapty's Lumen seed data** (`data/`, from the organisers' `kpotehin/adapty-seed-data-hack`) and Adapty's API docs.
- **Open-source libraries**: FastAPI, pydantic, httpx, uvicorn, the MCP Python SDK, pytest and Playwright.
- **Team tooling used to make the pitch, not part of the product**:
  - the 3D video engine behind `video/` (Bagley's own video toolkit, built before the event);
  - the agent setup (Bagley, Claude Code).

## Team

- **Ilijan Kojović**: the Case Desk idea and its case in the idea contest; the console design work (four design
  directions, the Night Shift fixes he asked for, the v5/v6 chat sync).
- **Andrija Milikić**: idea validation and research, with independent Claude and Codex sessions voting in the
  debate; the pitch storyline.
- **Mateja Subin**: team lead and presenter; ran the Bagley agent fleet (architecture, builders, evals, merges,
  deployment, video and slides).

## Tests

```bash
uv run pytest -q                                      # 730 tests; 2 skip without the organisers' seed repo
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
