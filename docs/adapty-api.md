# Adapty server-side API v2: the contract Case Desk uses

Fetched 2026-11-07 from Adapty's docs. **[DOC]** = stated in the docs (quoted). **[INFERRED]** = our assumption, not in the docs.

Sources:
- Index: https://adapty.io/docs/llms.txt (section "SERVER-SIDE API V2")
- API reference: https://adapty.io/docs/api-adapty.md, full OpenAPI: https://adapty.io/docs/api-specs/adapty-api.yaml
- Get profile: https://adapty.io/docs/api-adapty/operations/getProfile.md
- Grant access level: https://adapty.io/docs/api-adapty/operations/grantAccessLevel.md
- Revoke access level: https://adapty.io/docs/api-adapty/operations/revokeAccessLevel.md
- Auth, headers, rate limits: https://adapty.io/docs/ss-authorization.md
- Objects: https://adapty.io/docs/server-side-api-objects.md
- Backend recipe: https://adapty.io/docs/server-side-api-with-ai.md
- v1→v2 changes: https://adapty.io/docs/migration-guide-to-server-side-api-v2.md

## Base URL and auth [DOC]
- Server: `https://api.adapty.io` ("Production server").
- "API requests must be authenticated by your secret API key as the **Authorization** header with the value
  `Api-Key {your_secret_api_key}`, for example, `Api-Key secret_live_...`."
- User identification by header: `adapty-customer-user-id` ("The unique ID of the customer in your system") or
  `adapty-profile-id`. "Either `adapty-customer-user-id` or `adapty-profile-id` is required."
- Optional `adapty-platform` header (`iOS`, `macOS`, `iPadOS`, `visionOS`, `Android`, `web`), `Content-Type: application/json`.

## Endpoints [DOC]
| Call | Method + path | Body |
|---|---|---|
| Get profile | `GET /api/v2/server-side-api/profile/` | none |
| Grant access level | `POST /api/v2/server-side-api/purchase/profile/grant/access-level/` | `{"access_level_id": "premium", "starts_at"?: ISO, "expires_at"?: ISO}` |
| Revoke access level | `POST /api/v2/server-side-api/purchase/profile/revoke/access-level/` | `{"access_level_id": "premium", "revoke_at"?: ISO}` |

Grant: `access_level_id` is "Paid access level ID configured in the Access Levels page"; `expires_at` "may be in the past
and may be null for lifetime access"; `starts_at` "Maybe in the future". Revoke `revoke_at`: "To revoke access immediately,
either omit this field or set it to null." Grant and revoke both return `200` with a `ProfileResponse` (`{"data": Profile}`);
documented error statuses 400, 401, 404, 500. Grants "will not be reflected in your analytics" and go only to webhooks/Event Feed.

## Profile response (`{"data": {...}}`) [DOC: getProfile OpenAPI schema]
Profile fields (all required): `app_id`, `profile_id`, `customer_user_id`, `total_revenue_usd`, `segment_hash`, `timestamp`,
`custom_attributes` (array of `{key, value}`, value string or number), `access_levels`, `subscriptions`, `non_subscriptions`.

`access_levels[]`: `access_level_id`, `store`, `store_product_id`, `store_base_plan_id`, `store_transaction_id`,
`store_original_transaction_id`, `offer`, `starts_at`, `purchased_at`, `originally_purchased_at`, `expires_at`,
`renewal_cancelled_at`, `billing_issue_detected_at`, `is_in_grace_period`, `cancellation_reason`
(objects page also lists optional `environment`).

`subscriptions[]`: `store`, `store_product_id`, `store_base_plan_id`, `store_transaction_id`,
`store_original_transaction_id`, `offer`, `environment`, `purchased_at`, `originally_purchased_at`, `expires_at`,
`renewal_cancelled_at`, `billing_issue_detected_at`, `is_in_grace_period`, `cancellation_reason`, `commitment`
(App Store 12-month commitment plans only; not used by the seed).

`non_subscriptions[]`: `purchase_id`, `store`, `store_product_id`, `store_base_plan_id`, `store_transaction_id`,
`store_original_transaction_id`, `purchased_at`, `environment`, `is_refund`, `is_consumable`.

`offer`: `{category: introductory|promotional|offer_code|win_back, type: free_trial|pay_as_you_go|pay_up_front, id}`.
`cancellation_reason` values: `voluntarily_cancelled`, `billing_error`, `price_increase`, `product_was_not_available`,
`refund`, `upgraded`, `unknown` (migration guide adds `cancelled_by_developer`, `new_subscription_replace`, `adapty_revoked`).
`store`: "app_store, play_store, stripe, or the name of your custom store".

Key quotes:
- "Unlike the SDK profile, the server-side response has **no `is_active` field**. Derive status yourself from
  `access_levels[].expires_at`: `null` means lifetime access, a future date means active, and a past date means expired.
  Treat `is_in_grace_period` as still active." (server-side-api-with-ai)
- `renewal_cancelled_at`: "The datetime when auto-renewal was turned off for a subscription. The subscription can still
  be active; it just won't auto-renew. Set to `null` if the user reactivates the subscription."
- `billing_issue_detected_at`: "The subscription might still be active. This is cleared if the payment goes through later."

**Not in the getProfile response** (they exist only in request bodies of createProfile / setTransaction): `price`,
`refunded_at`, `renew_status`, `is_family_shared`, `store_country`, `installation_meta` (locale, platform, …),
`is_lifetime`, `will_renew`, `is_active`.

## Errors [DOC]
Shape: `{"errors": [{"source": str|null, "errors": [str]}], "error_code": str, "status_code": int}`.
- 401: `error_code: "not_authenticated"`, message "Authentication credentials were not provided."
- 404 (unknown profile): `error_code: "profile_does_not_exist"`, message "Profile not found".
- 429: "Requests over a limit fail with `429 Too Many Requests`. Retry with backoff, and honor the `Retry-After` header
  when the response carries one." Limit is per API key, a sustained rate (ss-authorization).

## How Case Desk maps it (casedesk/adapty/client.py)
| Model field | From | Status |
|---|---|---|
| `Profile.profile_id`, `customer_user_id` | same names | DOC |
| `custom_attributes` | array `{key,value}` → dict | DOC |
| `sale_context.acquisition_channel` | custom attribute `acquisition_channel` (set by the seed) | DOC field, seed data |
| `sale_context.placement/flow/ab_test` | offline `users.csv.gz` via extras | stand-in (not in Adapty profile) |
| `store_country`, `locale`, `platform` | extras (seed's createProfile payload); platform falls back to store (`app_store`→iOS, `play_store`→Android) | INFERRED source |
| `Subscription.vendor_product_id` | `store_product_id` | DOC (renamed from v1 `vendor_product_id`) |
| `is_active` | `expires_at` null or > now, or `is_in_grace_period`; and not refunded | DOC rule |
| `will_renew` | active and `renewal_cancelled_at` null and `cancellation_reason` null | INFERRED |
| `purchased_at` / `starts_at` | `originally_purchased_at`; `renewed_at` = `purchased_at` when later than the original | INFERRED naming |
| `unsubscribed_at` | `renewal_cancelled_at` | DOC field |
| `is_refund` | `cancellation_reason == "refund"` (subs) / `is_refund` (non-subs) | DOC fields |
| `refunded_at` | `expires_at` of the refunded sub (access ends at refund) | INFERRED |
| `is_sandbox` | `environment == "Sandbox"` | DOC |
| `offer_type` | `offer.type` | DOC |
| `price` | extras price book (local price per product+country from the seed) | not in API; INFERRED source |
| `is_family_shared` | not returned → false | DOC (absent) |
| non-consumable `non_subscriptions` | Subscription with `is_lifetime=True` | INFERRED |
| `AccessLevel.is_lifetime` | `expires_at` null | DOC |
| `AccessLevel.is_granted_by_developer` | `store == "adapty"` or empty `store_transaction_id` | INFERRED (what a grant looks like is not documented) |

Clock: the client derives activity against `CASEDESK_NOW` if set, else real UTC now. The seeded snapshot is as of
2026-11-04T00:12:04Z (replay end 2026-11-03T00:12:04Z + 1 day); demos should set `CASEDESK_NOW` to that
(`seed_loader.demo_now()`).

## Mock (casedesk/adapty/mock_server.py)
Same paths, headers, error shapes. Mock-only behaviour [INFERRED]: a grant replaces the access level with
`store: "adapty"`, empty `store_product_id`/`store_transaction_id`, `purchased_at` = now; revoke sets `expires_at` to
`revoke_at` or now; unknown `access_level_id` → 400 `paid_access_level_does_not_exist`; missing both id headers → 400.

## Seed → profile rules (casedesk/adapty/seed_loader.py) [INFERRED from seed_adapty.py]
- Every seed transaction becomes a setTransaction; per store product the profile shows the latest transaction of its chain.
- `renew_status=false` + `renew_status_changed_at` → `renewal_cancelled_at`; `billing_issue_detected_at` passed through;
  `is_in_grace_period` always false (seed never sends `grace_period_expires_at`).
- Refunds: `expires_at` = `refunded_at`, `cancellation_reason: "refund"`; refunded lifetime → `is_refund: true` and an
  access level expired at the refund time.
- The seed sends no renewals after the replay end: a sub with renew on whose `expires_at` passed before "now" stays expired
  with no cancellation (18 users at the default now: situation `EXPIRED_NO_RENEWAL_SENT`).
- Seed store product IDs are used as-is: iOS `lumen.<key>`, Android `lumen_<key>`; no base plan id.
