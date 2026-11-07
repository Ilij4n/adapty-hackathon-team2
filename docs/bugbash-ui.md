# UI bug bash: /, /help, /console (2026-11-07)

**Scope:** `casedesk/app/static/*` on a local demo (`CASEDESK_LLM=fake`, plus a second instance with `CASEDESK_INLINE_WAIT=0` for the pending/polling path). Checked at widths 360, 390, 430, 768, 1280 and 1600, in light and dark (emulated `prefers-color-scheme`), for all 11 demo users.
**Screenshots:** in `docs/bugbash-ui/NN-name-before.png` / `-after.png`. The "before" shots load the original static files through a Playwright route, so each pair shows the same data.
**Regression checks:** `bugbash_checks()` in `tests/e2e_ui.py` covers 01, 02, 03, 04, 08, 09/10, chip roles and XSS. `python3 tests/e2e_ui.py --dark` passes. (Running it also regenerates `docs/screens/*.png`.)

## Summary
17 UI bugs found and 17 fixed; 0 UI bugs open. Six backend/AI observations are listed at the end for their owners; I did not touch backend code.

| # | Sev | Page | Bug | Status |
|---|-----|------|-----|--------|
| 01 | **High** | /help | If you switch users while a reply is still loading, the old request keeps polling with the **new** user's signature. It gets a 404 and shows "Something went wrong" in the new user's chat, in the new user's language. The old status could also overwrite the new card. | Fixed |
| 02 | Med | /help, /console | Arabic and Hebrew messages are laid out left-to-right, so `!` and `?` land on the wrong side. The composer is also LTR. | Fixed |
| 03 | Med | /help | A Serbian user who writes in Cyrillic gets a Cyrillic reply (`language: "sr-Cyrl"`), but the header, card, chips, action buttons and notes stay in Latin. The page mixes both scripts. | Fixed |
| 04 | Med | /help | The NO_PURCHASE card says "Bought on: Google Play", but nothing was bought. A developer grant shows "Bought on: Lumen (granted by the app team)". | Fixed |
| 05 | Low | /help | The active-trial card shows "Renews on" and hides the days left. It now shows "Trial ends on" and "Days left". | Fixed |
| 06 | Med | /help | On escalation the reply says "a person will get back to you **here**", but the note under it says "…and reply **by email**" (in all 6 languages). | Fixed (note now says "here") |
| 07 | Med | /help ≥720px | The phone is vertically centred against the long list of 11 subscribers. At 768–1280 px the composer starts below the fold, and clicking a lower subscriber scrolls the phone's status card off-screen. | Fixed (phone is sticky, top-aligned) |
| 08 | Med | /help | One failed poll (a network blip) throws away the reply and shows an error. The typed message is also lost when the network is down. | Fixed (≤5 consecutive network misses are tolerated; text is put back in the composer when offline) |
| 09 | Med | /console 360 | The case list scrolls sideways (367 px in a 360 px viewport) because of long sale-context tags. | Fixed |
| 10 | Med | /console <980px | The sticky header wraps to about 200 px. Selecting a case scrolls the detail under it, so the case heading is hidden. | Fixed (header is not sticky below 980 px) |
| 11 | Low | /console 980–1280 | The sticky case list sits at `top: 64px`, but the wrapped header is 86–148 px tall, so the list slides under it. | Fixed (offset follows the measured header height) |
| 12 | Low | /console | `llm_error:…` entries from the composer are counted as validator **violations** and shown in red ("1 violation(s)" on every reply when the LLM is unavailable). | Fixed in the UI (shown as "LLM unavailable"; real violations stay red) |
| 13 | Low | / | The hero caption always reads "the card was declined", even while the Spanish and English demos play. | Fixed (caption follows the demo) |
| 14 | Low | all | The light-theme muted text `--ink-3` (#737a8c) is 3.7–4.3:1 on its backgrounds, below AA for the small labels it is used on. | Fixed (#646b7c: 4.6–5.3:1; dark #8a91a1 ≥4.98:1) |
| 15 | Med (a11y) | /help | Chips have `role="listitem"`, which hides the fact that they are buttons. The aria-live status card is rebuilt every 4 s while an approval is pending (screen readers re-announce it). The avatar letter is read as part of each profile's name ("MMarko"). The radiogroup has 11 tab stops and no arrow keys. | Fixed (no screenshot; checked in the DOM: 0 card mutations in 9 s of polling, one tab stop, arrow keys work) |
| 16 | Low | /help <720px | The picker reads "Demo: Marko (sr_RS, u000…" (truncated), and five "Jake"s can't be told apart. The desktop list shows the locale twice ("Marko (sr_RS, u00009) · sr-RS"). | Fixed ("Marko · 00009") |
| 17 | Low | /help | The intro says "I can see your Lumen **Pro** purchase", even for users with Premium plans or no purchase. | Fixed ("your Lumen purchases") |

## Details

**01 Switch user mid-request (High).** Repro: open `/help` on an `INLINE_WAIT=0` server, send a message, and pick another subscriber while "Checking your account…" is showing. Cause: `send()` read `S.user`/`authQ()` after its awaits. Fix: each conversation gets a generation counter (`S.gen`). `send`, the approval watcher and the status fetch drop any result from an older generation. Selecting a user also clears `busy`. Shots: `01-switch-user-mid-request-*`.

**02 RTL.** Bubbles, the composer and the console's `.c-msg`/`.turn .txt` get `dir="auto"`, and list items use `text-align: start`. Shots: `02-rtl-text-*`.

**03 Serbian Cyrillic.** `i18n.js` now generates an `sr-Cyrl` string table from the Latin one by standard transliteration. Brand and store names (Lumen, Premium, App Store, Apple ID…) stay Latin. `pickLang` maps `sr-Cyrl`, and dates use `Intl` `sr-Cyrl`. Shots: `03-serbian-cyrillic-*`.

**04/05 Status card.** The store row is shown only when there is a product and no developer grant. Trial end now takes priority over renewal. Shots: `04-no-purchase-card-*`, `05-trial-card-*`.

**06 Escalation note.** Shots: `06-escalate-note-*`. Backend owners: confirm "reply here" is the real channel (see B3).

**07 Desktop phone.** Shots: `07-desktop-phone-offscreen-*` (1280×800, last subscriber selected).

**08 Network blip.** Repro: abort the first `GET /api/chat/{id}`. Shots: `08-network-blip-*`. When the server is really down, the error now appears after about 6 failed polls and the message stays in the composer.

**09–12 Console.** Shots: `09-console-360-overflow-*`, `10-console-mobile-header-*`, `11-console-sticky-list-*`, `12-console-llm-error-flag-*`.

**13 / 14 / 16 / 17.** Shots: `13-landing-caption-*`, `14-muted-text-contrast-*`, `16-picker-label-*`, `17-intro-copy-*`.

## Verified OK (no bug)
- **XSS:** `<img src=x onerror=alert(1)>`, `<script>alert(2)</script>`, `"><svg onload=alert(3)>` and `javascript:alert(4)` sent via /help render as text in both /help and /console. There are no `img`/`script` elements in the DOM and no dialog fires. Every render path uses `textContent`. Action links only accept `https://` URLs.
- **Store links:** all 11 users. App Store users get apps.apple.com/account/subscriptions, /billing and reportaproblem.apple.com. Google Play users get play.google.com …/subscriptions, /paymentmethods and /orderhistory. All links have `target=_blank rel="noopener noreferrer"`.
- **Composer:** Enter sends, Shift+Enter adds a newline, and IME composition is respected. A double submit or chip spam produces exactly one send. Emoji work. A 2000-character message or a 1000-character word wraps without horizontal overflow.
- **Approvals:** approving in the console updates /help within about 4 s ("Good news…" plus a green card). Deny shows the neutral note. A double click on Approve/Deny triggers one request, and the button is disabled after the first click. Empty states ("Nothing waiting", "No cases yet") read correctly.
- **Landing:** the 3-script animation loops without overflowing the screen. There is no horizontal overflow at any of the 6 widths in either theme. Links are /help, /console and /.
- **Polling:** the pending → "Checking / Reading / Writing / Almost there" → reply sequence works. The 25 s slow message and 120 s give-up come from the code; I did not wait them out.

## Backend / AI observations (not fixed; owners' modules)
- **B1** (ai.compose): an LLM outage is reported as `llm_error:…` inside `validator.violations`. It is better as its own field (e.g. `llm_error`), so "violations" means only rule breaks. The console now separates them by prefix (bug 12).
- **B2** (ai.intent/compose, fake/none LLM): Arabic and Hebrew messages get a reply in the profile's locale (Serbian/English), not the user's language. This is expected without an LLM, but worth knowing for the demo.
- **B3** (ai.templates): the escalation reply promises "a person will get back to you here", but /help has no way to receive a later human reply (each visit starts empty). Either build that or say "by email". The UI note now matches the reply; change both together.
- **B4** (main.py `phase2`): asking again while a grant is already pending gives no PROPOSE_GRANT action, so the reply shows no "requested" note, although the request is still pending (seen with Ava after a denial and a re-ask). This is arguably by design.
- **B5** (main.py): after a user switch, the abandoned request's phase 2 still finishes and writes its reply to the old case. This is harmless, but the console shows a full conversation that the user never saw.
- **B6** (facts): the card's price is the raw `"66.99 EUR"` string, not locale-formatted (`66,99 €` in sr/de/es/pt/ru). Formatting it in the UI would conflict with "code owns facts" unless facts exposes amount and currency separately.
