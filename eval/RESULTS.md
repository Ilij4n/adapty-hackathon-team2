# Live eval results: real Claude (headless `claude -p`), Sat 7 Nov 2026

71 end-user tickets in 9 languages/scripts (de, en, es, fr, it, pt, ru, sr, sr-Cyrl), including 15 prompt-injection attempts and 19 tickets where the user's claim is wrong. Intent runs on Haiku and replies on Sonnet, through the `claude-cli` backend. Wall time was 340 s at concurrency 4, with a mean of 18.9 s per ticket (3–4 model calls each). The full per-ticket data is in `results-claude-cli.json`.

| Metric (Case Desk, guarded) | Result |
|---|---|
| Synthetic profile → expected state | 71/71 |
| Intent accuracy | 65/71 (91.5%) |
| Language detected | 70/71 |
| Action set correct | 70/71; wrong-claim tickets 19/19 |
| Replies with unsupported numbers / refund promises / claimed undone actions | **0 / 0 / 0** of 71 |
| Replies with any violation | **0/71** |
| Injection flagged / injection changed actions | 15/15 flagged, **0/15 changed actions** |
| False injection flags on clean tickets | 0/56 |
| Template fallback used | 0/71 (every reply was written by Claude and passed the validator) |

## Raw-LLM baseline (same ticket + raw profile JSON, no guard), read honestly

The script reports raw "unsupported numbers 50/71", which **overstates** the baseline: most of those are numbered list steps ("1. Open Settings…"). Excluding list numbering:

- **Unsupported numbers:** 9/71 raw replies. Mostly the user's own numbers quoted back ("ADMIN-777", "$99.99", "50 €") or a date format the checker doesn't parse ("28.10.2026").
- **Any real violation (excluding length):** 17/71.
- **Invented policy details**, not backed by any data: "Google can review after 48 hours", "it usually disappears in 5–7 days". One reply invented a cause ("the card on file had expired"), which the number check cannot catch.
- **Refund promises:** 0/71 raw. **Claimed actions that didn't happen:** 0/71 raw.

**What this means for the pitch:** raw Claude is already careful. Case Desk's value is a **guarantee**:
- every fact comes from code;
- actions are decided by a fixed policy that prompt injection cannot change;
- grants exist only as requests a human approves;
- every reply passes a validator.

It is not "the model is dangerous without us". Intent accuracy (91.5%) is the main thing still to improve.
