# R2: senior product designer review, Case Desk console (Night Shift, v2)

Run: own server on :8332 (`CASEDESK_DB=/tmp/r2.db CASEDESK_LLM=none CASEDESK_DESIGN=2`), killed afterwards. Chromium via Playwright,
1440x900, 1280x800, 1920x1080 and 390x844, dark and light. Grant created through /help (Ava 00239, "I paid but have no premium"),
then approved from the dock. Screenshots in this folder, prefix `r2-` (key ones listed at the end).

## Verdict in one paragraph

The system is good. Type, colour grammar and density are disciplined and it reads like the deck. The one-click moment is the
weak part. When the grant arrives, the amber button lands bottom-left under an empty "No case open" void (at 1920 it sits in the
lower-left corner of a 1590px-wide black field). With no grant pending, the place where approvals will appear does not exist on
desktop (`.dock.is-empty { display: none }`). After the click, the case header still says "Ended: the payment didn't go through"
in coral, the action list still shows an amber "needs you" lamp, and the confirmation (dock line plus toast) disappears within
seconds. Hover is near-invisible: row hover contrast 1.08:1, approve hover is a slight tint change, and there is no `:active` state.
Fix the moment and the states. Leave the system alone.

## Visual hierarchy

- Case view (r2-empty-dark-1440-case, r2-decision-light-1440-caseopen): correct order. Status lamp and label, then the 24px
  condensed readout, the teal verdict, the transcript, and "What Case Desk did". The readout is the boldest thing on the case, as
  intended.
- Decision dock (r2-decision-dark-1440): inside the dock the order is right: amber count, kicker, 24px "Ava 00239 3 days of
  premium", why, what changes, then the 56px amber button. On the page it is wrong. The dock takes the bottom 280px of the case
  pane only, and the area above it is an idle message at 13 to 14px. The eye goes to the amber 3px rule and the button, then
  wanders through empty space. At 1440 with the case open, the dock covers "What Case Desk did", which is one of the three things
  the demo script says the developer must see. Facts, actions and checked reply are not all on one screen any more.
- The list puts "Needs a person" (blue band, 3 rows) above everything. Ava, the one case that needs *you*, sits under "Other
  cases" with a coral lamp and an amber "waiting for your OK" flag. The grouping ranks "a person must answer elsewhere" above
  "you can resolve this with one click". For this product that is backwards.
- The "Writes in / Store / Plan / Opened" meta row is fine at 1440. At 1920 the head grid spreads it thin.

## Typography

- The Plex Sans/Mono split is clean: mono only for ids, times and fact values. The 12/13/14/17/24 scale holds. The wdth 85
  readout is the best typographic moment on the page.
- Mono ids next to sans names (`Ava 00239`) sit visibly lower and look smaller in the 24px dock title because the uid drops to
  14px. Raise to 15px and use `vertical-align: 1px` or baseline-align, otherwise it reads as a footnote.
- Evidence facts table (r2-evidence-dark-1440): 12px mono values against 12px sans labels, 36% label column. It is dense but OK.
  Mono values like "Ended: the payment didn't go through" and "Only Apple refunds" are prose, not literals, which breaks your own
  rule ("Mono: literal values only"). Use `td.plain` for any value that is a sentence.
- The 11px kbd glyphs in the dock-head shortcut hint ("a give d deny j k move") are the smallest text on screen and sit at the
  right edge, where no one looks. It is fine as a power-user hint. Do not shrink it further.
- Times: the list says "now", the dock kicker says "4 Nov", and the case says "Opened 8 Nov 09:32". Three clocks for one event.
  The dock date comes from the seeded clock (`CASEDESK_NOW` 2026-11-04) while the case uses wall time. On stage someone will read
  "4 Nov" as stale. Use one source of time, or drop the dock date and show relative time ("just now").

## Spacing rhythm

- The base rhythm is 4/6/8/10/14/18/20/28 and mostly sensible, but there are too many near-values: row padding 6/7, 9/10,
  `.readout` 18/16, `.sec` 16/18, `.turns` gap 20, `.did-sec` 22/32. Snap to 4/8/12/16/24/32 for a firmer feel: `.readout
  { padding: 16px 0 }`, `.did-sec { margin: 24px var(--gut) 32px }`, `.c-item { padding: 6px 16px 8px }`.
- `.q-item.big { gap: 10px }`. The button row sits 10px below "Nothing else changes", the same as the line spacing above it. Give
  the action a beat: `.q-item.big .grant-row { margin-top: 6px }` (16px total).
- The `.idle` block uses only 62ch of a 1100 to 1590px pane, top-left. Leaving the empty space is fine as long as something
  owns it (see fix 1).

## Colour and contrast

Measured (WCAG 2.x):

| pair | ratio | verdict |
|---|---|---|
| dark ink-3 #7d8ba8 on chrome #0b1324 (12px meta, counts) | 5.41 | AA |
| dark ink-3 on selection #16223d | 4.61 | AA, barely |
| dark ink-3 on person-soft #102238 (escalated rows' time) | 4.69 | AA, barely |
| dock hint #8592ae on #0b1324 (12px "Nothing is granted...") | 5.93 | AA |
| light ink-3 #5b6884 on person-soft #e4eef8 | 4.76 | AA, barely |
| light teal #0a7369 on teal-soft #ddf2ef (grant chip) | 4.91 | AA, barely |
| amber-on #1f1200 on amber #ffa84c (approve) | 9.57 | AAA |
| **control borders: line-2 #2a3a5c on #0b1324 (Deny, Evidence)** | **1.64** | **fails 1.4.11 (3:1)** |
| **light line-2 #bcc7d9 on #fff** | **1.71** | **fails 1.4.11** |
| **row hover #111b31 vs #0b1324 (dark)** | **1.08** | invisible |
| **row hover #eef2f8 vs #f6f8fb (light)** | **1.06** | invisible |
| selection #16223d vs #0b1324 | 1.17 | relies on the 2px ink bar |

Text contrast passes everywhere. The failures are all non-text: secondary button outlines and state backgrounds.
The Deny button's outline nearly vanishes into the dock, so "Give / Deny" reads as one button and a label.

Colour grammar issues:
- The status label "Active, renews automatically" is teal. Teal is meant to mean "checked/true", and the verdict right below it
  is also teal. Two teal lines mean two different things. Use ink-2 for neutral and healthy states and keep teal for the verdict
  and ticks.
- Mobile with nothing pending (r2-empty-dark-390-case): "Nothing waiting for your OK" is set in 17px **amber**. Amber means needs
  you, and nothing does. `.dock.is-empty .dock-head h2` must be ink-2.
- Ava's row: coral lamp (payment failed) plus amber flag. That is correct by the grammar but loud. Keep it, and move the row into a
  top "Waiting for your OK" group (fix 3).
- Light mode: the dock and toast stay night-navy on purpose ("the night strip"). This works and ties the console to the deck.
  Keep it.

## Interaction states (the weak area)

Observed (r2-states-approve-sheet.png: default / hover approve / hover deny / hover q-open; focus approve / focus deny / mousedown):
- Approve hover: #ffa84c to #ffb96d. You can see it if you compare screenshots side by side, not in use. Mousedown looks the same
  as hover (no `:active`).
- Deny hover: the border goes from line-2 to ink-2, which is just visible. Nothing else changes.
- Case row hover: 1.08:1. Effectively nothing (r2-hover-row.png, the Harry row is hovered).
- Filter hover: ink-2 to ink. Subtle but acceptable.
- `.q-open` hover: underline on the name. Good.
- Evidence toggle hover: the border shifts one step. Weak.
- Focus-visible: strong and consistent (2px ink ring, inset on rows). Good. But Tab order reaches the approve button only after
  the top-bar link, 4 filters and all 17 case rows (Tab 24). The `a` shortcut covers this for power users. Add a skip link (fix 9).

Exact replacements:

```css
/* rows: a visible step plus a hint of the selection bar */
@media (hover: hover) {
  .console { --hover: #e6ebf3; }                         /* light: 1.10 vs raised, reads with the bar below */
  @media (prefers-color-scheme: dark) { .console { --hover: #142039; } }
  .c-item:hover { background: var(--hover); box-shadow: inset 2px 0 0 var(--line-2); }
  .c-item.esc:hover { background: color-mix(in srgb, var(--person-soft) 80%, var(--ink) 6%); }
  .c-item:hover .c-msg { color: var(--ink); }

  /* the primary: lift in brightness, ring, and press */
  .btn.approve:hover { background: #ffb766; border-color: #ffb766;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--amber-fill) 28%, transparent); }
  .btn.approve.big:hover { box-shadow: 0 0 0 4px color-mix(in srgb, var(--amber-fill) 24%, transparent); }

  /* secondaries: fill, not just border */
  .btn.deny:hover, .ev-toggle:hover { background: var(--sel); border-color: var(--ink-3); }
  .q-item.row .btn.approve:hover { background: var(--amber-soft); border-color: var(--amber); color: var(--amber); }
  .filt:hover { color: var(--ink); box-shadow: inset 0 -2px 0 var(--line-2); }
  .filt[aria-pressed="true"]:hover { box-shadow: inset 0 -2px 0 var(--teal); }
}
/* press: everywhere, including touch */
.btn:active:not([disabled]) { transform: translateY(1px); }
.btn.approve:active:not([disabled]) { background: #f09634; border-color: #f09634; box-shadow: none; }
.btn.deny:active, .ev-toggle:active { background: var(--line); }
.c-item:active { background: var(--sel); }
.btn { transition: background-color .12s ease-out, border-color .12s ease-out, box-shadow .12s ease-out, transform .06s ease-out; }
/* control outlines that pass 3:1 */
:root { --line-ctl: #8a97b3; }                                       /* light: 3.05:1 on #fff */
@media (prefers-color-scheme: dark) { :root { --line-ctl: #4f6088; } } /* dark: 3.0:1 on #0b1324 */
.dock { --line-ctl: #55678f; }
.btn.deny, .ev-toggle, .btn:not(.approve):not(.primary) { border-color: var(--line-ctl); }
```

## Motion

- Dock rise (220ms translateY) works, but it happens in an empty area, so it reads as a panel opening, not as "something needs
  you". Pair it with fix 1, so the amber thing arrives where the eye already is.
- After the click, five reverse-video flashes fire at once: the "now" chip in the list, the "Lumen team" label, the "Premium given
  until" chip, the dock line "Premium given to Ava until 7 Nov 2026", and the toast (r2-after-approve-0). Each one is tasteful.
  Together they are a scatter. Flash one thing: the grant chip in the case. Drop the list "now" flash when the change came from
  your own click.
- The toast sits over the case content at `bottom: calc(var(--dock-h) + 16px)`. After the dock shrinks it overlaps the grant chip
  it is confirming (r2-after-approve-1). Its lamp is the teal *outline* square, which your grammar defines as "active", not
  "done". Anchor it to the dock, or drop it on desktop, because the dock line already says it.
- The evidence column's `grid-template-columns` transition (200ms) is smooth. The chevron rotate is a nice touch.
- `prefers-reduced-motion` is respected globally. Good.

## The one-click moment

- **Is the approve button where the eye lands?** Partly. It is the brightest thing on screen (good, as principle 2 intends), but
  it is anchored bottom-left under a void. At 1920 it is about 1000px down and 360px across, the farthest point from where people
  read first. With the case open (1440) the dock covers the reasoning you want the audience to see while you click.
- **Is it obvious where approvals appear when none are pending?** No, not on desktop. The dock is `display: none`. The only hint is
  "Waiting 0" in the filter row (ink-3, 13px). On mobile the empty dock shows, but in amber (wrong). The presenter has to say
  "a bar will appear here".
- **After-state**: the case readout keeps coral "Ended: the payment didn't go through" and "Paid, then the App Store couldn't
  take the renewal". "Asked you for a 3-day courtesy extension" keeps its amber lamp. Ava's list row keeps its coral lamp. The
  only lasting proof is a small teal chip "Premium given until 7 Nov 2026 00:12". The demo line "Ava has premium again" has no
  headline on screen.

## Consistency with the deck

The navy values, amber, teal, coral and Plex match. The mark (10px amber square) works. Missing: the deck's big confident display
moment. The console's biggest type is 24px. For the demo, the after-state readout is the place to earn one bigger moment (fix 4),
not the chrome.

## Top 12 fixes, ranked by impact

1. **Give the empty dock a permanent, quiet home on desktop, and let it grow when a grant lands.** Replace
   `.dock.is-empty { display: none; }` (console.css, the `@media (min-width: 980px)` block) with a 44px strip:
   ```css
   .dock.is-empty { display: flex; align-items: center; gap: 12px; padding: 0 var(--gut); min-height: 44px; box-shadow: none; }
   .dock.is-empty .dock-head { padding: 0; }
   .dock.is-empty .dock-head h2 { font-size: var(--t-s); color: var(--ink-2); font-weight: 600; }
   .dock.is-empty .dock-head .keys, .dock.is-empty .q-days { display: none; }
   .dock.is-empty #qEmpty { padding: 0; font-size: var(--t-xs); color: var(--ink-3); }
   .dock.is-empty::before { content: ""; width: 8px; height: 8px; border-radius: 2px; box-shadow: inset 0 0 0 1.5px var(--ink-3); }
   ```
   Keep the 220ms rise from that strip's height (`@keyframes dock-rise { from { transform: translateY(calc(100% - 44px)); } }`).
   Now the presenter can point at it before the grant exists.
2. **When the first grant arrives and no case is open, open its case** (view.js: in the queue render, if `!S.selected && pend.length
   === 1` call `h.select(pend[0].case_id)`). The void above the dock becomes Ava's facts and the checked reply, so the demo script's
   "facts, actions, checked reply, one click" fits on one screen. While a grant is pending, cap the dock so it does not cover the
   case: `.dock { max-height: 34vh }` at 1200px and up, and drop `.q-why` from the big card when the matching case is open
   (`.detail.has-case[data-case=X] ~ .dock .q-why { display:none }`, or toggle a class in view.js). The case readout already says
   why.
3. **Group "Waiting for your OK" at the top of the case list, above "Needs a person".** Same `.c-group` markup with
   `.c-group.amber h3 { color: var(--amber) }`. Mark rows with
   `.c-item.wait { box-shadow: inset 2px 0 0 var(--amber); }` (selection keeps `inset 2px 0 0 var(--ink)` on top). This is the
   job-1 queue and should be first in reading order.
4. **Make the after-state say it.** When the case has an approved grant whose `expires_at` is in the future, override the readout
   (view.js `renderDetail`): `.readout.ok` with label "Premium given by you" and `.ro-line` "Ava has premium until 7 Nov". Keep the
   original state as `.ro-was { font-size: var(--t-s); color: var(--ink-3); text-decoration: line-through; text-decoration-color:
   var(--coral); }` beneath it. In "What Case Desk did", switch the needs-you item's lamp to a teal tick once approved:
   `li.needs.done .lamp { display:none }` and render `.ic` check. Turn Ava's list lamp from `.bad` to `.ok`. This is the line the
   pitch lands on.
5. **Keep the confirmation in the dock until the user moves on.** Do not auto-collapse the `.all-done` dock after `GIVEN_MS`.
   Keep the teal line "Premium given to Ava until 7 Nov 2026" with an Undo-free "Open case" link until the next selection or 20s
   of inactivity. `.dock.all-done { box-shadow: inset 0 3px 0 var(--teal) }` already exists. Use it longer.
6. **Real hover, press and control outlines.** Apply the CSS block in "Interaction states" above. The biggest wins are
   `.c-item:hover` (#142039 plus a line-2 bar), `.btn.approve:hover` (ring `0 0 0 4px` at 24% amber), `.btn:active`
   (translateY(1px), darker amber #f09634), and `--line-ctl` borders so Deny and Evidence pass 3:1.
7. **One flash per decision.** In the approve path, skip `.flash` on the list "now" chip, the dock line and the "Lumen team"
   label. Flash only `.grant.approved` in the case (`--fc: var(--teal); --fc-ink: #04201d`). Remove the desktop toast (or
   `.toast { display:none }` at `min-width: 980px` when `.dock.all-done` is present). On phones, keep the toast but anchor it at
   `bottom: calc(var(--dock-h) + 12px); left: 16px; right: 16px; translate: none;` and give it a solid teal check, not the
   outline lamp.
8. **Fix the empty-dock colour on phones.** `.dock.is-empty .dock-head h2, .dock.all-done .dock-head h2 { color: var(--ink-2); }`
   Amber must only appear when something actually waits.
9. **Get the approve button into the keyboard path.** Add a skip link as the first element in `<body>`:
   `<a class="skip sr-only-focusable" href="#queue">Go to approvals (1)</a>` with
   `.skip:focus-visible { position: fixed; top: 8px; left: 8px; z-index: 50; padding: 8px 12px; background: var(--amber-fill);
   color: var(--amber-on); border-radius: var(--r-ctl); }`. Today the approve button is Tab stop 24.
10. **Keep teal for "checked" only.** `.readout.ok .ro-label { color: var(--ink-2) }`, and `.lamp.ok` keeps its teal outline as
    the only "active" cue. `.verdict` stays teal. Each colour then has one job, as the token comment promises.
11. **Center the decision card's content and align it to the case column.** At 1920 the card's content hugs the left of a 1590px
    dock. Use `.q-item.big, .dock-head { max-width: 1040px; }` and put the keys hint inline after the title
    (`.dock-head .keys { margin-left: 16px }`), so the eye path is title, button, hint in one 600px column. Also raise the uid in
    the big title: `.big .q-l1 .uid { font-size: 15px; }`.
12. **One clock.** The dock kicker's `.t` shows "4 Nov" (seed clock) next to a case opened "8 Nov 09:32" and a list "now". Render
    the dock time with the same `ago()` as the list ("just now", "2 min ago"), or hide it: `.q-kick .t { display:none }`. On stage,
    a date that looks four days old reads as a bug.

Smaller notes, not ranked: put prose fact values (State, Refunds, Restore steps) in `td.plain` sans. Snap spacing to the 4/8
grid (see Spacing). On the escalated panel ("A person needs to answer this", r2-empty-dark-1440-case) the blue `.person-note` is
well done and clearly not amber. Its 17px title competes with the 24px readout above it. Drop it to `var(--t-m)` 600 so the
readout keeps the boldness. The Evidence toggle at 1440 (r2-evidence-dark-1440) gives a good dense audit pane, but the dock
overlaps its bottom. Fix 2's `max-height: 34vh` solves both.

## Key screenshots

- r2-empty-dark-1440-idle.png, r2-empty-dark-1920-idle.png: nothing pending, no sign of where approvals appear
- r2-empty-dark-390-case.png: phone, amber "Nothing waiting for your OK"
- r2-empty-dark-1440-case.png / r2-empty-light-1440-case.png: the escalated panel (Isla)
- r2-decision-dark-1440.png, r2-decision-dark-1920.png, r2-decision-dark-1280.png, r2-decision-dark-390.png: the grant arrives
- r2-decision-light-1440-caseopen.png: the dock covers "What Case Desk did"
- r2-evidence-dark-1440.png / r2-evidence-light-1440.png: the Evidence column open
- r2-states-approve-sheet.png: default / hover / deny hover / q-open hover / focus / mousedown
- r2-hover-row.png, r2-hover-filter.png, r2-hover-evtoggle-dark.png: weak hovers
- r2-focus-NN.png: Tab walk (approve = stop 24)
- r2-after-approve-0.png, -1.png: flashes plus the toast overlapping the grant chip
- r2-after-approve-settled.png: the readout still coral "Ended" after the grant
- r2-help-after-send.png, r2-help-after-approve.png: subscriber side
