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

## Checks run on this branch

- `uv run pytest -q`: 707 passed, 3 skipped.
- `uv run python tests/e2e_ui.py --variant 5`, `--variant 6`, and the default: E2E OK.
- `uv run python tests/design_shots.py --variants 2,5,6 --out <dir>`: 0 problems (no page errors, no sideways scroll
  at 390, light and dark).
- The Give button was checked on screen at 360 to 1920px, light and dark, with 1 and 8 pending grants, the case open
  or not, the evidence panel open or closed.

After your team-reply merge (b96d775), a follow-up commit styles the team speaker in both chat specs: `li.msg.team`
(help) and `.turn.team` (console), plus the console's "Write to ..." reply box sitting on the chat column. Re-run at
11:35: pytest 714 passed, 5 skipped; e2e `--variant 5` and `--variant 6` E2E OK; design_shots v5 and v6 26 shots each,
0 problems.

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

## Ilijan's decision (Sun 8 Nov, ~11:55 CET): strips (v6), not bubbles

Ilijan looked at both on desktop and phone and **picked v6 (strips everywhere)**: on a wide screen the bubble console
does not use the width. **Please draw the video's console scene with strips (v6), not bubbles.**

Coming next on this branch (in progress now):
1. The team reply box becomes a normal chat composer at the bottom of the transcript (one line that grows, a short
   hint above it), instead of the large box; placed so it does not fight the decision card / Give button.
2. A decision on the transcript width when the evidence panel is collapsed (stretch or keep a measured column).
Then v6 becomes the default (`CASEDESK_DESIGN=6`). Please do not merge this branch into main before Ilijan's OK.

## Update (~13:00 CET): v6 is the pick, with Ilijan's changes. Bagley, please take it from here

Ilijan picked **v6 (strips)**. Run it as the default with `CASEDESK_DESIGN=6`. Changes on top of the strips, all inside
`static/v6/` (v2 untouched):

| What | Where |
|---|---|
| Strips span the full case column (rule, background, time); reply text capped at `--chat-text: 80ch`; `--chat-measure: 100%` on `#detail .transcript` | `v6/layout.css` |
| Your team reply box and the "Write to" link are replaced by **one normal composer under the newest message**: a one-line hint above ("Goes to Ava's help chat as Lumen team, exactly as written"), Enter sends, Shift+Enter new line, grows to ~5 lines; your fact-check and "Send anyway" are reused. The decision card stays the bottom-most element | `v6/composer.js`, `v6/composer.css` |
| Your suggested-reply box is gone: the suggestion is **ghost text inside the empty composer** (Tab uses it, typing hides it, clearing brings it back, Esc hides it for the case, tap on touch). Not offered once a team reply exists | `v6/composer.js`, `v6/composer.css` |
| **Bug fix in help (also present in v2):** `.fill .log:not(:empty) { flex: 1 0 100%; justify-content: flex-end }` in `v2/help.css` stretches the log to full height as soon as band + messages overflow by 1px, leaving a 130 to 210px gap under the status band (refunded accounts, two messages). v6 overrides it with `.help .fill #log:not(:empty) { flex: none; justify-content: flex-start; }`. Please fix it at the source in v2 too | `v6/chat.css` |
| **Compact decision footer:** one wide row at 1440 (71px instead of 255px): the amber count with the a/d keys, who and what at 16px with the reason under it, Give (amber, 40px) and Deny, the hint; the "asked for" total, "Case Desk asks you to confirm" and "Nothing else changes" lines hidden; several waiting = one row each, scrolls after 3; phones 146px instead of 229px. DOM contract kept | `v6/dock.css`, `v6/dock.js` |

Touch up anything you think needs it, in `static/v6/` (keep the DOM contract in `BRIEF.md`; `tests/e2e_ui.py --variant 6`
must print E2E OK). If you change `v2/console.html` or `v2/help.html`, mirror the change into `v6/`.

Checks at this commit: `tests/e2e_ui.py --variant 6`: E2E OK (combined composer, ghost text, width, help fix).

**Later tweaks (Ilijan, ~13:15):** the decision footer got bigger type (who/what 19px, reason 16px, hint 14px) and
48px buttons, and the Give button a lighter amber fill (`#ffc785`, dark text). v2's "A person needs to answer this"
box is gone in v6: its reason lines become one bold line (`.tc-why`) right above the composer's hint (the injection
warning in coral). E2E `--variant 6` OK after these.

## Video request (Ilijan, Sun 8 Nov ~13:30 CET): please re-cut the demo video on the final v6

v6 is merged into `main` (78eed26). Ilijan asks you to make the demo video with the **final v6 design**, replacing the
console scene drawn with bubbles (v5) or the old strips:

- Run it with `CASEDESK_DESIGN=6` (or `?v=6`), fresh seeded demo, `--llm claude-cli` if you want real replies.
- Console: the strips across the full case column; Ava's request in the compact footer (one wide row, the lighter amber
  "Give Ava 3 days of premium"); the one click; the after-approve state.
- Help on a phone: the same strips, Ava's reply with "Update payment method", the "Requested" note, then the green
  approval line after the click.
- Optional, if time allows: an escalated case (Isla) where the suggested reply shows as ghost text in the chat box at
  the bottom and Tab takes it; the reason line above the hint ("Isla asked for a person...").
- Note from your own guide: a grant request blocks Ava for 90 days, so record the approve take on a fresh demo.

**Footer consistency (Ilijan, ~13:45):** the decision footer now looks the same whichever case is open. In
`v2/console.view.js` `renderDock`, `featured` was `pend.find(open case) || (S.selected ? null : pend[0])`, so while
reading an escalated case every request shrank to a compact row; it is now `pend.find(open case) || pend[0]`: the oldest
request keeps the full row, others stay compact rows under it. E2E OK on v2 and v6.
