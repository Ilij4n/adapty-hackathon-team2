"""Run the engine classifier over the organisers' whole seeded population and print state counts.

Two independent paths:
  A. offline CSV (50,000 users, transactions.csv.gz) -> Profile with this file's own converter, `now` = replay end
     (2026-11-03T00:12:04Z: CSV purchased_at minus the dataset's relative offset, identical for every row). The first
     5,000 users (u00000-u04999) are the ones replayed into Adapty; they are reported separately.
  B. Builder 1's pipeline (seed_loader.build_all -> raw Adapty v2 JSON -> client.map_profile) for the 5,000 replay
     users, at the replay end and at seed_loader's default `now` (replay end + 1 day).

Usage:  python tests/population_check.py [--seed-repo PATH] [--skip-b]
Also importable: `csv_profiles(...)`, `profile_from_rows(...)` (used by tests/test_engine.py).
"""
from __future__ import annotations

import argparse
import csv
import gzip
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from casedesk.adapty.models import AccessLevel, Money, Profile, Subscription  # noqa: E402
from casedesk.engine import facts as facts_mod  # noqa: E402
from casedesk.engine import policy  # noqa: E402
from casedesk.engine.state import classify  # noqa: E402

SEED_REPO = Path(os.environ.get("LUMEN_SEED_REPO", "/workspace/.bagley/scratch/adapty/hands-on/seed/repo"))
REPLAY_END = datetime(2026, 11, 3, 0, 12, 4, tzinfo=timezone.utc)
ACCESS = {"weekly": "premium", "monthly": "premium", "annual": "premium", "annual_trial": "premium",
          "lifetime": "premium", "pro_annual": "pro"}


def _dt(s: str) -> datetime | None:
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def profile_from_rows(user: dict, rows: list[dict], now: datetime) -> Profile:
    """One offline users.csv row + its transactions.csv rows -> Profile, the way the seed replays them into Adapty:
    one Subscription per store product (its latest transaction), one lifetime Subscription per one-time purchase."""
    store = "app_store" if user["platform"] == "iOS" else "play_store"
    subs: list[Subscription] = []
    rows = sorted(rows, key=lambda r: int(r["seq"]))
    chains: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        if _dt(r["purchased_at"]) > now:
            continue  # not happened yet
        if r["purchase_type"] == "subscription":
            chains[r["store_product_id"]].append(r)
        else:
            refunded = _dt(r["refunded_at"])
            refunded = refunded if refunded and refunded <= now else None
            subs.append(Subscription(
                vendor_product_id=r["store_product_id"], store=store, access_level_id=ACCESS.get(r["product"]),
                is_active=refunded is None, is_lifetime=True, purchased_at=_dt(r["purchased_at"]),
                starts_at=_dt(r["purchased_at"]), is_refund=refunded is not None, refunded_at=refunded,
                cancellation_reason="refund" if refunded else None,
                price=Money(amount=float(r["price_local"]), currency=r["currency"])))
    for spid, chain in chains.items():
        last = chain[-1]
        orig, bought = _dt(last["originally_purchased_at"]) or _dt(chain[0]["purchased_at"]), _dt(last["purchased_at"])
        exp = _dt(last["expires_at"])
        refunded = _dt(last["refunded_at"])
        refunded = refunded if refunded and refunded <= now else None
        if refunded:
            exp = min(exp, refunded)
        changed = _dt(last["renew_status_changed_at"])
        unsub = changed if (last["renew_status"] == "false" and changed and changed <= now) else None
        billing = _dt(last["billing_issue_detected_at"])
        billing = billing if billing and billing <= now else None
        live = exp > now and not refunded
        reason = last["cancellation_reason"] or None
        subs.append(Subscription(
            vendor_product_id=spid, store=store, access_level_id=ACCESS.get(last["product"]), is_active=live,
            will_renew=bool(live and last["renew_status"] == "true" and not unsub), starts_at=orig,
            purchased_at=orig, renewed_at=bought if bought > orig else None, expires_at=exp, unsubscribed_at=unsub,
            billing_issue_detected_at=billing, is_refund=refunded is not None, refunded_at=refunded,
            offer_type=last["offer"] or None, cancellation_reason=reason if (unsub or refunded or billing) else None,
            price=Money(amount=float(last["price_local"]), currency=last["currency"])))
    als: dict[str, AccessLevel] = {}
    for s in subs:
        if s.access_level_id and s.is_active:
            cur = als.get(s.access_level_id)
            if cur is None or s.is_lifetime or (cur.expires_at and s.expires_at and s.expires_at > cur.expires_at):
                als[s.access_level_id] = AccessLevel(
                    id=s.access_level_id, is_active=True, is_lifetime=s.is_lifetime, expires_at=s.expires_at,
                    will_renew=s.will_renew, store=store, vendor_product_id=s.vendor_product_id)
    return Profile(profile_id=user["user_id"], customer_user_id=user["user_id"], store_country=user["country"],
                   platform=user["platform"], locale=user["locale"], access_levels=list(als.values()),
                   subscriptions=subs, sale_context={k: user[k] for k in ("acquisition_channel", "placement", "flow")})


def load_csv(repo: Path = SEED_REPO) -> tuple[list[dict], dict[str, list[dict]]]:
    off = repo / "data" / "offline"
    with gzip.open(off / "users.csv.gz", "rt", encoding="utf-8", newline="") as f:
        users = list(csv.DictReader(f))
    tx: dict[str, list[dict]] = defaultdict(list)
    with gzip.open(off / "transactions.csv.gz", "rt", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            tx[r["user_id"]].append(r)
    return users, tx


def csv_profiles(now: datetime = REPLAY_END, repo: Path = SEED_REPO):
    users, tx = load_csv(repo)
    for u in users:
        yield u, profile_from_rows(u, tx.get(u["user_id"], []), now)


def _fmt(c: Counter) -> str:
    return "\n".join(f"  {k:<22} {v:>6}" for k, v in c.most_common()) + f"\n  {'TOTAL':<22} {sum(c.values()):>6}"


def run_a(now: datetime, repo: Path) -> None:
    all_c, replay_c = Counter(), Counter()
    grant_ok, actions = Counter(), Counter()
    for u, p in csv_profiles(now, repo):
        st = classify(p, now)
        fs = facts_mod.build(p, st, now)
        for intent in policy.INTENT_TYPES:   # every profile x every intent: invariants hold, no crash
            acts = policy.decide(st, intent, fs, [])
            assert acts[0].kind == "EXPLAIN_STATUS", (u["user_id"], intent)
            for a in acts:
                actions[a.kind] += 1
                if a.kind == "PROPOSE_GRANT":
                    assert st.code in ("BILLING_RETRY", "EXPIRED_BILLING_ERROR") and a.requires_approval
        all_c[st.code] += 1
        if int(u["user_id"][1:]) < 5000:
            replay_c[st.code] += 1
        if st.code == "EXPIRED_BILLING_ERROR":
            grant_ok["eligible" if facts_mod.grant_window_open(st, now) else "not_eligible"] += 1
    print(f"A. offline CSV, now = {now.isoformat()}")
    print(" all 50,000 users:\n" + _fmt(all_c))
    print(" replay users u00000-u04999:\n" + _fmt(replay_c))
    print(f" EXPIRED_BILLING_ERROR grant-eligible (paid + expired <=14 days): {dict(grant_ok)}")
    print(" actions over every profile x every intent type (invariants checked):\n" + _fmt(actions))


def run_b(repo: Path) -> None:
    from casedesk.adapty import seed_loader
    from casedesk.adapty.client import map_profile
    for label, delta in (("replay end", timedelta(0)), ("seed_loader default (replay end + 1 day)", timedelta(days=1))):
        now = REPLAY_END + delta
        bundle = seed_loader.build_all(now=now, repo=repo)
        c = Counter()
        for cuid, raw in bundle["profiles"].items():
            c[classify(map_profile(raw, now=now, extras=bundle["extras"][cuid]), now).code] += 1
        print(f"B. seed_loader + client.map_profile, 5,000 replay users, now = {now.isoformat()} ({label}):\n"
              + _fmt(c))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed-repo", type=Path, default=SEED_REPO)
    ap.add_argument("--now", default=REPLAY_END.isoformat())
    ap.add_argument("--skip-b", action="store_true")
    a = ap.parse_args()
    run_a(_dt(a.now), a.seed_repo)
    if not a.skip_b:
        run_b(a.seed_repo)


if __name__ == "__main__":
    main()
