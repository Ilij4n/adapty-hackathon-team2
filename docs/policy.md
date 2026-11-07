# Case Desk policy: actions per (state, intent type)

Source of truth: `casedesk/engine/policy.py` (`TABLE`). `tests/test_engine.py::test_docs_and_docstring_match_table`
fails if this file or the module docstring drifts from the code. Regenerate the table with
`python -c "from casedesk.engine import policy; print(policy.render_table())"`.

Actions depend on the classified state and the intent *type* only. The user's text, claims, language and
`injection_suspected` never change them. `EXPLAIN_STATUS` is always the first action.

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
  human     ESCALATE_TO_HUMAN
Store links only exist for app_store / play_store: cancel / manage / payment / refund on any other store
(stripe, adapty, unknown) become a single ESCALATE_TO_HUMAN.
```

## Decision table

| state | CHARGED_AFTER_CANCEL | PAID_NO_ACCESS | REFUND_REQUEST | HOW_TO_CANCEL | RESTORE_NEW_DEVICE | BILLING_FAILED | STATUS_QUESTION | OTHER |
|---|---|---|---|---|---|---|---|---|
| ACTIVE_RENEWING | explain! cancel refund | explain! restore | explain refund cancel | explain cancel | explain restore | explain! | explain | explain human |
| CANCELLED_PAID_UP | charge? | explain! restore | explain refund | explain | explain restore | explain! | explain | explain human |
| TRIAL_ACTIVE | explain! cancel | explain! restore | explain! cancel | explain cancel | explain restore | explain! | explain | explain human |
| TRIAL_CANCELLED | explain! | explain! restore | explain! | explain | explain restore | explain! | explain | explain human |
| GRACE_PERIOD | explain! cancel | explain! payment restore | explain refund | explain cancel | explain payment restore | explain payment | explain payment | explain human |
| BILLING_RETRY | explain! cancel | explain payment grant | explain refund | explain cancel | explain payment grant | explain payment grant | explain payment grant | explain payment human |
| EXPIRED_BILLING_ERROR | explain! | explain payment manage grant | explain refund | explain | explain payment manage grant | explain payment manage grant | explain payment manage grant | explain human |
| EXPIRED_CANCELLED | charge? | explain! manage | explain refund | explain | explain manage | explain! | explain | explain human |
| REFUNDED | explain! | explain! | explain! | explain | explain | explain | explain | explain human |
| LIFETIME | explain! | explain! restore | explain refund | explain | explain restore | explain! | explain | explain human |
| GRANTED_BY_DEVELOPER | explain! human | explain! restore | explain! | explain | explain restore | explain | explain | explain human |
| FAMILY_SHARED | explain! | explain! restore | explain! | explain | explain restore | explain | explain | explain human |
| NO_PURCHASE | explain! restore human | explain! restore human | explain human | explain manage | explain restore human | explain human | explain | explain human |

`explain!` = EXPLAIN_STATUS with `params.claim_contradicted=True` and a `params.reason` key:

| intent | state | reason |
|---|---|---|
| CHARGED_AFTER_CANCEL | ACTIVE_RENEWING, TRIAL_ACTIVE, GRACE_PERIOD, BILLING_RETRY | `not_cancelled` (auto-renew is still on) |
| CHARGED_AFTER_CANCEL | CANCELLED_PAID_UP, EXPIRED_CANCELLED | `charged_before_cancel` (last charge on/before `cancelled_on`) or `no_cancellation_recorded` |
| CHARGED_AFTER_CANCEL | TRIAL_CANCELLED | `nothing_charged` |
| CHARGED_AFTER_CANCEL | EXPIRED_BILLING_ERROR | `renewal_charge_failed` |
| CHARGED_AFTER_CANCEL | REFUNDED / LIFETIME / FAMILY_SHARED | `already_refunded` / `one_time_purchase` / `organizer_pays` |
| CHARGED_AFTER_CANCEL | GRANTED_BY_DEVELOPER, NO_PURCHASE | `no_charge_on_account` |
| PAID_NO_ACCESS | any state with access | `has_access` (restore purchases) |
| PAID_NO_ACCESS | EXPIRED_CANCELLED / REFUNDED / NO_PURCHASE | `period_ended` / `refund_ended_access` / `no_purchase_on_account` |
| REFUND_REQUEST | TRIAL_ACTIVE, TRIAL_CANCELLED, GRANTED_BY_DEVELOPER / REFUNDED / FAMILY_SHARED | `nothing_charged` / `already_refunded` / `organizer_must_request` |
| BILLING_FAILED | states where payment is fine | `payment_ok` |

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
