# Case Desk design iterations: implementer brief

Four design iterations of Case Desk's two screens. Iteration N = console N + help N, one coherent design system.
They run in the real app next to the current design:

| URL | What |
|---|---|
| `/console`, `/help` | the current design (v0, unchanged; the reference) |
| `/console?v=N`, `/help?v=N` | iteration N, served from `casedesk/app/static/vN/` |

Worktree: `~/Developer/adapty-hackathon/casedesk-design-iterations` (branch `design/iterations`).

## Who it is for, what must read at a glance

Case Desk is in-app subscription help built on Adapty. A subscriber writes in any language. Plain code reads their Adapty
profile and decides the state, the facts and the allowed actions; Claude only writes the words; a validator blocks any
fact the code did not supply. A courtesy grant ("3 days of premium") is only ever a *request*; the developer approves it.

- **Console** (`/console`): the developer who integrated Adapty. Jobs, in order: (1) approve or deny pending grants,
  (2) triage cases (escalated, privacy, waiting), (3) understand a case: who, their subscription state in plain words,
  the conversation, what Case Desk did, whether the reply was checked, (4) audit: the FactSheet, policy actions,
  validator verdict, the user's claims, approval records, audit log. The demo script says: "the developer sees **the
  facts, the actions policy chose, and the reply the checker passed**. One click on approve, and Ava has premium
  again." All three must be easy to find. Do not surface `sale_context.ab_test` anywhere.
- **Help** (`/help`): the app's subscribers, white-labelled as "Lumen Help" (Lumen is an AI photo editor; logo
  `static/lumen.svg`, coral `#ff6a48` and blue `#5b7bff`/`#8aa2ff` arcs on a dark tile). "Case Desk" never appears to
  end users. Jobs: know what is true on their account, get the exact next step for their store, see what was
  requested and when it changes, reach a person. From 720px wide the widget sits in a phone frame (or another device
  presentation) next to the demo subscriber picker.
- The pitch deck (`presentation/present/deck.html`) is dark navy (#05080f, #0b1324) with amber `#ffa84c` = Case Desk's
  voice / needs you, teal `#3fd0c0` = checked/true, coral `#ff7a6b` = blocked. Display face Bricolage Grotesque, body
  IBM Plex Sans, kickers IBM Plex Mono. Iterations may complement it; only iteration 2 deliberately matches it.

Real data you will see (seeded, 16 cases + live ones): names of 4 to 9 letters with diacritics (Léa, Lucía), 8
languages including Serbian Cyrillic; Arabic (RTL) can arrive live. User messages 9 to 157 chars, replies up to ~500
chars with long unbroken URLs. Prices are raw strings ("66.99 EUR", "MXN 539.99"); never reformat them. Product names
up to "Lumen Pro Annual (AI Studio)".

## What the user said (the console owner)

- Dislikes: em dashes, the quirky "Details (for the curious)" disclosure, the current groupings, the current fonts
  (Bricolage Grotesque, Onest, JetBrains Mono), the cluttered feel, and the case card capped at 760px leaving a gap.
- A previous redesign was **rejected**. Do not hand back any of: system font everywhere; tabs
  Conversation/Facts/Checks/Log; Approve/Deny inside the case card; plain divided list rows; segmented filters;
  uppercase small section labels; fade/slide/shimmer animations.
- Open to more animation and different layout and spacing, if tasteful.

## Hard rules

1. **No em dashes or en dashes** (— –) in any visible copy, titles, aria labels or tooltips. Use a full stop, colon,
   comma or "to". No emoji anywhere. Icons, if any, are inline SVG with a consistent stroke.
2. **Not AI-generic.** No purple/blue gradient washes, no glow, no glassmorphism by default, no everything-in-a-rounded-
   card, no pill soup (badges/tags/chips everywhere), no Inter/Roboto/system-font default, no random accent colours.
   Every colour has a job. Hierarchy comes from type, spacing and alignment first; boxes last.
3. **Fonts are self-hosted** woff2 in `static/vN/fonts/` with an `@font-face` per subset and `unicode-range`
   (latin, latin-ext, cyrillic, cyrillic-ext where the family has them). Get files from Fontsource on jsDelivr, e.g.
   `https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5.1.1/files/ibm-plex-sans-cyrillic-400-normal.woff2` or the
   variable ones `https://cdn.jsdelivr.net/npm/@fontsource-variable/source-serif-4@5.1.1/files/source-serif-4-latin-wght-normal.woff2`
   (check the exact file names with `curl -s https://cdn.jsdelivr.net/npm/@fontsource-variable/<name>@<ver>/files/ | head`
   or `https://data.jsdelivr.com/v1/package/npm/@fontsource/<name>`). Keep the total under ~600 KB per iteration. The
   help widget must render Cyrillic and Arabic; give Arabic a sensible fallback stack (system Arabic is fine).
4. **Light and dark** both designed, via tokens on `:root` redefined in `@media (prefers-color-scheme: dark)`. Text
   contrast WCAG AA (4.5:1 body, 3:1 large and UI). Visible `:focus-visible`. Hit targets at least 40px on touch.
   `prefers-reduced-motion` turns motion off.
5. **Phone 390px (and 360px): no horizontal page scroll.** The console header must not be `position: sticky` below
   980px (it would cover the case it scrolls to). The help widget fills the screen on a phone.
6. **Behaviour stays.** All API calls, polling, approvals, user switching, language switching, RTL (`dir="auto"`),
   safe rendering (`textContent` only; never `innerHTML` with data) keep working. You change how things look and are
   arranged, not what they do.
7. **Only touch your own files**: `casedesk/app/static/vN/**`. Do not edit shared files (`console.js`, `help.js`,
   `i18n.js`, `base.css`, other variants, tests). If you truly need a shared change, describe it in your final report
   instead. **Do not commit** (the orchestrator commits; parallel commits would collide).
8. Never kill or use port 8100 (the user's live demo). Never run the demo without an explicit `CASEDESK_DB` in a
   temp dir: its default is `cwd/var/casedesk.db` and `--fresh` deletes it.

## Architecture: how a variant plugs in

```
casedesk/app/static/vN/
  console.html       full page; links ./tokens + ./console.css; scripts: /static/vN/console.view.js then /static/console.js
  help.html          full page; scripts: /static/i18n.js, /static/vN/help.view.js (optional), /static/help.js
  base.css           this iteration's tokens (light + dark), fonts import, resets, shared bits (.sr-only, [hidden], .btn ...)
  console.css, help.css
  console.view.js    optional but expected: window.CaseDeskConsoleView = (h) => ({ renderList, renderDetail, ... })
  help.view.js       optional: window.CaseDeskHelpView = (h) => ({ paintStatus, addTyping, renderActions, fillProfile, onLang, onUser })
  fonts/             woff2 + fonts.css
```

Links in variant pages keep the variant: the console's home/help links go to `/help?v=N`, the help's console link to
`/console?v=N`, the empty-state link to `/help?v=N`.

**Console view** (`static/console.js`, read it fully). `window.CaseDeskConsoleView` is called once with helpers `h`:
`S` (state: cases, approvals, filter, selected, names, modules, meta), `$`, `el(tag, cls, text)`, `api`, `toast`,
`fmtTime`, `ago`, `day`, `stateLine(state, facts)` (the plain-English status sentence), `actionText(action)`,
`langName`, `nameOf`, `shortId`, `whoEl(cuid, tag)`, `callName`, `realViolations`, `llmErrors`, `reasonText`,
`FILTERS`, `auto` (sets dir=auto), `dot(tone)`, `cap`, `kvTable(obj)`, `sub(title, ...kids)`, `saleEl`,
`grantBox(approval, case)`, `select(caseId)`, `decide(approvalId, "approve"|"deny", button)`, `rerenderList()`,
and `defaults` (the stock `renderList`, `renderDetail`, `renderMeta`, `live`, `toast`). Return any of:
`renderList()`, `renderDetail(d)` where `d = {case, messages, approvals, audit, flags}`, `renderMeta(meta)` (top bar),
`live(text, "ok"|"bad")` (the "updated 12:41" indicator), `toast(text, ms)`, `narrowQuery` (media query below which
selecting a case scrolls to it; default `(max-width: 979px)`). Start from the default functions (copy them into your
view file and change them). You may add keyboard shortcuts or small UI state in your view (only ones that really work).

**Help view** (`static/help.js`): helpers `S`, `t()` (current language strings), `SL` (state labels by language),
`$`, `el`, `fmtDate`, `cardRows(facts)` (label/value pairs for the status card), `initials`, `linkBtn`, `stepsBtn`,
`safeUrl`, `scrollDown`, `ICON_OUT`, `defaults`. Overridable: `paintStatus(st, card)` (draws the status card;
`st.state_badge = {code, label, tone}`, `st.facts`), `addTyping()` (must return `{li, stop()}` and render
`li.msg.bot > .bubble.typing`), `renderActions(li, actions, facts, pendingApproval)`, `fillProfile(button, user)`
(demo picker entries), plus hooks `onLang(lang, strings)` and `onUser(user)`. Most help iterations need only markup
and CSS; override only what the design needs.

## The DOM contract (the e2e test and the screenshot harness rely on it)

Console:
- `#gate`, `#gateForm`, `#tok`, `#gateErr`, `#app`, `#queue`, `#qCount`, `#qEmpty`, `#filters`, `#cases`, `#cCount`,
  `#cEmpty`, `#detail` exist. `#topMeta` and `#live` are optional. A `.top` header is optional; if present it is not
  sticky below 980px.
- Each pending/failed grant: `li.q-item` containing `button.q-open` (opens the case), exactly one `.btn.approve`,
  one `.btn.deny`, and `.hint` with the exact text `Nothing is granted until you approve.` Approve/Deny live only in
  the queue item, never in the case detail (exactly one `.btn.approve` per pending grant on the page).
- `#filters` holds exactly 4 `.filt` buttons (All, Escalated, Privacy, Waiting; `aria-pressed`). Their look and
  placement are yours (not a segmented control).
- Each case in the list: a clickable `.c-item` whose text includes the 5-digit id (via `whoEl`).
- Detail: `.d-head h2` contains the name and id (`whoEl`); a heading whose text contains `What Case Desk did`; a
  heading containing `What the user claims` (in the technical record); user messages as `.turn.user .txt` holding
  the exact message text; the grant as `.grant.<status>` with `.waiting` while pending and `.done` containing
  `Premium given` once approved. If the technical record is a disclosure it must be `details.more > summary` and
  start closed; if it is always visible, render no `details.more` at all.
- Toasts are `.toast` and disappear within 6 s.

Help:
- Ids: `#demoSide`, `#profiles`, `#demoSelectWrap`, `#demoSelect` (visible on phones, used by tests at 390px),
  `#scroller`, `#statusCard`, `#stateBadge` (class attribute exactly `badge <tone>`), `#facts`, `#intro`, `#log`,
  `#chips`, `#composer`, `#msg` (textarea), `#send`. `.w-title` holds the `data-i18n="title"` and
  `data-i18n="subtitle"` texts. Keep every `data-i18n` / `data-i18n-placeholder` attribute of the current page.
- Messages are `li.msg.user|bot|system|error > .bubble` (help.js makes them); chips are `button.chip`; link actions
  `a.act`; step buttons `button.act` + `ol.steps`; notes `.note` and `.note.grant`; the typing row `.typing`.

## How to verify (all must pass before you report)

```
cd ~/Developer/adapty-hackathon/casedesk-design-iterations
uv run python tests/e2e_ui.py --variant N --shots "$TMPDIR/e2e-vN"     # behaviour + DOM contract, must print E2E OK
uv run python tests/design_shots.py --variants N --out "$TMPDIR/shots"  # 26 screenshots, light/dark, 1440/390; 0 problems
```

Look at the screenshots with the Read tool (they are PNGs) and iterate until each one would survive a senior
designer's critique: alignment, rhythm, consistent spacing scale, type hierarchy, no orphaned or clipped text, dark
mode as considered as light, the phone layout designed rather than squeezed. For a live look, run a server on your
own port (8210 + N) with `CASEDESK_DB=$TMPDIR/vN.db uv run python -m casedesk.demo --port 821N --fresh --seed`.

## Your final report (max 300 words)

Direction in two sentences; the fonts and palette you used; what is distinctive in each screen; anything that does not
work or that you would do next; any shared-file change you need. Plain text, no em dashes.

## Read before designing

1. Anthropic's `frontend-design` skill, in full:
   `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md`.
   Follow its process: write a compact token plan (4 to 6 named hex colours, type roles, ASCII wireframe of both
   screens, principles) as a comment block at the top of your `vN/base.css`, review it against the AI clusters it
   lists, revise, then build.
2. `static/console.js`, `static/help.js`, the current `console.html/.css`, `help.html/.css` and `tests/e2e_ui.py`.

## Condensed research checklist (from the frontend-design skill, Vercel Web Interface Guidelines, Refactoring UI, Emil Kowalski on animation, Butterick, Stripe on accessible colour)

- **Spend boldness in one place.** One memorable element per screen; everything else quiet and disciplined.
- **AI tells to avoid**: cream (#F4F1EA) + serif display + terracotta (#D97757); near-black + acid green or vermilion;
  broadsheet hairlines + zero radius + dense newspaper columns; identical rounded cards with one radius and the same
  rgba(0,0,0,.1) shadow; gradient washes; tracked ALL-CAPS eyebrows above every heading; meta strings joined with
  middle dots ("A · B · C": the current console is full of them, replace them with layout); "WORD: fragment" labels;
  #0B0B0B/#111 for black; mono for small data labels; "→" appended to buttons; emoji; one accented word in a heading;
  01/02/03 numbering on things that are not sequences; big-number-small-label stat tiles when numbers are not the point.
- **Type**: one or two families, clearly distinct. A 5-step scale. Console body 13 to 14px, line-height 1.4 to 1.5;
  chat body 16 to 17px, line-height 1.45; measure 45 to 75 characters. Hierarchy from weight and ink colour before
  size; two weights, nothing under 400. Three inks (primary, secondary, tertiary). Sentence case. `tabular-nums` for
  times, amounts, ids in columns. Mono only for literal identifiers and code (`translate="no"`). `text-wrap: balance`
  on headings, `pretty` on paragraphs. Curly quotes, real ellipsis.
- **Colour**: hue the neutrals toward the palette (no #888 greys). One accent: primary action, selection, focus.
  Status colours (ok, waiting, bad) are separate from the accent and always carry a text label, never colour alone.
  No grey text on coloured fills: tint the text. Dark mode is designed, not inverted; elevation is lightness steps.
- **Layout**: separate with space first, then a background step, then a 1px line; a box only for a genuinely separate
  object. Radius follows hierarchy (nested radii concentric). Shadows only on things that float (dock, toast, menu).
  4/8px spacing scale; more space between groups than within. Left-align; numbers right-aligned in columns. Fill the
  available width deliberately (the user disliked the 760px card leaving a gap): either a full-width layout or a
  measured column that is clearly intentional (centred with a reason, or with a second column using the space).
- **Motion**: only in answer to an action or to show a change (a grant resolves, a reply arrives, a case opens). 120 to
  200ms for feedback, under 300ms for enter/exit, ease-out entering; transform and opacity only; never `transition:
  all`; scale from 0.95+, never 0; no ambient loops beyond the typing indicator; nothing on keyboard navigation;
  reduced motion swaps movement for nothing.
- **Copy**: buttons say exactly what happens ("Give Ava 3 days of premium"), the toast reuses the verb. Errors say what
  happened and what to do, without apology. Empty states say what will appear and how. In-progress labels end in "…".
- **States**: design the empty queue, the empty filter, the token gate, "offline, retrying", a failed grant, the
  typing/progress row, the error bubble, a long URL in a reply, an Arabic message, a Serbian Cyrillic conversation.
- **Icons**: one inline-SVG family, `stroke="currentColor"`, ~1.5px at 16px, round joins, `aria-hidden` plus a label.
