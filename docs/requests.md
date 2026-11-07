
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
