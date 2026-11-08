# R1: Solo indie founder, first time in the Case Desk console (Night Shift)

Persona: I run one subscription app on Adapty and answer support myself at night. I'm not a designer and not very technical. I opened `/console` cold.
Setup: my own copy on :8331 (`CASEDESK_DESIGN=2`, LLM=none, fresh seed). Chromium at 1440x900 and 390x844, in both dark and light. Every screenshot cited below is in this folder with the `r1-` prefix.

---

## The first 10 seconds

**What I got right away** (`r1-01-console-desk-dark.png`)
- There's an inbox on the left and an empty reading pane on the right. "Needs a person 3" sits at the top with a tinted band. Isla, Benjamin and Dylan are clearly the ones to look at first. Good.
- The tags on the right ("asked for a person", "privacy request", "tried to give orders") are plain English, and I like them a lot.
- The empty state on the right tells me what I'll see when I pick a case. Fine.

**What confused me**
- **The coloured squares in "Other cases".** Some are grey and filled, some green and hollow, one is red (Camille). There's no legend and no tooltip. I guessed green meant "fine" and red meant "bad", but I still can't tell you what grey means. It's actually the subscription state (active, ended, billing failed), but nothing says so.
- **Where do I approve things?** The pitch says the console is "where you approve courtesy grants". On first load there is no approve button, no "Approvals" heading, nothing. The only clue is the `Waiting 0` tab. "Waiting" for what, and for whom? I read it as "customers waiting for a reply".
- **"Escalated 3" vs "Needs a person 3" vs "Privacy 1".** Those are three names for overlapping things. Benjamin is counted under both Escalated and Privacy. I clicked Privacy expecting a separate pile and got one person who was already in the pile above.
- The "Live 09:31:33" ticking clock in the header looks like a stock ticker. I don't know what it's telling me.
- The `j` / `k` keycaps next to "move" are the first thing in the list header. I'm not a vim person and they mean nothing to me.

---

## Every moment I hesitated

1. **I opened Isla (`r1-03-isla.png`).** The big headline says "Premium is active and renews by itself on 16 Nov". But that isn't the problem. The problem is that *Isla wants a human*. The case headline is about the subscription, and her actual issue sits in a box below it. I read the wrong thing first.
2. **"Nothing here to approve. Reply from your support inbox."** (Isla, Benjamin, Dylan) What support inbox? I thought *this* was my support inbox. Case Desk has told Isla "a person will reply right here" (`r1-03-isla.png`, both bot messages), but there's no reply box in the console. So the bot has made a promise I can't keep from this screen, and I don't know where "here" is. This was the single biggest moment of "wait, what do I do now?"
3. **Dylan (`r1-03-dylan.png`).** The red bullet says "tried to give Case Desk orders", which is good. Then "What Case Desk did" says "Handed it to a person: **they asked for a person**". That reads as if the bot fell for it. It should say why: suspicious message, plus they asked for a human.
4. **The Evidence button (`r1-04-evidence-open.png`).** Clicking it makes the case header reflow (name, then meta on a second row) and squeezes the conversation. Then the panel fills with stuff I can't read (`r1-04-evidence-scrolled.png`): `HUMAN_REQUEST`, `injection_suspected false`, `R8 lumen.monthly: active…`, `ESCALATE_TO_HUMAN reason user_requested_human`, an "Audit log" of key=value soup, and "System modules: Adapty client real / Engine state real / AI intent real". I'm not sure what "real" is reassuring me about. The top half (claims and facts) is useful. The bottom half is a developer debug dump.
5. **"What the user claims" for Isla** says "Earlier question HUMAN_REQUEST / Nothing to check against". It has a raw enum in it, and "Nothing to check against" twice reads like an error.
6. **Camille (`r1-06-camille.png`).** "You said no to 3 days of premium. Camille will see that." **I never said no.** It's seed data, but to a first-timer it looks like the tool acted in my name. It's also phrased as "you said no" while the transcript shows "The Lumen team reviewed the request and didn't add access", which is two different voices for the same event.
7. **The Waiting filter (`r1-07-waiting-empty.png`).** The empty state says "No case is waiting for a grant", which is clear. But the right pane still shows Camille, who isn't in the filtered list. So the list and the pane disagree.
8. **/help opened in Serbian (`r1-10-help.png`).** The default subscriber is Marko (sr-RS), so the phone showed "Lumen pomoć… Opišite problem…". For a few seconds I thought the page was broken. Pick an English-speaking profile as the default for the demo.
9. **In /help, Ava's reply bubble runs off the right edge of the phone (`r1-12-help-ava-reply.png`).** The text touches or clips the bezel ("…ask**ed the**", "…only starts **if**"), and the "Update payment method" / "Manage subscription" buttons are cut off on the right.
10. **Back in the console after Ava (`r1-13-console-after.png`).** The approve tray finally appears, pinned to the bottom with a big orange "Give Ava 3 days of premium" button. That's great once it's there. But **Ava herself is filed under "Other cases"**, below three escalations I can't act on. The one case that needs *my click* is ranked below the ones that don't.
11. **The dates don't agree.** The list says Ava is "now". The tray says "4 Nov". The case header says "Opened 8 Nov 09:33". After approval the banner says "Premium given to Ava until **7 Nov 2026**" (`r1-17-after-approve.png`), while the header clock and "Opened" both say 8 Nov. That reads as **"I just gave her premium that expired yesterday."** I'd honestly think it was broken and email support. (It's the demo clock vs the wall clock, but the console shows both.)
12. **The approve click happened instantly.** There was no confirm and no undo. The tray flipped to "Nothing else waiting", and a toast appeared. Fine for 3 days of premium, but I wanted an "Undo" for at least five seconds.
13. **The toast covers the result chip (`r1-17-after-approve.png`).** "Gave Ava 3 days of premium" sits on top of "Premium given until 7 Nov 202…", which gets clipped.
14. **The tray covers the case (`r1-16-ava-case.png`).** With the tray open, "What Case Desk did" is cut off mid-line ("Sent the link to update payment") behind it. I couldn't see the very thing I was approving, i.e. "Asked you for a 3-day courtesy extension", without scrolling under an overlay.
15. **Mobile (`r1-08-mob-isla.png`, `r1-14-mob-tray.png`).** Tapping a case scrolls me down the page to the case, which is stacked under all 16 list rows. There's no "← Cases" back button. On mobile the approve tray takes about a quarter of the screen permanently and covers the list.
16. **/help after approving (`r1-18-help-ava-after.png`).** The account card updated to "Premium given by the team". But Ava's conversation is gone. The thing that promised "you'll see it here" shows nothing there.

---

## What I expected to find and couldn't

- **A persistent "Approvals" place.** When nothing is waiting, the approve UI simply doesn't exist. I want a section that's always there (e.g. "Needs your OK · 0 · You're all caught up") so I learn where it lives before I need it. Also a history of what I approved or denied.
- **A way to reply to escalated people**, or at least a button such as "Reply in email / Open in Intercom / Copy their email" next to "A person needs to answer this". Right now the escalation is a dead end.
- **A way to mark an escalation done.** Isla will sit in "Needs a person" forever. There's no Resolve / Close / Snooze.
- **A legend for the state squares**, or text labels.
- **Search.** With 16 cases it's fine. With 300 I'd need to find "Ava" or a user ID.
- **A link from the console to /help.** There's a "Lumen Help" link somewhere in the DOM, but I never saw it on screen at 1440. /help links to the console, but not the other way round in any visible spot.
- **Any explanation of what "Checked" means** next to every Case Desk message. I assume "fact-checked against Adapty", but a tooltip would make it a selling point.

---

## What feels unfinished

**Hover states**
- Case rows: the hover is a barely perceptible lift (`r1-02-hover-list.png`, Harry). Against Night Shift's near-black, I could not tell which row I was on without comparing pixels.
- Filter tabs: the hover only slightly brightens the text (`r1-02-hover-filter.png`). There's no underline preview or background.
- Give / Deny: the hover is almost identical to rest (`r1-15-hover-give.png` vs `r1-14-*`). The orange gets a hair darker, and Deny's border gets a hair lighter. The primary action of the whole product deserves a confident hover.
- Evidence button: it barely changes on hover (`r1-04-evidence-hover.png`).

**Focus**
- Keyboard focus on "Give" is a 2px white outline (`r1-15-focus-give.png`). It's visible, which is good. But after toggling Evidence and pressing Tab, focus jumped to `<body>`, and I lost my place (`r1-05-focus.png` shows no focus ring anywhere).

**Contrast and type**
- The grey secondary text is low-contrast on the dark background: "Each claim beside the fact it was checked against", the fact-sheet labels, "Nothing is granted until you approve." (tiny, grey, under the button), "Demo data" in the header, and the dates in the list. That's tough to read at 1am on a laptop at low brightness, which is literally when I'd use this.
- The monospace fact values are truncated with no way to see the full URL (`play.google.com/store/account/subsc…`, `r1-06-camille.png`). There's no tooltip and they aren't clickable.
- Usernames are followed by grey monospace IDs (00185) that look like typos at a glance.

**Light mode**
- Light mode works for the list and case (`r1-01-console-desk-light.png`, `r1-09-light-dylan.png`). But the approve tray stays **dark navy** inside an otherwise white app (`r1-14-light-tray.png`). That looks like a bug, not a choice.

**Copy**
- "Waiting" means waiting for my approval, so call it "Needs your OK".
- "Escalated", "Needs a person" and "A person needs to answer this" are three phrasings of one idea. Pick one.
- "Template used instead of the draft: Yes" and "Reply written by: The checked template" are jargon. I don't know what a draft is here.
- "Code built this FactSheet from the Adapty profile". "Code" as the subject sounds odd, and "FactSheet" is an internal name.
- In Ava's tray, "3 days of premium asked for" is awkward. Try "Case Desk suggests 3 days of premium".

**Spacing and layout**
- The case headline ("Premium is active and renews by itself on 16 Nov") is the biggest text on the page and wraps to two lines at 1440, with tons of empty space to its right.
- On a wide screen with no case open, about 75% of the screen is empty black (`r1-01-console-desk-dark.png`). That space could hold a "Today" summary: X answered automatically, Y need you, Z grants given.

---

## Top 10 fixes, ranked by impact

1. **Put "Needs your OK" at the very top of the case list, above "Needs a person".** Show it even when it's empty ("Needs your OK · 0 · Nothing to approve right now. Courtesy grants Case Desk suggests show up here."). Move Ava out of "Other cases" (`r1-13-console-after.png`). This answers "where's the approve button?" on first load and puts actionable cases first.
2. **Give escalations a real next step.** Replace "Nothing here to approve. Reply from your support inbox." with buttons such as `Reply…` (inline composer that posts into the /help thread, matching the "they'll reply right here" promise), `Copy email`, and `Mark resolved`. Escalations currently have no way to leave the list (`r1-03-isla.png`).
3. **Use one clock.** Use the same "today" for list times, tray date, "Opened", and grant expiry, and drop or relabel the ticking wall clock in demo mode. "Premium given until 7 Nov" shown on "8 Nov" looks like the product is broken (`r1-17-after-approve.png`, `r1-16-ava-case.png`).
4. **Lead each case with the reason it's here, not the subscription state.** Swap the order so the headline is "Isla wants to talk to a person" or "Ava paid, the renewal failed. Case Desk suggests 3 days of premium". Move "Premium is active and renews…" to a smaller status line (`r1-03-isla.png`).
5. **Split Evidence into plain and technical.** Keep "What the user claims" and "Facts the reply may use" visible. Fold "Why the engine chose this state", "Policy actions", "Audit log", "System modules" and the enums (HUMAN_REQUEST, ESCALATE_TO_HUMAN, injection_suspected) behind a "Technical details" disclosure, and translate the enums into words (`r1-04-evidence-scrolled.png`).
6. **Stop the tray from covering the case and the toast from covering the result.** Reserve bottom padding equal to the tray height in the case pane. Move the toast to the top-right, or merge it into the chip (`r1-16-ava-case.png`, `r1-17-after-approve.png`). Add a 5-second "Undo" to the approve/deny toast.
7. **Add a legend for the state squares, or replace them with labels.** For example, a small text pill "Active" / "Ended" / "Payment failed" on each row, or a one-line legend under "Other cases". Then make row hover clearly visible (a background at least 6-8% lighter, plus a left accent bar like the selected state) (`r1-01-*`, `r1-02-hover-list.png`).
8. **Fix the /help phone bubble overflow.** Give message bubbles and link buttons `max-width: 100%` and right padding inside the phone frame, and wrap long URLs (`overflow-wrap:anywhere`). Default the demo to an English profile, not Marko/sr-RS (`r1-12-help-ava-reply.png`, `r1-10-help.png`).
9. **Rename and merge the filters.** Use `All` / `Needs your OK` / `Needs a person` (with Privacy as a sub-tag, not a separate tab). Kill "Escalated" and "Waiting". When a filter hides the open case, clear the pane or show "This case is hidden by the filter" (`r1-07-waiting-empty.png`).
10. **Polish dark mode for 1am use.** Raise secondary text contrast (labels, dates, "Nothing is granted until you approve", "Demo data") to at least WCAG AA. Give Give/Deny/Evidence/filter tabs real hover states. Theme the approve tray for light mode instead of leaving it navy (`r1-14-light-tray.png`). Add a "← Cases" back button on mobile and let the mobile tray collapse to a slim bar ("1 waiting for your OK ▸") (`r1-14-mob-tray.png`, `r1-08-mob-isla.png`).

Honourable mentions:
- Fix Dylan's "Handed it to a person: they asked for a person" so it states the injection reason.
- Fix Camille's seeded "You said no", which reads as the tool acting for me.
- Keep Ava's conversation in /help after the grant.
- Make the fact-sheet links clickable with full-URL tooltips.

---

## What's genuinely good (keep it)
- The plain-English tags on escalations, and "tried to give orders" is funny and clear.
- The approve tray itself: a huge, unambiguous button, "Ava gets premium for 3 days. Nothing else changes.", and "Nothing is granted until you approve." That's exactly the reassurance I need.
- "Every fact in the reply matches the account." with a check mark. It's the trust line, and it could be even bigger.
- /help reflects the grant immediately ("Premium given by the team", `r1-18-help-ava-after.png`).
- Keyboard shortcuts (a / d / j / k / e) are great for power use once I've learned them. Just don't lead with them.
