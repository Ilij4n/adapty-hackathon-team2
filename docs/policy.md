# Case Desk policy: actions per (state, intent type)

Source of truth: `casedesk/engine/policy.py` (`TABLE`). `tests/test_engine.py::test_docs_and_docstring_match_table`
fails if this file or the module docstring drifts from the code. Regenerate the table with
`python -c "from casedesk.engine import policy; print(policy.render_table())"`.

Actions depend on the classified state, the intent *type*, the FactSheet and a few typed, sanitised claims
(`wants_refund`, `claimed_store`, `claimed_platform`, `claimed_amount`). Free text, language and
`injection_suspected` never change them, and no claim can add a grant or a refund promise. When there are actions,
`EXPLAIN_STATUS` comes first, except HUMAN_REQUEST / PRIVACY_REQUEST (escalation only). ACKNOWLEDGEMENT, OTHER_APP and
THIRD_PARTY_ACCOUNT return no actions (`[]`); OTHER is `explain` only (no automatic escalation, bug bash M1).

UNRECOGNISED_CHARGE ("why was I charged, I never bought anything") explains the charges the account shows and where
to ask the store for a refund; it is not a charged-after-cancel claim. FREE_ACCESS_REQUEST ("give me premium for free")
explains the account and what the user can do (subscribe, restore if they paid, fix the payment); a grant appears only
where the grant policy already allows one, and its store slots are dropped (never escalated) on stores without links.

## Slots

```
Slots
  explain   EXPLAIN_STATUS
  explain!  EXPLAIN_STATUS with params.claim_contradicted=True: the user's claim does not match the facts, so the
            reply leads with what is actually true (e.g. "you cancelled on X, the last charge was on Y, before that")
  charge?   CHARGED_AFTER_CANCEL check: if the last charge happened on/before the cancellation (or no cancellation is
            recorded and nothing renews) -> explain!; if a charge really came after the cancellation ->
            explain + refund + human
  cancel    CANCEL_STEPS + MANAGE_SUBSCRIPTION_LINK
  manage    MANAGE_SUBSCRIPTION_LINK (resubscribe / see subscriptions in the store)
  refund    REFUND_PATH_APPLE (app_store) | REFUND_PATH_GOOGLE (play_store) | ESCALATE_TO_HUMAN (any other store)
  restore   RESTORE_PURCHASES_STEPS
  payment   UPDATE_PAYMENT_METHOD
  grant     PROPOSE_GRANT, requires_approval=True, only if the ARCH grant policy allows it (see below)
  human     ESCALATE_TO_HUMAN (reason `user_requested_human` for HUMAN_REQUEST, `privacy_request` for
            PRIVACY_REQUEST, else `<STATE>:<INTENT>`)
  (empty)   no actions at all (ACKNOWLEDGEMENT, OTHER_APP, THIRD_PARTY_ACCOUNT): the reply is just text
Store links only exist for app_store / play_store: cancel / manage / payment / refund on any other store
(stripe, adapty, unknown) become a single ESCALATE_TO_HUMAN.
```

## Fact checks (after the table)

```
Fact checks applied after the table (in this order):
  H7 claims vs facts — for STATUS_QUESTION / CHARGED_AFTER_CANCEL / REFUND_REQUEST / PAID_NO_ACCESS /
     UNRECOGNISED_CHARGE: if
     claims.claimed_store (app_store|play_store) differs from the account's store, or claims.claimed_amount is not a
     number in the FactSheet (only checked when there is a `price`) -> the first action becomes explain! reason
     `charge_not_found` with params store_mismatch / amount_mismatch; refund paths are dropped (that charge is not on
     this account); a store mismatch adds ESCALATE_TO_HUMAN.
  H4 never charged — facts.ever_charged == "no" with REFUND_REQUEST, CHARGED_AFTER_CANCEL or UNRECOGNISED_CHARGE
     (not FAMILY_SHARED):
     explain! reason `nothing_charged` (`no_charge_on_account` for NO_PURCHASE / GRANTED_BY_DEVELOPER, and for
     CHARGED_AFTER_CANCEL in CANCELLED_PAID_UP / EXPIRED_CANCELLED), and no refund path.
  M5 charge? + claims.wants_refund — a contradicted charged-after-cancel claim still gets the store refund path when
     the user explicitly asks for a refund (and was charged).
  H5 restore — when the store is only guessed from the device (no purchase, no access level), RESTORE_PURCHASES_STEPS
     uses steps_key restore_generic, unless claims.claimed_platform (ios|android) names the store.
```

## Decision table

| state | CHARGED_AFTER_CANCEL | PAID_NO_ACCESS | REFUND_REQUEST | HOW_TO_CANCEL | RESTORE_NEW_DEVICE | BILLING_FAILED | STATUS_QUESTION | OTHER | UNRECOGNISED_CHARGE | FREE_ACCESS_REQUEST |
|---|---|---|---|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | explain! cancel refund | explain! restore | explain refund cancel | explain cancel | explain restore | explain! | explain | explain | explain refund cancel | explain |
| CANCELLED_PAID_UP | charge? | explain! restore | explain refund | explain | explain restore | explain! | explain | explain | explain refund | explain |
| TRIAL_ACTIVE | explain! cancel | explain! restore | explain! cancel | explain cancel | explain restore | explain! | explain | explain | explain! cancel | explain |
| TRIAL_CANCELLED | explain! | explain! restore | explain! | explain | explain restore | explain! | explain | explain | explain! | explain |
| GRACE_PERIOD | explain! cancel | explain! payment restore | explain refund | explain cancel | explain payment restore | explain payment | explain payment | explain | explain refund cancel | explain payment |
| BILLING_RETRY | explain! cancel | explain payment grant | explain refund | explain cancel | explain payment grant | explain payment grant | explain payment grant | explain | explain refund cancel | explain payment grant |
| EXPIRED_BILLING_ERROR | explain! | explain payment manage grant | explain refund | explain | explain payment manage grant | explain payment manage grant | explain payment manage grant | explain | explain refund | explain payment manage grant |
| EXPIRED_CANCELLED | charge? | explain! manage | explain refund | explain | explain manage | explain! | explain | explain | explain refund | explain manage |
| REFUNDED | explain! | explain! | explain! | explain | explain | explain | explain | explain | explain! | explain manage |
| LIFETIME | explain! | explain! restore | explain refund | explain | explain restore | explain! | explain | explain | explain refund | explain restore |
| GRANTED_BY_DEVELOPER | explain! human | explain! restore | explain! | explain | explain restore | explain | explain | explain | explain! | explain |
| FAMILY_SHARED | explain! | explain! restore | explain! | explain | explain restore | explain | explain | explain | explain! | explain |
| NO_PURCHASE | explain! restore human | explain! restore human | explain human | explain manage | explain restore human | explain human | explain | explain | explain! | explain manage restore |

| state | HUMAN_REQUEST | ACKNOWLEDGEMENT | OTHER_APP | PRIVACY_REQUEST | THIRD_PARTY_ACCOUNT | DISCOUNT_REQUEST |
|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | human | — | — | human | — | explain |
| CANCELLED_PAID_UP | human | — | — | human | — | explain |
| TRIAL_ACTIVE | human | — | — | human | — | explain |
| TRIAL_CANCELLED | human | — | — | human | — | explain |
| GRACE_PERIOD | human | — | — | human | — | explain |
| BILLING_RETRY | human | — | — | human | — | explain grant |
| EXPIRED_BILLING_ERROR | human | — | — | human | — | explain grant |
| EXPIRED_CANCELLED | human | — | — | human | — | explain |
| REFUNDED | human | — | — | human | — | explain |
| LIFETIME | human | — | — | human | — | explain |
| GRANTED_BY_DEVELOPER | human | — | — | human | — | explain |
| FAMILY_SHARED | human | — | — | human | — | explain |
| NO_PURCHASE | human | — | — | human | — | explain |

`explain!` = EXPLAIN_STATUS with `params.claim_contradicted=True` and a `params.reason` key:

| intent | state | reason |
|---|---|---|
| CHARGED_AFTER_CANCEL | ACTIVE_RENEWING, TRIAL_ACTIVE, GRACE_PERIOD, BILLING_RETRY | `not_cancelled` (auto-renew is still on) |
| CHARGED_AFTER_CANCEL | CANCELLED_PAID_UP, EXPIRED_CANCELLED | `charged_before_cancel` (last charge on/before `cancelled_on`), `no_cancellation_recorded`, or `no_charge_on_account` (free trial cancelled before it converted: never charged) |
| CHARGED_AFTER_CANCEL | TRIAL_CANCELLED | `nothing_charged` |
| CHARGED_AFTER_CANCEL | EXPIRED_BILLING_ERROR | `renewal_charge_failed` |
| CHARGED_AFTER_CANCEL | REFUNDED / LIFETIME / FAMILY_SHARED | `already_refunded` / `one_time_purchase` / `organizer_pays` |
| CHARGED_AFTER_CANCEL | GRANTED_BY_DEVELOPER, NO_PURCHASE | `no_charge_on_account` |
| PAID_NO_ACCESS | any state with access | `has_access` (restore purchases) |
| PAID_NO_ACCESS | EXPIRED_CANCELLED / REFUNDED / NO_PURCHASE | `period_ended` / `refund_ended_access` / `no_purchase_on_account` |
| REFUND_REQUEST | TRIAL_ACTIVE, TRIAL_CANCELLED, GRANTED_BY_DEVELOPER / REFUNDED / FAMILY_SHARED | `nothing_charged` / `already_refunded` / `organizer_must_request` |
| BILLING_FAILED | states where payment is fine | `payment_ok` |
| REFUND_REQUEST / CHARGED_AFTER_CANCEL | `ever_charged=no` (not FAMILY_SHARED) | `nothing_charged`; `no_charge_on_account` for NO_PURCHASE / GRANTED_BY_DEVELOPER and for CHARGED_AFTER_CANCEL in CANCELLED_PAID_UP / EXPIRED_CANCELLED |
| UNRECOGNISED_CHARGE | TRIAL_ACTIVE, TRIAL_CANCELLED / REFUNDED / GRANTED_BY_DEVELOPER, NO_PURCHASE / FAMILY_SHARED | `nothing_charged` / `already_refunded` / `no_charge_on_account` / `organizer_pays` |
| STATUS_QUESTION / CHARGED_AFTER_CANCEL / REFUND_REQUEST / PAID_NO_ACCESS / UNRECOGNISED_CHARGE | claimed store/amount not on this account | `charge_not_found` (+ `store_mismatch`, `amount_mismatch` booleans) |

## Grant policy (ARCH)

- `PROPOSE_GRANT` only in BILLING_RETRY, or EXPIRED_BILLING_ERROR with expiry at most 14 days before now, and only for
  intents PAID_NO_ACCESS, RESTORE_NEW_DEVICE, BILLING_FAILED, STATUS_QUESTION (never for cancel / refund / charge
  complaints / OTHER).
- Only for a subscription with at least one PAID, non-refunded transaction (lead decision): a failed free-trial
  conversion (never paid, e.g. u02317 es_MX) gets EXPLAIN_STATUS + UPDATE_PAYMENT_METHOD (+ MANAGE link), no grant.
- At most once per user per 90 days: any history record whose `approval.status` is `pending` or `approved` with
  `created_at`/`decided_at` in the last 90 days blocks a new proposal. Denied proposals do not count.
- Always `days=3`, `expires_at = now + 3 days`, `access_level_id` of the affected subscription (`premium` / `pro`),
  `requires_approval=True`. The reply may say it was *requested*, never that it is granted.
- GRACE_PERIOD is allowed by ARCH but not used: the user still has access during grace.

## Approve-time re-check

`policy.grant_recheck(state, facts, history, now) -> (ok, reason)` and `policy.grant_still_eligible(...) -> bool`.
Call them when the developer clicks approve, with a freshly classified state/facts. Pending requests are ignored (the
one being approved is pending itself). Blocks with `state_changed` (e.g. resubscribed), `never_paid`,
`window_closed` (more than 14 days after the billing-error expiry) or `granted_recently` (an approved grant in 90 days).

## Store facts

| store | manage | refund | payment | who refunds |
|---|---|---|---|---|
| app_store | https://apps.apple.com/account/subscriptions | https://reportaproblem.apple.com | https://apps.apple.com/account/billing | Apple only; the developer cannot (`developer_can_refund=False`) |
| play_store | https://play.google.com/store/account/subscriptions | https://play.google.com/store/account/orderhistory | https://play.google.com/store/paymentmethods | user requests in Google Play; developer can refund; never promised |
| other (stripe, adapty, unknown) | — | — | — | every store slot becomes one ESCALATE_TO_HUMAN |

## Grant demo user

At the demo clock `CASEDESK_NOW=2026-11-04T00:12:04Z`, Builder 1's seed snapshot has exactly ONE paying user expired on a
billing error within 14 days: `lumen_demo_00239` (u00239, en_US, iOS, Lumen Premium Weekly: trial 2026-10-12, paid
6.99 USD on 2026-10-15, expired on a billing error 2026-10-22 = 12.8 days before the clock; window closes
2026-11-05T03:53:18Z). The other three in the window (00997, 02138, 02317) are failed trial conversions, so no grant.

## Interface notes for the app and AI (round 2)

- `facts.build(profile, state, now, history=None)`: pass the same history `policy.decide` gets and the sheet carries
  `grant_request` = `pending|approved|denied` (latest grant approval within 90 days; any open one wins as `pending`;
  `failed` is ignored here — the app may map it to `pending` itself). Without `history` the field is absent and the
  app may set it.
- New facts: `ever_charged` (`yes|no`; absent only for access-level-only paid states), `price_after_trial`
  (never-charged trials; `price` is dropped there except TRIAL_ACTIVE, which keeps it for "then it costs X" — pinned
  by `tests/test_bugbash_backend.py`), `cancel_before` (TRIAL_ACTIVE only: App Store = trial end − 1 day, Google Play
  = trial end), `restore_steps_key = restore_generic` when the store is only guessed from the device.
- Empty action lists are normal for ACKNOWLEDGEMENT / OTHER_APP / THIRD_PARTY_ACCOUNT.
- `policy.grant_recheck(...)` / `policy.grant_still_eligible(...)` for approve time (see above).
