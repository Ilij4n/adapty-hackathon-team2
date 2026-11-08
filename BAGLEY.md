# Case Desk: guide for agents

Read this before you change anything here. Background for humans is in `README.md`; the module contracts are in
`ARCH.md`. This file holds what an agent would otherwise get wrong.

## What this is

Case Desk is in-app subscription help for an app's subscribers, built on Adapty. Team 2 built it at the Adapty
Hackathon Belgrade, 7–8 Nov 2026 (Mateja Subin, Andrija Milikić, Ilijan Kojović). It is shown white-labelled as
"Lumen Help"; Lumen is Adapty's hackathon test app.

The one rule behind every design choice: **code decides the facts, Claude only writes the words, and money waits
for a person or a rule the owner chose.** Never let the LLM decide a state, a fact, an action or a grant.

## Layout

| Path | What it is |
|---|---|
| `casedesk/adapty/` | Adapty server-side API v2 client, the mock server (demo), the Lumen seed loader |
| `casedesk/engine/` | `state.classify` (13 states), `facts.build` (FactSheet), `policy.decide` (fixed table) |
| `casedesk/ai/` | intent (Haiku), compose (Sonnet), `validate.py` (blocks any fact not in the FactSheet), templates, `suggest.py` |
| `casedesk/app/` | FastAPI app: `main.py` routes, `store.py` (sqlite), `auth.py` (HMAC ids, console token), `rules.py` (owner rules) |
| `casedesk/app/static/` | UI variants: `v0` default; `v2` Night Shift (dark); `v5` = v2 + chat bubbles (**the demo design**); v1/v3/v4/v6 are design experiments |
| `casedesk/mcp_server.py` | MCP server (9 tools) over the console API; approve, deny, reply and resolve all need `confirm: true` |
| `casedesk/seed.py` | 16 realistic console cases through the real engine; never calls an LLM |
| `casedesk/clock.py` | the only source of "now" (demo clock under `CASEDESK_NOW`) |
| `tests/` | pytest (730), `e2e_ui.py` (Playwright), `design_shots.py` |
| `eval/` | 116-ticket eval; `run_eval.py --backend claude-cli` is the live run |
| `presentation/` | the pitch deck; `present/deck.html` is the offline deck with the video inside |
| `video/` | the demo video's source (Bagley's video engine; it doesn't build from this repo alone) |
| `docs/` | policy, bug-bash and review reports, design iterations, MCP transcripts, README art (`docs/img`) |

## Run and test

```bash
uv sync
CASEDESK_DB=/tmp/mycopy.db CASEDESK_DESIGN=5 uv run python -m casedesk.demo --port 8150 --fresh --seed
uv run pytest -q
uv run python tests/e2e_ui.py            # and: --variant 5
```

- **Always pass your own `CASEDESK_DB`.** The default is `./var/casedesk.db`, and `--fresh` deletes it. An agent
  once nearly wiped the live demo's database this way.
- **Use your own port.** **Port 8100 on 192.168.1.32 is the live demo**, in the `hackathon` container,
  `/work/case-desk`. Never restart it, run `--fresh` against it, or send it test chats unless that is your task.
- **Ava (`lumen_demo_00239`) is the only user eligible for a grant**, and a grant request blocks her for 90 days.
  Never create one for her on the live demo; use your own server.
- **Demo clock:** `demo.py` runs a ticking clock that starts at 4 Nov 2026 00:12. Ava's grant window closes about
  27 h after each start. Tests use the frozen clock.
- **Real LLM:** `CASEDESK_LLM=claude-cli` with `CLAUDE_CODE_OAUTH_TOKEN` passed at exec time. Never write the
  token to disk. `none` / `fake` work offline.
- **Real Adapty:** `ADAPTY_API_BASE=https://api.adapty.io`, `ADAPTY_SECRET_KEY` from the environment only (never
  the repo), and `CASEDESK_ADAPTY_CUID_PREFIX=lumen_<run>_` for an account filled by the organisers' seed script.
- e2e runs rewrite `docs/screens/*.png`. Run `git checkout -- docs/screens` unless updating them is the point.

## Contracts tests rely on

- Exactly **one `.btn.approve` per pending grant**, inside `li.q-item` in `#queue`. Approve lives in one place only.
- Every reply goes through `validate.check`. A team reply (`POST /api/cases/{id}/reply`) is the developer's own
  words: it is fact-checked as advice, never blocked.
- Escalations (privacy, injection, "I want a person") always go to a person. Rules can't change that.
- New console UI goes in `static/v2/`. If you change `v2/console.html` or `v2/help.html`, copy the change into
  `v5/` (and `v6/`): their pages are copies with three extra lines.

## Git

- Two GitHub repos hold the same history. Push to both (each has its own deploy key):
  - private: `Ilij4n/adapty-hackathon-team2-private`
  - public: the submission repo `Ilij4n/adapty-hackathon-team2`, which the judges follow
- Work on a branch. Run the full suite and the e2e before merging. Commit messages say why, not what.
- Never commit secrets. Scan before pushing to `public`, since it is public.

## Where to look next

- `.bagley/LEARNINGS.md`: what earlier agent turns learned the hard way. Add one dated bullet when a turn teaches
  you something.
- `docs/reports/`: the head-to-head with the closest competitor (Resolve), three UI reviews, and the other teams.
- **Open request (Ilijan, Sun 8 Nov ~13:30):** re-cut the demo video on the final v6 design (strips, compact footer,
  composer with ghost text). Details: `docs/design-iterations/HANDOFF-BAGLEY-CHAT-SYNC.md`, section "Video request".
