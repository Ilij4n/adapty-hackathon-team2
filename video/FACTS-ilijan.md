# Fact-check: Ilijan's pitch points (Case Desk demo video)
Checked 2026-11-07 (all URLs fetched today unless a date says otherwise). Prior research reused from
/workspace/.bagley/scratch/adapty/research/contest/research/R2-R4 (cited as R4.F7 etc.).
Raw App Store review dump: ./appstore-reviews-raw-2026-11-07.txt (script: ./rev_scan.py, Apple's public
customer-reviews RSS, US store, newest first, 1-2 star reviews matching billing/support keywords).

---------------------------------------------------------------------------------------------------
## 1. "Developers don't raise it with Adapty, Adapty may not know, but the problem exists"
Verdict: PARTLY. The problem and the routing to developers are solidly proven. "Developers don't tell
their vendor / Adapty doesn't know" is NOT provable either way, and there is counter-evidence: developers
do post charged-but-locked problems on vendor forums, and Adapty already sells a product built on refund
requests (Refund Saver). Pitch the problem, not Adapty's ignorance.

Real subscriber reviews (App Store, 1 star). Source for all: Apple customer-reviews RSS
`https://itunes.apple.com/us/rss/customerreviews/page=N/id=<APPID>/sortby=mostrecent/json`; app page
`https://apps.apple.com/us/app/id<APPID>`. Reviews have no permalinks and roll off the feed; dump saved.
- Noom (id 634598719), 2026-11-04, title "Still Got Charged After Canceling Subscription":
  "I cancelled on the app, and confirmed it, but it still tried to charge me after. Disappointing."
- Calm (id 571800810), 2026-10-07, title "Paid for premium subscription, did not receive premium content":
  "I was charged for a premium subscription back in May/June. It is now October, and I still have yet to
  be able to access the features that I paid approximately $85 for. Neither tech support for Calm nor
  Apple have been of any help."
- Calm, 2026-10-16, title "Frustrated": "I paid for the year and I can't login in anymore. I reached out
  to customer service and no reply email for 2.5 weeks."
- Feeld (id 887914690; an Adapty customer, case study https://adapty.io/case-studies/feeld/ "Feeld doubled
  revenue with paywall A/B testing"), 2026-08-11, "Worst support I've ever seen": "I purchased a 90-day
  Majestic membership for $49.99 and immediately afterward was unable to access the service I had just
  paid for." ... "received an automated response saying it would take 7+ days for a human to review".
  (Cause there was an account ban, not a billing bug - use only as "paid, locked out, no human".)
- Feeld, 2026-09-14, "Pay to play.": "I asked for a refund ... They sent me to apple, Apple refuses."
- Lensa AI (id 1436732536), 2026-01-19, "SCAM": "I canceled within time and they still charged me and now
  will not refund"
- Flo (id 1038369065), 2026-10-26, "An app that steals": "I canceled account months ago and am still
  receiving charges."
- Noom, 2026-07-01: "I cancelled my trial subscription within the allotted time and was still charged
  over $100."
Caveat: these are the customers' claims; some "charged after cancelling" cases are really renewals
inside the period already paid, or trial 24-hour rules. That is exactly what Case Desk explains.

Stores route these customers to the developer:
- Apple, "If you can't find or use your Apple In-App Purchases" (https://support.apple.com/en-gb/108096,
  published 2026-10-06): "If you were charged for the purchase and you still can't restore it, contact
  the app developer for support."
- Google Play Help, "Request a refund on Google Play" (https://support.google.com/googleplay/answer/15574897):
  "You should contact the app developer if:" ... "You made an in-app purchase but it wasn't delivered or
  isn't working as you expected." / "You want a refund and it's been more than 48 hours since you made
  the purchase."
- Scale (prior research R4.F5): ACCC counted 44,156 App Store + 53,594 Google Play 1-2 star reviews
  mentioning subscriptions (2020 sample of top apps; keyword counts, not verified billing complaints).
  https://www.accc.gov.au/system/files/Digital%20platform%20services%20inquiry%20-%20March%202021%20interim%20report.pdf

Do developers raise it with their vendor?
- Yes, sometimes, on public forums: RevenueCat Community, "Customers being charged but purchase does not
  show up in RevenueCat" (Jul 22 2021): "A common issue in my app has been that ..." "The purchase does
  not reach RevenueCat." Staff reply: no single error code or guaranteed way to detect charged-without-
  entitlement. https://community.revenuecat.com/sdks-51/customers-being-charged-but-purchase-does-not-show-up-in-revenuecat-150
- No source found on how often Adapty's customers report end-user complaints to Adapty. Unknown, not "no".

Narration:
- "Subscribers write it in their reviews: 'I cancelled, and it still charged me.' 'I paid for premium
  and never got it.' And Apple and Google both tell them the same thing: contact the developer."
- "That lands on a small team with a dashboard and no time. Case Desk answers it for them."

---------------------------------------------------------------------------------------------------
## 2. "RevenueCat has this - proof the problem exists; we can do better"
Verdict: HOLDS (problem validated by RC's investment) but "RC has this" means pieces, not the same
product. RC has a self-serve menu, a ticket form that emails you, helpdesk sidebars, and a team-side
AI (Rico) that can look up a customer and grant access with approval. No documented subscriber-facing
AI that reads the ticket and answers it.

What RevenueCat ships:
- Customer Center (https://www.revenuecat.com/docs/tools/customer-center): "Customer Center is available
  on Pro and Enterprise plans." Docs cover iOS and Android. A configurable fixed menu: cancel, restore,
  contact support, deeplinks, request refund (iOS only), change plan (iOS only), currency balances; plus
  cancellation/refund surveys with predefined answers and retention promo offers.
- In-app tickets (https://www.revenuecat.com/docs/tools/customer-center/customer-center-configuration):
  "Customers enter their email address and a description of their issue; both are required." "RevenueCat
  then sends the ticket to your support email, routing it through RevenueCat's servers so it can include
  additional customer details." Needs RevenueCatUI iOS >=5.49.0 / Android >=9.15.0. Default config
  localized to 32 languages (menu strings). No AI or auto-reply mentioned anywhere on the page.
- Rico (https://www.revenuecat.com/docs/tools/rico): "Rico is RevenueCat's AI-powered app growth advisor."
  It "lives inside your RevenueCat dashboard and in Slack". It can "Search by user ID to retrieve
  subscription status, purchase history, billing issues" (useful for diagnosing support tickets) and,
  with approval, grant access to specific customers: "Every write action goes through an explicit
  approval step before anything changes." So Rico is mainly growth/analytics, with a support-lookup
  feature, used by the team, not by subscribers. Price/plan not stated on the page.
- Zendesk and Intercom sidebars (https://www.revenuecat.com/docs/integrations/customer-support/zendesk ,
  https://www.revenuecat.com/docs/integrations/customer-support/intercom): show the agent customer
  overview, subscriptions, purchases, custom attributes; match by ID in ticket text, email, or manual
  search. Actions: "View in RevenueCat", copy, link profile. Neither doc mentions grant/refund actions or AI.

Where Case Desk goes further (gap supported by the docs above):
- Answers the subscriber directly, in the app, in their own words and language. RC's ticket goes to an
  email inbox; Rico talks only to the team. [supported]
- Explains WHY with dates from the profile ("you cancelled on X, the period you paid for runs to Y").
  RC's sidebar shows data to an agent who writes the answer. [supported]
- Grants as requests from the conversation, bounded by the developer's policy, one-click approve.
  [CAREFUL: Rico also requires approval for grants. The difference is where it starts (the
  subscriber's ticket) and the policy limit, not "approval" itself.]
- Code decides the facts, a validator blocks claims not in the profile, injected instructions in a
  ticket are ignored. [our feature; RC docs say nothing either way, so don't claim RC lacks it]
- Multilingual replies: Rico's language support is undocumented (R3.U1). Don't claim RC can't.

Narration:
- "RevenueCat already built a support menu and helpdesk sidebars. That tells you the problem is real.
  But there, a human still reads the ticket and writes the answer."
- "Case Desk reads the subscriber's message, checks their real Adapty profile, and answers with the
  facts, in their language. Anything that costs money waits for one click from the developer."

---------------------------------------------------------------------------------------------------
## 3. "Sell it as a premium paid add-on"
Verdict: HOLDS. Adapty has two plans and already sells six add-ons on its pricing page, each priced
as a share of revenue/spend. A support add-on fits that model exactly; Refund Saver is the closest
analogue (also money-protection, also per-customer, 0.2%).

- https://adapty.io/pricing/ : Pro = "Free" "While you earn under $5K/month", "Add-ons included", then
  "1%" "Of monthly tracked revenue after you pass $5K/month". Pro lists purchase infrastructure, flow &
  paywall builder, A/B tests, revenue analytics. Enterprise = "Custom pricing" (24/7 support in your
  Slack, dedicated success manager, custom data exports, custom contract and SLAs, US/EU data residency).
- Same page, section "Go further with add-ons": Refund Saver "0.2% of monthly revenue" (Free up to
  $5K/month); Ads Manager "3.5% of monthly ad spend" (Free up to $5K/month); Attribution "Custom pricing"
  (Free up to $5K/month); Adapty Finance "From 2.5% per advance"; Adapty Mail "20% of extra revenue";
  App Growth Team "Custom pricing" ("paid add-on").
- Site footer: "Pricing: free until $5K/month, then 1% of revenue".
- RevenueCat for comparison (https://www.revenuecat.com/pricing/): Pro free up to $2,500 MTR, then 1% of
  MTR; Enterprise custom. Customer Center is Pro/Enterprise.
- Intercom Fin (https://www.intercom.com/pricing): "Fin is priced at $0.99 per outcome"; an outcome is
  when the customer confirms resolution, doesn't ask for more help after Fin responds, or Fin completes
  a workflow; "You're only charged once per conversation".
- Pricing idea to pitch (ours, not sourced): follow the Refund Saver pattern, free under $5K/month then a
  small % of revenue, or per resolved case (Fin anchors $0.99).

Narration:
- "Adapty already sells add-ons like Refund Saver, free for small apps and a small share of revenue
  after that. Case Desk fits right next to it."

---------------------------------------------------------------------------------------------------
## 4. "Observability: Adapty doesn't collect much data about these customer problems"
Verdict: OVERSTATED as worded. Adapty sees the money side in detail: every transaction, cancellation,
billing issue, grace period and refund, per profile, plus refund requests through Refund Saver. What it
does not get is the customer's complaint itself: what they wrote, what they think happened, and which
cases were resolved and how. The defensible line is narrower.

What Adapty DOES see (supported):
- Per-profile event timeline (https://adapty.io/docs/profiles-crm): "View the user's event timeline,
  including billing issues, grace periods, and other events." Adapty "automatically collects user events
  from the payment queue and displays them in the user profile". Manual grants: "Granting access does
  not create App Store or Google Play purchase events."
- 20 event types (https://adapty.io/docs/events): subscription_started/renewed/renewal_cancelled/
  expired/refunded, trial_*, entered_grace_period, billing_issue_detected, access_level_updated, etc.
- Refund requests (https://adapty.io/docs/refund-saver): "When a user initiates a refund request, the
  store sends a notification asking for transaction and usage details." Dashboard shows "Refunds
  requested" and "Win rate". So Adapty already gets one end-user complaint signal: the refund request.
- Refund analytics by paywall, placement, A/B test, country (R3.F5: https://adapty.io/docs/refund-events).

What Adapty does NOT document (supported as "not in docs", not proven absent):
- No event for failed purchase, purchase error, or dismissed purchase sheet in the event list; nor any
  "complaint/support" event (https://adapty.io/docs/events).
- SDK purchase errors (e.g. productPurchaseFailed, code 1006) are returned to the app; verbose logs print
  to the device console via setLogLevel (https://adapty.io/docs/error-handling-on-flutter-react-native-unity).
  I found no doc saying these errors are sent to Adapty analytics. [uncertain: internal telemetry unknown]
- Refund Saver docs don't say Adapty sees the customer's refund reason or text.
- Adapty "Refund Reason" dimension is store codes like "Refund"/"Upgraded", not what the customer said
  (R3.F6, https://adapty.io/docs/controls-filters-grouping-compare-proceeds).
- No source found that end users' support issues reach Adapty through any channel. Adapty's support is
  for its developer customers (not explicitly stated in docs; inference).

Is "every Case Desk ticket is a labelled signal Adapty doesn't get today" defensible? YES, if phrased as
the complaint text + its category + the outcome (explained / granted / escalated), linked to the profile.
Adapty has the transactions but not the subscriber's words or the resolution. Do NOT say "Adapty has
little data about these customers"; it has their full billing history.

Narration:
- "Adapty already knows every charge, renewal and refund. What it never sees is the complaint: what the
  subscriber said, and what fixed it. Every Case Desk ticket adds that, with a label."
- "Across thousands of apps, that shows Adapty which billing confusion is common before anyone files a bug."
