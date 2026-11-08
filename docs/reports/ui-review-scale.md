# R3: Does Case Desk scale? (head of support, hundreds of tickets a day, 4 agents)

Reviewed 2026-11-08 against a private copy (`/tmp/r3-cd`, port 8333, `CASEDESK_LLM=none`, design v2, seeded).
Load: 301 chats from 260 distinct `lumen_demo_*` users in 42 s (8 parallel, p50 0.96 s, p95 2.0 s, all 200 OK).
Intents: STATUS 84, OTHER 78, CANCEL 34, REFUND 29, RESTORE 26, PAID_NO_ACCESS 25, HUMAN 16, PRIVACY 8, BILLING_FAILED 1.
Only Ava (00239) produced a real pending grant, so I inserted 13 more `pending` approvals straight into my sqlite DB (14 total).
That gave 317 cases in total. Playwright/Chromium at 1440x900 and 390x844. Screenshots are the `r3-*.png` files in this folder.

## Verdict
It's fine for a demo and for one person handling about 50 cases a day. **It doesn't scale to 4 agents and hundreds a day.** The rendering is fast.
The problems are the data model and the workflow:
- a case can't be closed;
- nothing outside the newest 200 can be found;
- there's no search;
- nobody can tell who is working on what;
- the poll re-downloads everything every 3 seconds.

## What scales (measured)
| Thing | Measurement |
|---|---|
| First render, desktop | 0.42 s to the first case row (200 rows, 2,190 DOM nodes) |
| First render, 390 px | 0.26 s |
| Idle CPU | 4 ms of script and 3 ms of layout over 30 s idle. The JSON signature check skips re-rendering when nothing has changed. |
| Full `renderList` | ~23 ms for 200 rows plus a 14-item dock (rebuilds the list every time). Scrolling ran at 61 fps. |
| Scroll position | The list keeps `scrollTop` (4000 before and after a new case arrived) |
| Keyboard | 10 presses of `j` = 2.3 s including the detail fetch. Selection follows, and the URL `?case=` updates so it can be shared. |
| Double-approve safety | `decide_approval` is an atomic `UPDATE … WHERE status IN (pending, failed)`. Agent A pressed `a` on Ava and got "Gave Ava 3 days of premium". Agent B pressed `a` on the same card about 1.5 s later, before B's next poll, and got the toast "Approval is already approved." (r3-11, r3-12). No double grant. 4 concurrent POSTs → all 409, no second grant. |
| Stale-grant safety | Approving an approval whose account has since changed gets refused at click time: "Not eligible any more: the account changed (it is now REFUNDED). Deny the request, or leave it pending." (r3-13) |
| Chat API under burst | 301 chats in 42 s at 8 concurrent, no errors. Per-user limiter of 8/min. |

## What doesn't scale (measured)
1. **Hard cap of 200 cases, with nothing beyond it.** `store.list_cases(limit=200)`; the console has no paging, no "load more" and no search.
   After one 2-minute burst, 117 of 317 cases were unreachable. These included **all 9 privacy/GDPR requests**: the filter showed "Privacy 0" and "No privacy or data requests." (r3-07).
   **4 of 14 pending grants** sat on cases outside the window. They still show in the dock (which polls all approvals), but "Waiting 10" in the list disagrees with "14 waiting for your OK" in the dock.
   At a few hundred tickets a day, anything older than about half a day is invisible. Escalations can silently vanish, and that's a compliance risk for privacy requests.
2. **Escalations never close.** There's no resolve, close, snooze or "replied" state anywhere: not in the API, the store schema or the UI. "Needs a person" is pinned to the top and only grows: 39 after one burst (r3-01), with the 161 other cases pushed under it. They leave only by falling off the 200 window. So the list can't serve as a queue.
3. **Polling payload.** Every 3 s per open tab: `GET /api/cases` (135,876 B, uncompressed, 180 ms server time) plus `GET /api/approvals` (all statuses ever, unbounded).
   - Idle 30 s: 20 requests, **1.39 MB**, so about **167 MB/hour per tab**.
   - No gzip. The same JSON gzips to 7,238 B (19x smaller).
   - `/api/cases` does an N+1: `st.messages(c["id"])` for all 200 cases on every poll, just to get the first message and a count.
   - `/api/approvals` has no limit. After I inserted 6,000 historic decided approvals (about a month at this volume), **one poll was 1.46 MB / 245 ms**. That alone is about 1.75 GB/hour per tab, and the client `JSON.stringify`s all of it every 3 s for the change check.
   - 4 agents polling at once: each poll round took **0.83 s wall** (one sqlite connection behind an RLock serialises everything). That's more than a quarter of the 3 s interval. Chat writes queue behind it.
   - The poll keeps running in hidden tabs. There's no `visibilitychange` pause and no backoff.
4. **No search, no find.** No input of any kind (`has_search_input: false`). Ctrl+F only searches the 200 loaded rows, and messages are truncated to 160 characters. You can't paste a customer id, email or order id from another tool and jump to the case. The only filters are All, Escalated, Privacy and Waiting. There's no filter by state, store, language, intent, age or "mine".
5. **No identity, no "someone is on this".** The console has one shared token, and every audit row has `actor = "console"`. Two agents opened the same Ava card at the same time with no presence hint. When B lost the race, the toast said "Approval is already approved." with no who or when. The 7 s toast is the only trace; the inline `.refused` note was wiped by the next re-render. Afterwards you can't tell which agent gave premium.
6. **Dock with 14 pending.**
   - Desktop: the dock takes the bottom 293 px of the detail pane, about a third of the screen (r3-01). "Also waiting" is a scroll box of about 4 rows (212 px) inside it, ordered oldest first. Times show as `06:06` with no date or age, so you can't see that something has waited 3 hours.
   - "68 days of premium asked for" sums stale ones too: pending approvals never expire, even after the account becomes ineligible.
   - Rows without a display name say "Them gets premium for 3 days" (grammar).
   - The dock's key hint says `j k move`, but j/k move the case list, not the dock.
   - `a`/`d` only work on the big card, which belongs to the open case. Open an escalated case with no grant and `a` does nothing, silently.
7. **Phone (390 px).** The dock is a fixed sheet using 457 of 844 px (54%) once anything is pending (r3-08 to r3-10). The page is 12,041 px tall: all 200 rows stacked above "No case open". Reaching a case's detail means scrolling past every row or using j/k (no keyboard on a phone). Dock rows truncate the days to "3." and "7.". The sheet scrolls and its row list also scrolls inside it (nested scroll).
8. **Raw codes leak at volume.** The escalation box read "Escalated because NO PURCHASE:PAID NO ACCESS." (r3-03). At 25 of these per burst, agents will learn to ignore it.

## Top 10 fixes, ranked by impact for a 4-person team
| # | Fix | Effort |
|---|---|---|
| 1 | **Case status plus a closable queue.** Add `status` (open / waiting_on_customer / resolved) to `cases` and a `POST /api/cases/{id}/resolve`. Add `x` = resolve, and default the list to open cases. "Needs a person" then shrinks instead of growing. | M |
| 2 | **Server-side search and filters.** Add `GET /api/cases?q=&filter=&before=` with q matching customer_user_id, display name and message text (SQLite `LIKE`, FTS5 later). Put a search box above the filters, focused with `/`. Make the filters server-side so Privacy and Escalated count all open cases, not the newest 200. | M |
| 3 | **Paging / "load older" + a virtualised list.** Use a keyset cursor on `(updated_at, id)` with 100 rows per page and "Load older" at the bottom. Virtualise once over about 1,000 rows (render only the visible ±30). Until then, at least show "200 newest of 317" so the cap is visible. | M (virtualisation L) |
| 4 | **Cheap polling.** (a) Wrap the app in `GZipMiddleware` (1 line, 19x). (b) Have the console poll `/api/approvals?status=pending` (the endpoint already supports it), plus failed and recently decided, instead of every approval ever. (c) Replace the N+1 with one `SELECT case_id, MIN(id), COUNT(*) FROM messages GROUP BY case_id` join. (d) Pause polling when `document.hidden`. Later: `?since=updated_at` deltas or SSE. | S for a–d; M for deltas/SSE |
| 5 | **Agent identity in the audit trail.** Give each agent a token or name (even an `X-Agent` header set from a name prompt, kept in localStorage). Record `actor` in the audit, and show "Approved by Mila 09:35" on the case and in B's refusal toast ("Mila approved this 4 s ago"). | S for the name in audit and toast; M for real per-agent tokens |
| 6 | **Presence / claim ("someone is on this").** `POST /api/cases/{id}/claim` with a 2-minute heartbeat. Show an avatar or "Mila is viewing" on the list row and the dock card, add a "Mine" filter, and warn before acting on a case someone else holds. | M |
| 7 | **SLA / age.** Show age ("waiting 3 h 12 m") instead of a bare `06:06` in the dock and list. Colour amber past a target (e.g. 1 h for grants, 4 h for escalations), and add a "sort by oldest unanswered" option. Show the oldest-pending age in the top bar. | S |
| 8 | **Bulk approve with guardrails.** Add checkboxes in "Also waiting" and an "Approve N eligible" button. The server re-runs `eligibility_now` per item and returns per-item results ("9 given, 3 no longer eligible → deny them?"). Cap the batch (e.g. 20) and require a confirm that shows the total premium-days. Also auto-expire or flag pending grants whose account is no longer eligible, so the dock count is honest. | M |
| 9 | **Dock scales.** Collapse to a one-line bar ("14 waiting · oldest 3 h · Review") when no grant case is open. Make `j`/`k` (or `[`/`]`) step through pending approvals when the dock has focus, and fix the misleading hint. Add "next pending" (`n`) to open the case of the next pending grant. On phones, cap the sheet at about 30% of the screen, or show a pill that opens it. | M |
| 10 | **Phone flow.** At under 980 px, show the list or the detail, not both stacked (detail as its own view with a Back button). Show the full "3 days" in dock rows. Translate escalation codes into words (no `NO PURCHASE:PAID NO ACCESS`). | M |

## Doable in under 1 hour before the 14:00 UTC freeze
1. **#4a + #4b: gzip and poll only pending approvals.**
   - `app.add_middleware(GZipMiddleware, minimum_size=1000)` in `main.py`.
   - In `static/console.js` `refresh()`: change `api("/api/approvals")` to fetch `?status=pending` and `?status=failed`. Keep the recently approved ones for the "Premium given" line by also fetching approved ones, or by letting the `decide()` response feed `given`.
   - Cuts a 1.4 MB/30 s idle poll to about 75 KB and removes the unbounded growth. Also add `if (document.hidden) return;` in the interval (#4d). About 20 to 30 min including a check that the dock's green "Premium given" line still works (`renderDock` uses `a.status === "approved"` plus `given`).
2. **#7: age instead of clock time in the dock and list** (front-end only, `console.view.js` `rowItem`/`bigCard`/`timeEl`). Render "3 h 12 m" and add an amber class over 60 min. About 30 min.
3. **#5 (minimal): make the conflict legible and the cap visible.**
   - On the 409, show "Already approved at 09:35 by another agent". The data is there: re-fetch the approval and use `decided_at`.
   - Show the list count as "200 newest of N". N comes from one `SELECT COUNT(*)` added to the `/api/cases` response.
   - Optional: send an `X-Agent` name header into `audit.actor` if someone has 15 spare minutes.

   About 40 min. It doesn't fix the cap, but it stops a missing privacy request from looking like "Privacy 0".

Everything else (status/resolve, search, paging, presence, bulk) is M or larger and shouldn't go in right before a freeze.

## Notes on the test rig
- Pending approvals #2 to #14 were synthetic DB inserts for ineligible users, so approving them hits the eligibility refusal (which is itself a good finding).
- To re-run the 4-concurrent race I reset Ava's approval to pending. All 4 got 409 because the account was already GRANTED_BY_DEVELOPER, so the "Someone else decided" branch wasn't reached live. By code reading it's guarded by the atomic UPDATE.
- The scripts are in `/tmp/r3-scripts/` (load.py, pw1.py, pw2.py). Server stopped. The repo at `/home/agent/work/case-desk` wasn't touched.
