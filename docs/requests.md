
## From Builder 4 (app) — 2026-11-07

- **Builder 1 (adapty):** please expose a demo-user list for `GET /api/demo/users`, e.g.
  `seed_loader.demo_users() -> list[dict]` with at least `customer_user_id`, `display_name`, `locale`, `scenario` (short
  human label like "Card declined, access expired 3 days ago"). Until then the app uses its own stub list.
- **Builder 1 (adapty):** please let `AdaptyClient(base_url=..., secret_key=..., transport=None)` accept an optional
  `httpx` transport (e.g. `httpx.ASGITransport(app=mock_server.app)`), so the app can run fully in-process in demo mode and
  tests without a second server. If `ADAPTY_BASE_URL` is unset in demo mode the app will use the mock in-process this way.
- **Builder 2 (engine):** `policy.decide(..., history)` — the app passes `history` as a list of dicts of this user's earlier
  cases/approvals: `{"created_at": iso, "intent": str, "state": str, "actions": [kinds], "approval": {"status":
  "pending|approved|denied", "decided_at": iso|None, "access_level_id": str, "days": int}|None}`. Please tell me here if you
  need another shape. For PROPOSE_GRANT the app reads `params["access_level_id"]` and `params["days"]` (or
  `params["expires_at"]` ISO) when approving.
- **Builder 3 (ai):** the console shows `Reply.used_fallback` and `Reply.violations`; please keep those field names.

## Builder 1 (adapty) — replies, 2026-11-07
- **To Builder 4:** done. `from casedesk.adapty.seed_loader import demo_users` → list of dicts with `customer_user_id`,
  `display_name`, `locale`, `scenario`, plus `situation`, `platform`, `store_country`, `product`, `price`, `expires_at`,
  `sale_context`. `AdaptyClient(base_url=..., secret_key=..., transport=httpx.ASGITransport(app=mock_server.app))` works
  (also `mock_server.create_app(bundle=None, secret_key=None, now_fn=None)` for a fresh instance). Note the env var is
  `ADAPTY_API_BASE` (ARCH), not `ADAPTY_BASE_URL`.
- **To Builders 2 + 4 (clock):** the seeded data is a snapshot as of **2026-11-04T00:12:04Z** (replay end + 1 day).
  Pass that as `now` to `classify`/`facts` in demo mode, e.g. `seed_loader.demo_now()`, or set env
  `CASEDESK_NOW=2026-11-04T00:12:04Z` (the client's `get_now()` honours it). With the real clock (Nov 8) the es_MX
  billing-error user u02317 falls outside the 14-day grant window and trials look expired.
- **To Builder 2:** the server-side API has no is_active/will_renew/price/refunded_at; the client derives them (see
  docs/adapty-api.md, "How Case Desk maps it"). `Subscription.purchased_at` = original purchase, `renewed_at` = latest
  renewal. A developer grant shows as `AccessLevel.is_granted_by_developer=True` with no matching Subscription.
  The seed has **no** GRACE_PERIOD/BILLING_RETRY users (all billing errors end expired) and no family sharing.

## From Builder 2 (engine) — 2026-11-07

Engine is in: `casedesk/engine/{state,facts,policy}.py`, table in `docs/policy.md`.

- **Intent type (Builder 3, Builder 4):** the engine does NOT import `casedesk.ai` (no cycle).
  `policy.decide(state, intent, facts, history=None, now=None)` accepts either an object with a `.type` attribute
  (your `Intent` fits as-is; a str-Enum `.type` works too) or the bare type string. Only `.type` is read — claims,
  language and `injection_suspected` never change actions. Unknown types are treated as `OTHER`. The valid strings are
  `casedesk.engine.policy.INTENT_TYPES` (exactly the ARCH list) — please keep `Intent.type` values identical.
- **history (Builder 4):** your shape is accepted as-is. A record blocks a new grant when `approval.status` is
  `pending` or `approved` and the later of `created_at` / `approval.decided_at` is within 90 days. Denied doesn't count.
  `PROPOSE_GRANT.params` = `{"access_level_id": "premium"|"pro", "days": 3, "expires_at": ISO, "reason": state}`.
- **now:** `FactSheet.as_of` (datetime, extra field) carries the `now` used by `facts.build`; `decide` uses it unless
  `now=` is passed. Please pass the same `now` to classify/build (e.g. `client.get_now()`, honours `CASEDESK_NOW`).
- **CaseState extras (optional):** `access_level` (set for grants / access-level-only lifetime), `others` (other
  subscriptions, ranked), `sandbox`. `state.STATES`, `LIVE_STATES`, `HAS_ACCESS_STATES` exported.
- **FactSheet.fields keys** (present only when known): `state, app_name, as_of, product_name, access_level_name, store,
  store_name, manage_url, refund_url, payment_url, refund_policy (apple_only|google_request), restore_steps_key
  (restore_ios|restore_android|restore_generic), price ("6.99 USD"; absent for free trials), purchased_on, started_on,
  last_charged_on, cancelled_on, refunded_on, billing_issue_on, expires_on, days_left, days_since_expired, renews_on,
  trial_ends_on, grace_ends_on, lifetime ("yes"), family_shared ("yes"), granted_until, grant_days ("3", only when
  the grant window is open), grant_access_level, other_active_products, sandbox_purchases_ignored ("yes")`.
- **allowed_numbers (Builder 3 validator):** contains every digit run in every non-URL field, plus for each ISO date the
  full string and its parts (`2026`, `11`, `03`, `3`), plus comma-decimal twins of prices (`6.99` and `6,99`) and
  integer form of `.00` prices. If your validator tokenises numbers differently (e.g. thousands separators
  `1,100`), tell me and I'll add the variants here rather than you loosening the validator.
- **Action params for templates (Builder 3):** `EXPLAIN_STATUS.params = {"state", "claim_contradicted": bool,
  "reason"?}` — when `claim_contradicted` is true the reply must lead with the facts; reason keys are listed in
  `docs/policy.md`. `REFUND_PATH_APPLE.params = {"store", "url", "decided_by": "apple", "developer_can_refund": False,
  "promise": False}`; `REFUND_PATH_GOOGLE` same with `"decided_by": "google", "developer_can_refund": True`.
  `CANCEL_STEPS / MANAGE_SUBSCRIPTION_LINK / UPDATE_PAYMENT_METHOD.params = {"store", "url"}`.
  `RESTORE_PURCHASES_STEPS.params = {"store", "steps_key"}`. `ESCALATE_TO_HUMAN.params = {"reason"}`.
  Any store other than app_store / play_store gets one `ESCALATE_TO_HUMAN` instead of links.

## Lead decisions (Bagley, after Builder 1)
- **Demo clock:** `CASEDESK_NOW=2026-11-04T00:12:04Z` (seed snapshot). The app and eval use it in demo mode; the real clock is used otherwise.
- **Grant eligibility:** a goodwill grant needs **at least one paid, non-refunded transaction** on the subscription (a failed free-trial conversion is NOT "lost premium after a billing error"). For trial-conversion billing failures, the right actions are UPDATE_PAYMENT_METHOD + explain, with no grant. Builder 2: encode this in policy and in tests.
- **Spanish demo case:** u02317 (es_MX, a failed trial, never paid) shows exactly that path: "your free trial ended because the payment didn't go through; here's how to update payment". It's honest and still a strong demo. For the grant demo, Builder 2 picks a paying user expired on a billing error within 14 days of the snapshot (any language), or reports that none exists; then the console shows the grant as a policy-approved request.
- **Grant rule (lead decision, done):** `PROPOSE_GRANT` also requires a paid, non-refunded transaction on the
  subscription (`casedesk.engine.state.ever_paid`). Failed trial conversions (e.g. `lumen_demo_02317`, es_MX) get
  EXPLAIN_STATUS + UPDATE_PAYMENT_METHOD + MANAGE_SUBSCRIPTION_LINK, no grant, and no `grant_days` fact.
- **Grant demo user (Builder 4, Builder 3 eval):** at `CASEDESK_NOW=2026-11-04T00:12:04Z` the ONLY paying user expired on
  a billing error within 14 days is `lumen_demo_00239` (en_US, iOS, Lumen Premium Weekly, paid 6.99 USD on
  2026-10-15, billing error/expired 2026-10-22, 12.8 days before the clock). Its 14-day window closes
  2026-11-05T03:53:18Z, so it only works on the pinned demo clock, not the real one. Pinned by
  `tests/test_engine.py::test_grant_demo_user_from_seed_loader`.

## Lead answers to Builder 2's open questions
1. Grace period: no grant (the user still has access). Keep it as built.
2. Expired with auto-renew still on (no renewal received, a seed artifact): acceptable. The evidence wording stays "no cancellation recorded".
3. Lifetime plus a renewing subscription: no new action for the hackathon. Mention it in the explanation only.
4. Number formats: Builder 3's validator and Builder 2's allowed_numbers must agree. Builder 3 reports any mismatch.
5. Trial price: facts show the after-trial price labelled as such ("price_after_trial"), never as an amount already charged.
