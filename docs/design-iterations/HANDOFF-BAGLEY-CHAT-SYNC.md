# Night Shift chat sync: please check on Subin's PC (for Bagley)

**To:** Bagley, running on Subin's PC
**From:** Ilijan's orchestrator (Ilijan cannot message Subin directly; this file is the handoff)
**Date:** Sun 8 Nov 2026, ~11:30. Code freeze 15:00.
**Branch:** `design/night-shift-chat-sync` (based on `main`, merged up to 51d4b4f "Team reply box ... video v7").
Not merged into `main`; no PR.

## What Ilijan wants

Ilijan's two complaints about Night Shift (`static/v2`):
1. The console transcript uses **strips** (a 2px rule per turn, speaker and time on a head line), but the phone help
   chat uses **bubbles**. The two screens show the same conversation in two different chat styles.
2. The approve button "did not exist" in the console. Your `bagley/ui-review-fixes` (approvals always visible, the
   decision card) solved it; both options below keep your version untouched.

He asked for two options, so he can pick one:

| Option | URL | Console (developer) | Help (phone) |
|---|---|---|---|
| **v5: bubbles everywhere** | `/console?v=5`, `/help?v=5` | the transcript becomes bubbles: subscriber right, Case Desk left with its amber edge, "Checked" under each reply | your v2 bubbles, with the speaker's name under each bubble |
| **v6: strips everywhere** | `/console?v=6`, `/help?v=6` | your v2 strips, tightened to the shared spec | the chat becomes strips like the console: speaker and time on top, amber rule for Case Desk, a light step for the subscriber, the reply's buttons and notes inside the rule |

In each option both screens follow one chat spec (same colours, shapes, typing row, error look, right-to-left
handling); only the size differs (console 14px, help 16px). The spec is the comment at the top of `vN/chat.css`.

## What we ask you to do

1. Pull the branch and run it on Subin's PC (commands below).
2. Look at both options on both screens, at desktop and phone width, light and dark. The steps below make a pending
   grant and a team reply appear, so every message type shows.
3. Tell Ilijan (through your usual channel, or in a commit on this branch) which option you would ship and why, and
   anything that looks off. If you fix something, push it to this branch.
4. Do not merge into `main` without Ilijan's OK.

## Run it

macOS / Linux:

```
git fetch origin
git switch design/night-shift-chat-sync       # or: git worktree add ../casedesk-chat-sync origin/design/night-shift-chat-sync
git pull                                       # the team-reply styling lands as a follow-up commit
uv sync
CASEDESK_DB=/tmp/cd-chat-sync.db uv run python -m casedesk.demo --port 8300 --fresh --seed
```

Windows (PowerShell):

```
git fetch origin
git switch design/night-shift-chat-sync
git pull
uv sync
$env:CASEDESK_DB = "$env:TEMP\cd-chat-sync.db"
uv run python -m casedesk.demo --port 8300 --fresh --seed
```

Always pass an explicit `CASEDESK_DB`: the default is `./var/casedesk.db` and `--fresh` deletes it. Add
`--llm claude-cli` for real Claude replies (otherwise the checked templates answer). Any free port works.

Then open:

- `http://localhost:8300/help?v=5&demo_user=lumen_demo_00239` and `http://localhost:8300/console?v=5`
- `http://localhost:8300/help?v=6&demo_user=lumen_demo_00239` and `http://localhost:8300/console?v=6`
- `http://localhost:8300/console?v=2` and `/help?v=2` for your Night Shift as it is on `main`, to compare.

To see every message type:
1. In a help tab (Ava), tap the chip "I paid but have no premium". The reply arrives with "Update payment method",
   "Manage subscription" and the "Requested" note.
2. In that option's console, Ava's case shows the decision card. Click "Give Ava 3 days of premium": the help tab shows
   the green approval message within a few seconds.
3. In the console, open any case and send a reply from the team reply box: it appears in that user's help chat as
   "Lumen team" (a third speaker, teal).
4. Dark mode: switch the OS appearance. Phone width: devtools device mode at 390px.

To make an option the default without moving files: start the demo with `CASEDESK_DESIGN=5` (or `6`); `/console` and
`/help` then serve it, and `?v=0` still shows the original pages.

## How the options are built (so your next v2 changes flow through)

- Each option is a **thin layer over `static/v2`**. `static/v5/` and `static/v6/` hold only two pages
  (`console.html`, `help.html`) that load all of v2's CSS and JS from `/static/v2/`, plus `chat.css` and one small
  view wrapper per screen (`console.chat.js` / `help.chat.js` in v5, `console-chat.js` / `help-chat.js` in v6). The
  wrappers take `window.CaseDeskConsoleView` / `window.CaseDeskHelpView` from v2 and add only chat details (captions,
  typing dots, speaker head lines).
- So any change you make to v2's CSS or JS shows up in both options automatically. **If you change
  `v2/console.html` or `v2/help.html`** (a new script, stylesheet or element), copy that change into
  `v5/` and `v6/` too; their pages are copies of yours with three extra lines.
- One shared backend change: `/api/meta` now returns `server_now` and `clock`, like `/api/console/meta`, so help can
  show the same demo clock as the console.

## Checks run on this branch (11:15, before your team-reply merge)

- `uv run pytest -q`: 707 passed, 3 skipped.
- `uv run python tests/e2e_ui.py --variant 5`, `--variant 6`, and the default: E2E OK.
- `uv run python tests/design_shots.py --variants 2,5,6 --out <dir>`: 0 problems (no page errors, no sideways scroll
  at 390, light and dark).
- The Give button was checked on screen at 360 to 1920px, light and dark, with 1 and 8 pending grants, the case open
  or not, the evidence panel open or closed.

After your team-reply merge (b96d775), the follow-up commit styles `li.msg.team` (help) and `.turn.team` (console) in
both chat specs and re-runs the same checks; pull before judging.

## Known gaps

- With the grant rule set to "auto" or "never", only the Rules button in the header says so; the decision dock's empty
  text and the "Waiting for your OK" group still say requests will wait there. That copy lives in v2 (your part).
- Help shows the demo-clock time only once `/api/meta` has `server_now` (it does on this branch).

## Bagley's answer (Sun 8 Nov, 10:35 UTC)

**Ship v5 (bubbles everywhere), confidence ~75%.** Checked on a local run (seeded, Ava's grant pending) at 1440 dark
for both consoles and 390 dark for both help screens.
- Bubbles are what every chat app uses, so the jury reads the console transcript as a conversation at a glance, and
  the developer sees the same shapes the subscriber sees on the phone, which is the story the video tells.
- v6 turns the subscriber's phone chat into strips; on a consumer screen that reads like a log, not a chat.
- Both keep the decision card and the single Give button untouched; no difference there.
- Small thing in v5's console: the "Write to Ava" link sits in a band a shade lighter than the transcript background
  (looks like a stray strip). "Checked" under the reply is good, keep it.
Not merged into main: waiting for Ilijan's OK, as asked. If he agrees: merge and deploy with `CASEDESK_DESIGN=5`.
The demo video's console scene is being redrawn with bubbles to match.
