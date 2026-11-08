# Learnings: Case Desk

One dated bullet per lesson; append, don't rewrite.

- 2026-11-07: The raw-LLM baseline first reported 50/71 "unsupported numbers"; most were numbered list steps
  ("1. Open Settings"). Read the failures by hand before quoting an eval number (eval/RESULTS.md has the honest 17/71).
- 2026-11-07: The seed data sends no renewals, so weekly subscriptions that look active on Saturday read expired on
  Sunday. Demo with annual / cancelled-but-paid-up profiles, or pin the clock (casedesk/clock.py).
- 2026-11-08: Two clocks (frozen demo clock for Adapty state, real time for messages) made the console say "until
  7 Nov" next to a message from 8 Nov. One clock for everything (casedesk/clock.py) fixed it; never call
  datetime.now() directly in app code.
- 2026-11-08: Merging parallel UI branches conflicts mostly in v2/console.view.js and README.md. Keep each branch's
  hook small and clearly marked; resolve by keeping both sides' behaviour, then run pytest + e2e --variant 2/5.
- 2026-11-08: A second local server with --fresh and the default CASEDESK_DB would have wiped the live demo's
  database (both use ./var/casedesk.db in the same folder). Always pass your own CASEDESK_DB.
- 2026-11-08: The MCP server must measure ages with Case Desk's own clock (/api/console/meta server_now), or a demo
  server's fresh grant reads "4 days ago".
- 2026-11-08: The organisers' seed script names real Adapty users lumen_<6-digit random run>_<i>. There is no list
  endpoint, so get the run number from whoever seeded (it is printed), never by guessing against the API.
