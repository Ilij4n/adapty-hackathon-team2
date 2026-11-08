# Night Shift chat sync: two variants (handoff)

Worktree: `~/Developer/adapty-hackathon/casedesk-chat-sync`, branch `design/night-shift-chat-sync`, made from
`origin/main` @ 675d712. `main` already contains the four design iterations (`static/v1..v4`) and Bagley's Night Shift
fixes to `static/v2` (decision card, count-first dock, "Needs a person" group, collapsible evidence; see
`git log --oneline -12 -- casedesk/app/static/v2`), plus the one-clock demo fix (`casedesk/clock.py`).

## What Ilijan asked for (his words, lightly edited)

> Two things I do not like: maybe that the approve button does not exist in the dev console, and that the mobile and
> dev console designs differ in terms of chat looks. One chat uses the strip for the chat UI, while in the other
> (mobile) the chats are bubbles. I want them to be synced, so give me two variants:
> 1. the Night Shift console UI with bubble chats, the same as its mobile counterpart;
> 2. and vice versa, the mobile chat with the dev console strip style. Make them match.

"Mobile" = the subscriber help chat (`/help?v=2`, files `static/v2/help.*`). "Dev console" = `/console?v=2`
(`static/v2/console.*`). Today the console transcript is **strips** (`.turn`: a 2px inline-start rule, speaker name and
time on a head line, text under it; amber rule for Case Desk, ink-3 for the user, teal for system), while help uses
**bubbles** (`.msg .bubble`: user bubble right-aligned on `--u-bg` with a 12px radius and a 4px tail corner; Case Desk
bubble left-aligned on `--b-bg` with a 2px amber inline-start rule; system as a full-width teal-soft line).

## The two variants (each a full copy of v2, so they can be compared side by side)

| Variant | URL | Console chat | Help chat |
|---|---|---|---|
| **v5 "Night Shift, bubbles"** | `/console?v=5`, `/help?v=5` | changed to bubbles | v2 bubbles (adjust only so both share one spec) |
| **v6 "Night Shift, strips"** | `/console?v=6`, `/help?v=6` | v2 strips (adjust only so both share one spec) | changed to strips |

"Make them match" means one chat component spec used on both screens: same shapes, radii, colours (tokens),
alignment rule, speaker/time treatment, type size ratio, the Case Desk vs user vs system distinction, the error state,
the typing row, and RTL behaviour. Write the shared spec as a short comment block at the top of `vN/base.css` and make
both screens follow it. Sizes may differ by screen (console body 14px, help 16px), proportions may not.

Design notes for each:
- **v5 bubbles in the console:** the console is the operator's view of the same conversation the subscriber sees, so
  it should read like the phone: user on one side, Case Desk on the other. In the console the developer is neither
  party; keep the subscriber's messages where help puts "user" messages so the two screens mirror each other, and keep
  Case Desk's checked tick and per-reply check line under its bubbles. Long replies (up to ~500 characters with long
  URLs) must stay readable: cap bubble width (about 72ch in the console), keep the amber Case Desk mark. The
  "What Case Desk did" block and the status readout stay as they are; only the conversation turns change. System
  turns (grant approved/denied) become the same full-width line help uses.
- **v6 strips in help:** strips must work on a 390px phone (and 360px): full-width turns, a 2px inline-start rule,
  the speaker name (the user's turns labelled with `t().you`, Case Desk's with `t().helper` from `i18n.js`) and time on
  the head line, text under it. The reply's action buttons, notes (`.note`, `.note.grant`) and steps stay under the
  Case Desk turn, inside its rule. RTL: the rule sits on the inline-start side (right in Arabic). Make sure the user can
  still tell at a glance which turns are theirs (the rule colour and the name, plus perhaps a subtle background step).

## Also: the approve button

Ilijan said the approve button "does not exist in the dev console". In Bagley's v2 the Give/Deny buttons live in the
decision dock (`#queue` > `li.q-item`), and a big decision card appears for the open case. Investigate and fix in
your variant:
1. A fresh seeded demo has **no pending grant** (Ava's grant appears only after she writes in `/help`), so the console
   shows no approve button anywhere. Do not change the seeder. Make the empty state point to where approval will
   appear (e.g. the dock stays visible as a slim bar: "Nothing waiting for your OK. Grants Case Desk proposes appear
   here with a Give button."). Keep it calm, not a fake button.
2. Check every situation where a grant IS pending but no Give button is visible on screen: widths 360, 390, 768,
   1100, 1440, 1920; light and dark; with the pending case open, with another case open, with nothing open; after
   scrolling the transcript; with the evidence panel open and closed; with 1 and with 8 pending grants. Fix any you
   find. Report what you checked.
Keep the DOM contract: exactly one `.btn.approve` per pending grant, inside its `li.q-item` in `#queue`, with `.hint`
text exactly `Nothing is granted until you approve.`

## Rules

- Start each variant by copying v2: `cp -R casedesk/app/static/v2 casedesk/app/static/v5` (or v6). Update every
  `/static/v2/` path and every `?v=2` / `/?v=2` link inside the copy to the new number. Change the page titles to say
  which variant it is only in `<title>` (e.g. "Case Desk: console (Night Shift, bubbles)").
- Only touch your own folder (`static/v5/` or `static/v6/`). Do not edit `static/v2/`, shared JS (`console.js`,
  `help.js`, `i18n.js`), tests, or the other agent's folder. If a shared change is truly needed, say so in your report.
- **Do not commit** (the orchestrator commits). Never use or kill port 8100 (Ilijan's live demo). Use port 8215 (v5)
  or 8216 (v6) for a live server, always with an explicit `CASEDESK_DB` in a temp dir (the default `./var/casedesk.db`
  is deleted by `--fresh`).
- No em dashes or en dashes in any visible text. No emoji. Visible focus, AA contrast, reduced motion respected.
- Read first: `docs/design-iterations/BRIEF.md` (architecture, DOM contract, the view hooks), the top comment of
  `static/v2/base.css` (Night Shift tokens), `static/v2/console.view.js`, `static/v2/help.view.js`, `static/help.js`,
  `static/console.js`, `tests/e2e_ui.py`.

## Verify (both must pass before you report)

```
cd ~/Developer/adapty-hackathon/casedesk-chat-sync
uv run python tests/e2e_ui.py --variant N --shots "$TMPDIR/e2e-vN"       # must print E2E OK
uv run python tests/design_shots.py --variants 2,N --out "$TMPDIR/shots"  # 0 problems; compare N against 2
```

Look at the screenshots (Read tool on the PNGs): the console chat and the help chat must visibly follow the same spec
in light and dark, at 1440 and 390. Fix and re-check until they do.

## Report back (max 250 words)

What changed in each screen, the shared chat spec in 3 to 5 lines, what you found and fixed about the approve button,
the check results, and the folder with your final screenshots (name the 4 most telling ones: console 1440 light,
console 1440 dark, help 390 light, help 390 dark).
