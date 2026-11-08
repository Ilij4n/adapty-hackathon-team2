# Design iterations: evaluation brief for Bagley

**To:** Bagley (main orchestrator), via Team 2
**From:** Ilijan's design orchestrator (Claude Code, overnight run)
**Date:** Sun 8 Nov 2026, morning. Code freeze 15:00.
**Branch:** `experimental/design-iterations` (on top of `main` @ d930ff9; not merged, no PR)

## What we ask you to do

1. Open the gallery: `docs/design-iterations/gallery/index.html` (a standalone page; open it from a checkout of this
   branch). It shows four new designs of the developer console and the subscriber help chat, plus the current design,
   in light, dark and phone widths.
2. Evaluate the four for the pitch and the demo video. Ilijan's favourite is **Night Shift (v2)**; the overnight
   orchestrator's pick was **Board (v4)**. State which one should ship and with what confidence.
3. If Night Shift ships, answer Ilijan's three notes below with a concrete design change for each (where the
   approve/deny goes, how many pending items scale, how escalated differs from awaiting approval, how the right panel
   retracts). You can implement them in `casedesk/app/static/v2/` only; the rules are in `BRIEF.md`.
4. For the video: decide where Approve and Deny sit so the "one click" point lands (see note 3).

## Ilijan's notes on Night Shift

Original (Serbian):

> Night shift zamerke.
> Sta ako imamo tonu actionable stavki? Kako bismo to videli? Ovi ostali dizajnovi imaju listu sa dugmicima. Mozda bi
> escalated trebalo da bude istaknutije? Pretpostavljam i da postoji razlika izmedju escalated (ai nije mogao da
> pomogne) i actionable, casedesk je dosao do akcije i trazi potvrdu. Night shift mi je najbolji za tonu zahteva, samo,
> sto se videa tice, treba claude da ga pogleda i da accept/deny stavi u vise "bombastic" mesto da naznaci one click
> poentu koju bi voleli da napravimo
>
> Takodje, mogao bi details screen sa desne strane da bude retractable.

English:

1. **Many actionable items.** What if there are a lot of actionable items: how would we see them? The other designs
   have a list with buttons.
2. **Escalated vs actionable.** Maybe escalated should stand out more. There is a difference between *escalated* (the
   AI could not help; a person has to answer) and *actionable* (Case Desk reached an action and asks for confirmation).
3. **The one-click moment.** Night Shift is the best for a lot of requests, but for the video, Approve/Deny should sit
   somewhere more "bombastic" to make the one-click point we want to make.
4. **Retractable details.** The details panel on the right could be retractable.

## What Night Shift does today (facts, with file pointers)

All in `casedesk/app/static/v2/` (`console.view.js` ~575 lines, `console.css` ~335 lines).

- **Layout at 1200px and up:** three full-height panes, cases list (300px) | the case (transcript, status, "What Case
  Desk did") | the evidence column (claims beside facts, FactSheet, reply check, records, policy actions, audit log).
  Approvals live in a **decision dock** along the bottom of the viewport.
- **Note 1, many pending grants:** the dock lists every pending grant as one row (who, what, state, the amber
  "Give Ava 3 days of premium" button, Deny, the hint). On desktop the dock's list is capped at `max-height: 38vh` and
  scrolls inside the dock (`console.css` around line 294); about 6 rows fit at 900px before it scrolls. On phones the
  dock is a fixed bottom sheet capped at 62dvh. The dock is hidden when nothing waits and rises (220ms) when a grant
  arrives. There is no bulk action and no count-first summary.
- **Note 2, escalated vs actionable:** the data model already separates them.
  - *Actionable* = `case.pending_approval` / an approval with status `pending`: the policy chose `PROPOSE_GRANT`, Case
    Desk has done its work, and a developer's single click decides. Shown in the dock (amber).
  - *Escalated* = `case.escalated` (and `case.privacy` as a sub-kind): the policy chose `ESCALATE_TO_HUMAN` because
    the user asked for a person, it is a privacy/data request, or the message tried to give Case Desk orders. Nobody
    can resolve it with one click; a person must reply.
  - Today escalated cases show only as a small amber "needs a person" (or "privacy") tag at the end of the list row
    (`console.view.js` around line 185), the "Escalated N" filter, and an alert line inside the case. **Both use
    amber**, so the two kinds of "needs you" look alike, and escalated has no place of its own on screen.
- **Note 3, the one-click moment:** the approve button lives only in the dock row (by design since commit 2b863fb: one
  Approve per grant, never inside the case card; the e2e test asserts exactly one `.btn.approve` per pending grant). In
  the dock it is the brightest element on screen, but it sits at the bottom edge, at normal button size.
- **Note 4, the right panel:** the evidence column is always open (Night Shift renders no `details.more`; the e2e test
  then only checks that the "What the user claims" heading exists in the DOM). It is not collapsible today.

## Options we see (for you to accept, reject or improve)

- **Many items:** a count-first dock ("7 waiting for your OK", total days requested) with the oldest one expanded and
  the rest as compact rows; or a "Needs your OK" group pinned at the top of the cases list with inline buttons (what
  Correspondence v3 does); keyboard flow `a` approve / `d` deny / `j` next, with the hint visible.
- **Escalated:** give it its own treatment and colour. Amber stays "Case Desk asks you to confirm"; escalated gets a
  "Needs a person" group at the top of the list (above the rest, below the dock), with the reason in words ("asked for
  a person", "privacy request", "tried to give orders") and a different mark. Coral is taken ("blocked,
  contradicted"); a neutral strong ink or a second hue would work.
- **One click, for the video:** when a grant arrives, the dock could open as a large decision card centred at the
  bottom of the case pane: who, what ("3 days of premium"), why (the status sentence), what changes ("Ava gets premium
  until ..., nothing else changes"), and a large amber "Give Ava 3 days of premium" with Deny beside it. After the
  click: the flash on the status ("Premium given"), the dock collapses, and in the help phone the green "Good news"
  message appears. Keep the DOM contract (the button stays in `li.q-item` inside `#queue`, with the exact hint text).
- **Retractable details:** a toggle in the case header ("Evidence" with a chevron, keyboard `e`), the state kept in
  `localStorage`; collapsed, the transcript takes the width. Keep the "What the user claims" heading in the DOM when
  collapsed, or switch to a `details.more` (then it must start closed; the e2e test clicks it).

## The four iterations (short)

| | Stance | Console | Help |
|---|---|---|---|
| **v1 Statement** | the account as a statement on one dated spine | grant slips + index left; the case as one full-width sheet, the spine beside the conversation | a printed receipt, serif replies |
| **v2 Night Shift** | the deck's control room after dark (deck navy, Plex, amber/teal/coral) | cases, the case, the evidence column; a decision dock along the bottom | Lumen at night, compact status band |
| **v3 Correspondence** | a calm mail client | folder rail, index with "Needs your OK" pinned, wide reading pane | status folded into one sentence, 17px text |
| **v4 Board** | a Swiss triage board | four lanes on top (Needs your OK, Needs a person, Privacy, Answered), the case as a spread below | the state as a headline, a grant tracker |

Why the orchestrator picked Board: it answers "what needs me" before any click, it already separates "Needs your OK"
from "Needs a person" as two lanes (Ilijan's note 2), the demo's proof sits above the fold at 1440x900, and approving
moves Ava's ticket into "Answered". Why Ilijan prefers Night Shift: it scales best to a lot of requests and matches
the deck. Both readings are fair; the notes above are the gap between them.

Design rationale, rules and the DOM contract: `docs/design-iterations/BRIEF.md` and `DIRECTIONS.md`. Each iteration's
token plan (colours, type scale, ASCII wireframe) is the comment at the top of its `static/vN/base.css`.

## Run and verify

```
git checkout experimental/design-iterations
uv sync
CASEDESK_DB=/tmp/cd-design.db uv run python -m casedesk.demo --port 8300 --fresh --seed
# console: http://localhost:8300/console?v=2   help: http://localhost:8300/help?v=2   (v=1..4; no v = current)
```

- Always pass an explicit `CASEDESK_DB`: the default is `./var/casedesk.db` and `--fresh` deletes it.
- To make an iteration the default without moving files: `CASEDESK_DESIGN=2` (then `?v=0` shows the current design).
- Add `--llm claude-cli` for real Claude replies (the screenshots use template replies).

Checks (all passed on this branch at 06:50):

```
uv run pytest -q                                   # 557 passed, 2 skipped
uv run python tests/e2e_ui.py                      # E2E OK (current design)
uv run python tests/e2e_ui.py --variant 2 --shots /tmp/e2e-v2     # E2E OK; also 1, 3, 4
uv run python tests/design_shots.py --variants 2 --out /tmp/shots # 26 shots, 0 problems
```

## How it plugs in

- `/help?v=N` and `/console?v=N` serve `casedesk/app/static/vN/`. Each variant has its own markup, CSS, fonts and a
  view file; the logic stays shared. `console.js` and `help.js` accept a view (`window.CaseDeskConsoleView`,
  `window.CaseDeskHelpView`) that only changes how things are drawn: API calls, polling, approvals, user switching,
  RTL and safe rendering are the same code for every design.
- Shared changes on this branch: the variant routing and `CASEDESK_DESIGN` (`casedesk/app/main.py`); em dashes removed
  from console copy; the approval message date in words ("until 7 November 2026"); the demo picker label "Ava (00239)"
  and tidier scenario text; curly apostrophes in UI strings; the landing page keeps `?v=`; `tests/e2e_ui.py --variant`
  and `--shots`; the new `tests/design_shots.py`; one new pytest.
- The first commit on the branch carries Ilijan's em-dash cleanup that was uncommitted in his main checkout
  (templates, i18n, help.html, index.html, main.py and the ai modules).

## Known issues

- **Demo clock (all designs, including the current one):** Adapty data and grant expiry use the frozen demo clock
  (4 Nov 2026), chat messages use real time. On stage a fresh grant reads "Premium given until 7 Nov" next to a message
  from 8 Nov, and some views show the approval as requested on "4 Nov". A backend fix (stamp messages with the same
  clock) or a line in the pitch.
- Template replies (server content) still use straight apostrophes.
- Some variant-only strings are the implementers' own translations (v4's tracker labels, v1's month names); move them
  into `i18n.js` if that design ships.
- The deck's `presentation/present/img/p_console.jpg` and `p_help.jpg` show the current design; re-shoot if a new one
  ships.
