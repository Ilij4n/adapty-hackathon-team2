# Bug-bash: backend, API, security, data — 2026-11-07

Scope: `casedesk/app/*.py`, `casedesk/engine/*`, `casedesk/adapty/*`. Tested against a local demo instance
(`CASEDESK_LLM=none python3 -m casedesk.demo --port 8150 --fresh`, own DB in /tmp) and in-process with FastAPI TestClient.
The live instance was not touched. Regression tests: `tests/test_bugbash_backend.py` (13 tests).

## 1. Whole population run

| run | volume | result |
|---|---|---|
| engine + compose (templates) + validator, every user x every intent type, in the user's language and in en | 5,000 users, 63,296 pipelines | 0 exceptions, 0 validator violations, first action always EXPLAIN_STATUS, PROPOSE_GRANT only for lumen_demo_00239 (4 intents) |
| fact check against the raw Adapty JSON (store, expires_on, days_left, price, purchased_on, cancelled_on, live vs inactive state, allowed_numbers covers every fact number) | 5,000 users | 0 mismatches (after fix B1) |
| full HTTP pipeline `POST /api/chat`, one free-text message per user from 18 messages in en / sr (Latin + Cyrillic) / es | 5,000 requests | 5,000 x 200, all `reply_status: ready`, state badge always a known code with a label, detected language = message language in all 5,000, one pending approval (00239) |
| same engine run with `CASEDESK_NOW` unset (real clock, 2026-11-07) | 63,296 pipelines | 0 exceptions, 0 violations, 0 grants (expected: the 00239 window closed 11-05) |

States at the demo clock: NO_PURCHASE 3,607, ACTIVE_RENEWING 539, EXPIRED_CANCELLED 534, CANCELLED_PAID_UP 125,
LIFETIME 63, REFUNDED 58, EXPIRED_BILLING_ERROR 50, TRIAL_ACTIVE 15, TRIAL_CANCELLED 9.
Locales in the seed: en 2,088, hi 475, pt 435, de 380, es 305, fr 264, pl 251, ja 242, tr 194, sr 187, nl 90, sv 89.

Hand spot-check: 30 random users (26 with purchases, 4 without), raw subscription rows next to the FactSheet. Dates,
prices (incl. JPY with no decimals, INR, BRL, MXN), store, days_left and state were all right, except the
never-charged trials below (B1, B2).

## Bugs

| id | sev | area | bug | status |
|---|---|---|---|---|
| B1 | medium | engine/policy | Expired free trial cancelled before converting (never charged; 404 users) + CHARGED_AFTER_CANCEL gave reason `charged_before_cancel`, so the reply said "The last charge happened before you cancelled". There was no charge. | fixed |
| B2 | medium | engine/facts | The client maps the catalog price onto trials, so never-charged trials (442 users: expired trials, failed conversions such as 02317, cancelled trials) had a `price` fact that reads as an amount paid. Lead decision 5 says it must be `price_after_trial`. | fixed |
| B3 | medium | app | A lone UTF-16 surrogate in the JSON body (`"\ud800"` in message or customer_user_id) returned 500 before auth. The 422 handler echoed the input and could not encode it. The default 422 also echoed a 50k message back in full. | fixed |
| B4 | medium | app/auth | A non-ASCII signature returned 500 before auth (`hmac.compare_digest` raises TypeError on non-ASCII str). | fixed |
| B5 | medium | app | A non-ASCII customer_user_id with a valid signature returned 500: httpx cannot put it in the `adapty-customer-user-id` header. CR/LF in the id would be refused by a real HTTP transport the same way. | fixed |
| B6 | medium | app | Adapty profile fetch failing (5xx/429 after retries, 401 bad key, network) returned a bare 500 from `/api/chat` and `/api/status`. | fixed |
| B7 | low | app | `GET /api/chat/99999999999999999999999` returned 500 (sqlite OverflowError). | fixed |
| B8 | low | app/store | A race between "reuse the pending approval" and "create one" in phase 2: two concurrent chats from one user could both create a pending grant, and both could be approved. That bypasses once-per-90-days. | fixed |
| B9 | low | app | If the server restarts while a reply is pending (slow LLM), the message stays `pending` in the DB and the widget polls forever. | fixed |
| B10 | low | app | A malformed `CASEDESK_NOW` made every chat/status return 500 while the app looked healthy. | fixed |

### Repros and fixes

- **B1.** Repro: `lumen_demo_00540` (trial 2026-10-08, cancelled 10-09, expired 10-11) sends "I was charged after I
  cancelled". Before the fix, actions were `EXPLAIN_STATUS{reason: charged_before_cancel}`.
  Fix: `policy.decide`. When the primary subscription has no charge (`last_charge_at is None`), the reason is
  `no_charge_on_account`. That template already exists in every language ("I don't see any subscription charge on
  this account"). Added to the reason table in docs/policy.md.
  Test: `test_never_charged_trial_is_not_told_last_charge_was_before_cancel`.
- **B2.** Repro: FactSheet of 00540 had `price: 6.99 USD`, and of 02317 (never paid) `price: 75.99 MXN`.
  Fix: `facts.build`. A never-charged trial gets `price_after_trial`. Only TRIAL_ACTIVE also keeps `price`, because its
  "then it costs X" templates use it. The AI tester's new templates already use `{price_after_trial}`.
  Test: `test_never_charged_trial_price_is_labelled_after_trial`.
- **B3.** Repro: `POST /api/chat` with raw body `{"customer_user_id":"a\ud800","signature":"ab","message":"x"}` → 500.
  Fix: a `RequestValidationError` handler that returns `{"detail":[{loc,msg,type}]}` without `input`.
  Test: `test_validation_error_does_not_echo_input`.
- **B4/B5.** Repro: signature `"é"*64` → 500; customer_user_id `lumen_ü`, correctly signed → 500.
  Fix: `auth.valid_user_id()` accepts printable ASCII only. `check_user` and `verify` reject anything else with 401,
  and `verify` refuses non-ASCII signatures. Test: `test_non_ascii_user_id_or_signature_is_401_not_500`.
- **B6.** Fix: `load_profile` turns any Adapty error into 503 "We can't reach your account details right now — please
  try again in a minute." It never falls back to a fake NO_PURCHASE status. Test: `test_adapty_profile_failure_is_503`.
- **B7.** Fix: path param bounded `1 ≤ message_id ≤ 2^63-1` → 422. Test: `test_poll_with_out_of_range_id_is_422`.
- **B8.** Repro needed a widened window (12 threads calling the old check-then-create with a 20 ms delay → several
  pending approvals). Live, 6 concurrent chats against :8150 produced one approval because the window is small.
  Fix: `Store.create_approval_once()` does the check and the insert under the store lock.
  Test: `test_pending_approval_is_created_once_under_concurrency`.
- **B9.** Fix: when polling an assistant message that is `pending`, has no worker task in this process, and is older
  than 20 s, it is marked `error` with "please send your message again". Note: this assumes one server process,
  which is how the demo runs. Tests: `test_orphaned_pending_reply_is_reported_after_restart`,
  `test_fresh_pending_reply_still_pending`.
- **B10.** Fix: lifespan checks the clock at startup and fails with `CASEDESK_NOW is not an ISO date-time: '…'`.
  Test: `test_malformed_casedesk_now_fails_at_startup`.

## Open (not fixed — need a decision or belong to another area)

| id | sev | what | suggestion |
|---|---|---|---|
| O1 | **high if the public instance runs in demo mode** | Demo mode is open to anyone. The signing-secret default `casedesk-demo-signing-secret` and console token `demo-console` are in the source. Anyone can sign any of the 5,000 customer_user_ids and read their status. `GET /console` sets the console cookie (= the console token) for **every** visitor, even when a real `CONSOLE_TOKEN` is set. So in demo mode the console API, including approve, is open to anyone who opens /console. | For a public demo, set `APP_SIGNING_SECRET` and `CONSOLE_TOKEN`, and gate the auto-cookie (e.g. env `CASEDESK_CONSOLE_AUTOCOOKIE=1`, or localhost only). Lead decision: the demo flow relies on it. |
| O2 | low | Requests that fail auth are not rate-limited, and each one writes an `auth_rejected` audit row (sqlite growth). The limiter's per-user dict also grows with every distinct signed id. | IP-based limit on 401s, or sample the audit rows. |
| O3 | low | A second message while a grant is pending: the pending approval counts in the 90-day rule, so policy drops PROPOSE_GRANT. The reply does not mention the pending request and `pending_approval` is false; only `approvals[]` shows it. | Expose `grant_request: pending` as a fact. The AI bug-bash (docs/bugbash-ai.md) proposes the same. |
| O4 | low | `approve` does not re-check eligibility when the developer clicks. A request can sit pending past the 14-day window, or after the user resubscribed, and still be granted. | Show "window closed" in the console, or re-run `grant_window_open` on approve. |
| O5 | low | Mixed clocks: approval `created_at`/`decided_at` use the real clock, while policy uses `CASEDESK_NOW`. The 90-day rule compares across them. This is safe as long as `CASEDESK_NOW` ≤ real time; a demo clock set ahead by more than 90 days would ignore recent grants. | Stamp approvals with `now_utc()`. |
| O6 | low | A failed approval (Adapty error) cannot be retried from the console (409 "already failed"). The user has to write again to get a new request. | "Retry" action, or accept approve on `failed`. |
| O7 | low | A never-charged expired trial with REFUND_REQUEST still gets REFUND_PATH_APPLE/GOOGLE (table cell "explain refund"). With PAID_NO_ACCESS, the `period_ended` template says "Your paid period has ended" (ai/templates). | Engine: `explain!` + `nothing_charged`-style reason when `last_charge_at is None` (table change, lead). AI: wording. |
| O8 | info | `GET /api/cases` returns at most the 200 newest cases, with no paging. After the 5,000-user run the console shows 200. | Add `?limit=&before=` if the console needs more. |
| O9 | info | Each chat takes about 120 ms locally, almost all of it sqlite commits (about 7 per request). That is fine for the demo. | — |

## Checked and correct (no change)

- **Auth.** Missing, empty or wrong signature → 401. A signature for user A used for B → 401. A wrong secret → 401.
  A missing `signature` field → 401. An upper-case hex signature is accepted (normalised). With `CASEDESK_DEMO=0` and no
  `APP_SIGNING_SECRET`, every request is rejected, and `/api/demo/users` → 404. With no `CONSOLE_TOKEN` outside demo
  mode, the console API is always 401. A missing or wrong console token → 401; `Bearer` and `X-Console-Token` both work.
- **CORS.** No CORS middleware. A preflight from another origin gets 405 with no `Access-Control-*` headers, so
  browsers block cross-origin calls. The console cookie is `HttpOnly; SameSite=Strict`, so no CSRF on approve.
- **Approvals.** Double approve → 409. Approve after deny and deny after approve → 409. 8 concurrent approves of one
  approval → exactly one 200 (atomic `UPDATE … WHERE status='pending'`) and one Adapty grant. Grant expiry =
  approval time on the engine clock + 3 days (2026-11-07T00:12:04Z on the demo clock). Adapty 5xx on grant → 502,
  approval `failed` with the error kept, no grant message to the user, and the next chat may request again.
  90-day rule: approved/pending inside 90 days blocks; denied or failed do not. Ineligible users never get an approval:
  PROPOSE_GRANT appeared only for 00239 across 63k pipelines, and only policy can create approvals.
- **Input.** 50k chars → 422. Empty → 422. Whitespace only, emoji only, Arabic RTL, NUL bytes, SQL-ish strings → 200
  with a normal reply (all SQL is parameterised). Wrong JSON types (int/list message, int id, array body, object
  locale) → 422. An unknown customer_user_id (signed) → NO_PURCHASE. Rate limit: 8/min per user, then 429 with
  `Retry-After: 60`. Other users are unaffected, and the sliding window frees slots after 60 s.
- **HTML/JS in messages** is stored and returned verbatim. The API never interprets it; the UI must escape it.
  Risky fields for the console/widget tester: `messages[].text` (user text), `cases[].first_message`,
  `cases[].customer_user_id` (attacker-chosen in demo mode, see O1), `cases[].sale_context.*`
  (`acquisition_channel` comes from an Adapty custom attribute that a real app's SDK sets on the client),
  `case.intent.claims` (LLM-extracted strings from user text), `state.evidence[]`/`facts.product_name`
  (vendor_product_id), and `approvals[].result.error` (Adapty error text). Replies never echo user text.
- **Polling.** Unknown id, another user's message id, a user-role message id, or a negative id → 404. A non-int id → 422.
- **Clock.** With `CASEDESK_NOW` unset, nothing crashes. Results differ from the snapshot as the lead expected
  (e.g. 00682 renewing → "expired, no cancellation recorded"; no grant-eligible user).

## Test counts

- `tests/test_bugbash_backend.py`: 13 passed.
- Full suite `python3 -m pytest -q` (final run, with the AI bug-bash's concurrent changes in the tree): 421 passed, 0 failed.
