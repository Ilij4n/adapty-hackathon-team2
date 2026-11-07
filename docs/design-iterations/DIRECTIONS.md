# Four directions (iteration N = console N + help N)

Each is a starting point, not a pixel spec: the implementer owns the craft, but must keep the direction's layout idea,
type, palette family, density and signature motion so the four stay genuinely different. Hex values are starting
points; tune them for contrast. Fonts are all OFL, with Cyrillic.

| | 1 Statement | 2 Night Shift | 3 Correspondence | 4 Board |
|---|---|---|---|---|
| Stance | the account as a statement: everything on one time spine | the pitch's control room, after dark | a calm mail client for a humane inbox | a Swiss triage board |
| Console layout | queue slips + index left, case = timeline spine and conversation side by side, full width | list, transcript, inspector; approvals in a bottom decision dock | folder rail, index, wide reading pane | lanes across the top, the case as a full-width spread below |
| Type | Source Serif 4 + Source Sans 3 | IBM Plex Sans + IBM Plex Mono | Commissioner (one family) | Geologica + Ubuntu Sans Mono |
| Colour | cool paper, Prussian-blue ink, stamp green | deck navy, amber = needs you, teal = checked | eucalyptus neutrals, deep green, marigold | white, true black, Lumen coral, Lumen blue |
| Density | medium | highest | lowest | compact board, roomy spread |
| Motion | the Approved stamp; the spine draws in when a case opens | changed values flash in reverse video; the dock rises | sections unfold in place | a ticket travels to its new lane |

---

## 1. Statement

**Idea.** A subscription problem is a question about a statement: what was charged, when, by whom, what happened
next. So the case reads like an account statement, with one chronological spine that merges the subscription's own
events (bought, renewed, cancelled, payment failed, access ends, all from the FactSheet dates), the conversation, what
Case Desk did, the validator's check and the grant request. This regroups the case by time instead of by panel.

**Console.** Header: product mark left, live indicator right, no pill row. Left column (about 320px): pending grants
as tear-off slips (a slip has a dashed perforation edge and is the only thing on the page that looks like paper on
paper), then the case index as two-line entries (name and id, time right-aligned in tabular figures; first message;
status in words with a small tone mark). Filters are a short text row ("All 16, Escalated 3, Privacy 1, Waiting 1"),
the active one underlined in ink, not a segmented control. Right: the case fills the rest of the width. Top: name,
language and store in a quiet line, then the status sentence large in Source Serif 4 (the boldness lives here).
Below, two columns: left (~40%) the account spine (a vertical rule with dated entries, store events in ink, Case
Desk's actions marked as Case Desk's, the grant request marked as waiting), right (~60%) the conversation with the
user's messages in ink-blue blocks and Case Desk's replies as serif text with a "Checked against the account" note
under each. "What Case Desk did" stays a heading (the spine section can carry it). The technical record is a
`details.more` titled "Technical record: facts, policy, checks, audit log", whose body is a well-set two-column
statement table (FactSheet on the left, the user's claims beside it so contradictions line up), then the audit log.
**Help.** The status card is a printed receipt: the plan name, price (raw string) and the key dates on a mini spine
(Bought 13 Jul 2026, Access until 13 Jul 2027), a torn bottom edge, the badge as a typeset status line. Case Desk's
replies are serif text on paper (no tail), the user's in Prussian-blue blocks. Actions are full-width statement rows
with an inline SVG arrow-out icon. The grant note becomes a slip that gets an "Approved" stamp when the system
message arrives. Desktop: a light device frame; the picker as a neat index of accounts.
**Fonts.** Source Serif 4 (variable, opsz: display at large optical size, text at small) for statuses, headlines and
Case Desk's replies; Source Sans 3 for UI. Both have Serbian forms.
**Palette.** Paper #F6F7F5 (cool, not cream), sheet #FFFFFF, ink #1B2430, Prussian blue #1D3E66 (accent: actions,
selection, user messages), stamp green #2D6B4A, ochre #8C5A00 (waiting), red #A8322B. Dark: #12161C ground,
#1A2029 sheet, ink #E7EAEE, blue #8FB2E0, green #7CC79E, ochre #E3B25A, red #F08A80.
**Motion.** Approve: the slip receives an "Approved" stamp (scale 1.08 to 1, rotate -4deg, 180ms, ease-out), then
leaves. Opening a case: the spine entries appear top to bottom once (staggered 30ms, opacity + 4px), the only
orchestrated moment. Nothing else moves.

## 2. Night Shift

**Idea.** The deck's world: 2 a.m., a developer on call. A dense, quiet instrument console in the deck's navy, with
the deck's colour meaning: amber is Case Desk's voice and "needs you", teal is "checked, true", coral is "blocked".
Dark is the primary design; light ("day shift") is fully designed too.

**Console.** Full-height app, no page scroll on desktop: three panes. Left (~300px): the case list as dense 2-line rows
(34 to 40px), filters as a compact list header (text buttons with counts, active one in teal). Middle: the transcript
(user messages left-aligned with a thin coral-free neutral marker, Case Desk's replies with an amber rule and a teal
"checked" tick, per-message time in Plex Mono). Right (~360px): the inspector, always visible (no `details.more`):
the plain status sentence large, "What Case Desk did" as a short list, the facts table (Plex Mono values, tabular),
"What the user claims" aligned with the matching facts (a claim that contradicts the facts gets a coral strike),
validator result, approvals, audit log as a compact time grid. Approvals: a decision dock fixed to the bottom of the
viewport, one row per pending grant: who, what, the status line, `Give Ava 3 days of premium` (amber, the brightest
thing on the screen) and Deny, plus the hint. The dock rises when a grant arrives and collapses when none remain.
Keyboard: j/k move through the case list, and the hints shown in the UI must be real. On a phone the panes stack
(list, then case, then inspector) and the dock becomes a bottom sheet that does not cover the page's end (pad it).
**Help.** Lumen at night: the widget on the deck's navy (light mode: a soft dawn grey-blue). The status card is a
compact instrument: the state in words with an amber/teal/coral marker, the facts in two tidy columns. Bubbles are
tight, 16px Plex Sans. Actions are a tray of buttons. Desktop: the phone over a dimmed, blurred still from the deck
(`presentation/present/img/s3.jpg` or similar; copy it into `static/v2/`, keep it under 250 KB, and give it a solid
fallback colour), the picker on a navy panel.
**Fonts.** IBM Plex Sans (UI, prose) + IBM Plex Mono (ids, times, facts values only). IBM Plex Sans Arabic for Arabic if
you have room; otherwise the system Arabic stack.
**Palette.** Dark: page #070B14, panes #0B1324 and #101A30, line #1C2944, text #E8EDF7, muted #9AA7C2, amber #FFA84C,
teal #3FD0C0, coral #FF7A6B. Light: page #EEF1F6, panes #FFFFFF and #F6F8FB, line #D7DEEA, text #0B1324, muted #4A5878,
amber #A35A00, teal #0B7A70, coral #B23A2E.
**Motion.** When a value changes on the live refresh (a status, a grant result, a new message), it flashes once in
reverse video (background = its colour, 600ms, then settles). The dock slides up 220ms when a grant arrives. No hover
lifts.

## 3. Correspondence

**Idea.** Support is correspondence. A calm, airy mail client in the lineage of Things and Front: big humane type, lots
of air, almost no boxes, each case read like a letter, details unfolding in place when asked.

**Console.** Three panes at 1440: a folder rail (~200px) with the 4 filters as folders with counts ("Everything",
"Escalated", "Privacy", "Waiting") and the queue count; the index (~360px) with "Needs your OK" pinned at the top
(the queue items, each a short letter-like note with its Give/Deny row) and then the cases as roomy previews
(name, time, two lines of the first message, state in words); the reading pane fills the rest. Reading pane: a letter
header (name and id large, language and store in a sentence, e.g. "Writes in Serbian. Bought on the App Store."), the
status sentence, the conversation as large comfortable bubbles (17px), then "What Case Desk did" written as short
sentences, then the grant state, then `details.more` "Show the technical record" which unfolds smoothly in place.
Below 1200px the rail folds into the index header; on phones a single column.
**Help.** The friendliest of the four: 17px text, generous bubbles, the status card folded into a sentence under the
header ("Premium ended on 22 Oct. The payment didn't go through.") that unfolds to the full facts; chips wrap onto two
rows rather than scrolling; a large composer. Desktop: the phone frame in soft eucalyptus light; the picker as a
column of correspondents.
**Fonts.** Commissioner (variable, use its flair axis for headings only, a little), one family throughout. Tabular figures
for times.
**Palette.** Ground #EEF2EE, sheet #FBFCFA, ink #1E2A24, secondary #4D5C54, accent deep green #2C6A4F (selection,
primary buttons, user bubbles), marigold #8A5A00 text on #FBEBC4 for "needs you", red #A63A2E. Dark: ground #121814,
sheet #19211C, ink #E6ECE7, accent #8FD0AE, marigold #E8B95A, red #F09086.
**Motion.** Things-like unfolding: the technical record, the help's status card and the steps lists open with a height
transition (grid-template-rows 0fr to 1fr, 220ms ease-out) and their content fades in after. A new message settles in
(opacity + 6px, 180ms). Selecting a case cross-fades the pane (120ms). Nothing else.

## 4. Board

**Idea.** Triage first. No sidebar: the top of the screen is a board of lanes, the work in front of you sorted by what it
needs; the selected case opens as a full-width spread below. Swiss, typographic, black on white, with Lumen's coral as
the single signal for "needs you" and Lumen's blue for selection and links.

**Console.** Top: a strip with the product name and live state. Then the board: four lanes side by side (~260px
tall, each scrolls inside): "Needs your OK" (the queue items with their Give/Deny buttons), "Needs a person"
(escalated), "Privacy", "Answered" (everything else). Lane headers are big numerals plus a word. The 4 `.filt`
buttons sit in a single line above the board (All, Escalated, Privacy, Waiting) and filter which tickets the lanes
show; style them as plain words with a counter, the active one with a 2px underline. Tickets are compact (name and id,
time, one line of state). The spread below fills the width: left 7/12 the conversation, right 5/12 the evidence (a
huge status sentence set in Geologica at 32 to 40px, "What Case Desk did", the grant state, the validator verdict),
and the technical record below the spread as `details.more` "Technical record". On phones: the lanes become a
horizontally scrolling row inside its own container (the page itself must not scroll sideways), the spread stacks.
**Help.** The state as a headline: the status card leads with the badge set big and black ("Ended: the payment didn't
go through"), the facts as a 2-column grid with large figures. Grant: the `.note.grant` is drawn as a 3-step tracker
(Requested, The team reviews, Given) with the first step filled; when the approval system message arrives the
tracker in the latest note completes. Actions are full-width black buttons with white text (and inverted in dark).
Desktop: a minimal device outline (1px), the picker as a typographic list.
**Fonts.** Geologica (variable; use the sharpness axis subtly for the big headlines) + Ubuntu Sans Mono for ids, times
and amounts.
**Palette.** Light: white #FFFFFF, ground #F3F3F1, black #000000 (true black for type at headline sizes), body ink
#16171A, secondary #55575E, coral #E8472B (needs you; check contrast for text, use #C23A1F for small coral text),
blue #2747D9 (selection, links), green #1C7A47. Dark: ground #101216, sheet #171A20, text #F1F1EE, coral #FF7A5C,
blue #8FA6FF, green #6CCF97.
**Motion.** FLIP: when a ticket changes lane (a grant approved moves Ava from "Needs your OK" to "Answered"), it travels
there (transform, 280ms, ease-out); lanes that change count tick their numeral. Selecting a ticket gives it a 2px
black outline instantly (no animation). Nothing else.
