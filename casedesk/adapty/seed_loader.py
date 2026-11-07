"""Build the raw Adapty server-side API v2 profiles the hackathon seed WOULD produce.

Source: the organisers' seed repo (adapty-seed-data-hack):
  * data/lumen_dataset.json.gz  -- 5,000 users; every time is seconds relative to the replay end
  * data/offline/users.csv.gz    -- placement / flow / ab_test per user (first 5,000 = the replayed ones)
  * data/offline/transactions.csv.gz -- same transactions with absolute timestamps (used to pin the
    replay end: CSV purchased_at - dataset offset is 2026-11-03T00:12:04Z for every row)

`seed_adapty.py` replays each user as POST /profile/ (custom attributes, store_country,
installation_meta) and one POST /purchase/set/transaction/ per dataset transaction. After the replay
ends it sends nothing more (no renewals), so a subscription whose expires_at falls between the replay end
and "now" shows as expired with auto-renew still on (situation EXPIRED_NO_RENEWAL_SENT below).

Output (for `mock_server` and the client's enrichment):
  data/profiles_raw.json.gz  {"meta": {...}, "profiles": {cuid: <GET /profile/ "data" object>},
                              "extras": {cuid: {store_country, platform, locale, prices, sale_context}}}
  data/demo_users.json       hand-picked demo users with their expected situation + population counts

Run:  python -m casedesk.adapty.seed_loader [--now ISO] [--seed-repo PATH] [--out DIR]
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

SEED_REPO = Path(os.environ.get("LUMEN_SEED_REPO", "/workspace/.bagley/scratch/adapty/hands-on/seed/repo"))
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
RAW_FILE = "profiles_raw.json.gz"
DEMO_FILE = "demo_users.json"

# Replay end as pinned by the offline CSV (re-derived at build time when the CSV is present).
REPLAY_END = datetime(2026, 11, 3, 0, 12, 4, tzinfo=timezone.utc)
CUID_PREFIX = "lumen_demo_"
APP_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "casedesk/lumen-demo/app"))
SEED_MARKER = ("seed_source", "adapty_hackathon_belgrade_2026")

# Catalog from seed_adapty.py PRODUCTS: key -> (access level, title)
PRODUCTS = {
    "weekly": ("premium", "Premium Weekly (3-day trial)"),
    "monthly": ("premium", "Premium Monthly"),
    "annual": ("premium", "Premium Annual"),
    "annual_trial": ("premium", "Premium Annual (7-day trial)"),
    "lifetime": ("premium", "Premium Lifetime"),
    "pro_annual": ("pro", "Pro Annual - AI Studio"),
}

AL_KEYS = ("access_level_id", "store", "store_product_id", "store_base_plan_id", "store_transaction_id",
           "store_original_transaction_id", "offer", "starts_at", "purchased_at", "originally_purchased_at",
           "expires_at", "renewal_cancelled_at", "billing_issue_detected_at", "is_in_grace_period",
           "cancellation_reason")


def store_product_id(key: str, platform: str) -> str:
    # seed: ios_id = f"lumen.{key}", android_id = f"lumen_{key}"
    return f"lumen.{key}" if platform == "iOS" else f"lumen_{key}"


def product_key(spid: str) -> str:
    return spid.split(".", 1)[1] if spid.startswith("lumen.") else spid.removeprefix("lumen_")


def access_level_for(spid: str) -> str | None:
    p = PRODUCTS.get(product_key(spid))
    return p[0] if p else None


def product_title(spid: str) -> str | None:
    p = PRODUCTS.get(product_key(spid))
    return p[1] if p else None


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def _parse(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


# --------------------------------------------------------------------------- loading

def load_dataset(repo: Path = SEED_REPO) -> dict:
    with gzip.open(repo / "data" / "lumen_dataset.json.gz", "rt", encoding="utf-8") as f:
        data = json.load(f)
    if data.get("version") != 1:
        raise ValueError(f"unsupported dataset version {data.get('version')}")
    return data


def load_offline_users(repo: Path = SEED_REPO, limit: int = 5000) -> dict[str, dict]:
    path = repo / "data" / "offline" / "users.csv.gz"
    out: dict[str, dict] = {}
    if not path.exists():
        return out
    with gzip.open(path, "rt", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            out[row["user_id"]] = row
            if len(out) >= limit:
                break
    return out


def derive_replay_end(data: dict, repo: Path = SEED_REPO) -> datetime:
    """CSV absolute purchased_at minus dataset relative offset (one value for all rows)."""
    path = repo / "data" / "offline" / "transactions.csv.gz"
    if not path.exists():
        return REPLAY_END
    by_user: dict[str, list] = defaultdict(list)
    with gzip.open(path, "rt", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            by_user[row["user_id"]].append(row)
    anchors: Counter = Counter()
    for u in data["users"]:
        rows = sorted(by_user.get(f"u{u['i']:05d}", []), key=lambda r: int(r["seq"]))
        for row, t in zip(rows, u["tx"]):
            anchors[_parse(row["purchased_at"]) - timedelta(seconds=t["t"])] += 1
    if not anchors:
        return REPLAY_END
    return anchors.most_common(1)[0][0]


def price_book(data: dict) -> dict[tuple[str, str], tuple[float, str]]:
    """(product key, country) -> regular (non-trial) local price, currency. One value per pair in the data."""
    c: dict[tuple[str, str], Counter] = defaultdict(Counter)
    for u in data["users"]:
        for t in u["tx"]:
            if t["price"] > 0:
                c[(t["product"], u["country"])][(t["price"], u["currency"])] += 1
    return {k: v.most_common(1)[0][0] for k, v in c.items()}


# --------------------------------------------------------------------------- building

def _uuid(*parts) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "casedesk/lumen-demo/" + "/".join(map(str, parts))))


def build_profile(u: dict, replay_end: datetime, now: datetime, offline: dict | None = None,
                  prices: dict | None = None) -> tuple[dict, dict]:
    """Return (raw GET /profile/ `data` object as of `now`, extras that the API response does not carry)."""
    def at(offset):
        if offset is None:
            return None
        dt = replay_end + timedelta(seconds=offset)
        return dt if dt <= now else None  # events after "now" have not happened yet

    i = u["i"]
    cuid = f"{CUID_PREFIX}{i:05d}"
    platform = u["platform"]
    store = "app_store" if platform == "iOS" else "play_store"
    install = replay_end + timedelta(seconds=u["install"])

    attrs = {**u["attrs"], "simulated_install_date": install.strftime("%Y-%m-%d"), SEED_MARKER[0]: SEED_MARKER[1]}
    custom_attributes = [{"key": k, "value": v} for k, v in attrs.items()]

    # Transactions as the seed sends them (one shared original id per user's subscription chain, like the seed).
    txs = []
    original_id = None
    for seq, t in enumerate(u["tx"], start=1):
        purchased = at(t["t"])
        if purchased is None:
            continue
        gseq = i * 100 + seq
        tx_id = f"2000000{gseq:08d}" if platform == "iOS" else f"GPA.0000-{gseq // 10000:04d}-{gseq % 10000:04d}-0000"
        tx = {"t": t, "spid": store_product_id(t["product"], platform), "tx_id": tx_id,
              "purchased_at": purchased, "refunded_at": at(t["refunded"]),
              "offer": ({"category": "introductory", "type": "free_trial", "id": None}
                        if t["offer"] == "free_trial" else None)}
        if t["purchase_type"] == "subscription":
            original_id = original_id or tx_id
            tx["original_id"] = original_id
        else:
            tx["original_id"] = tx_id
        txs.append(tx)

    subscriptions, non_subscriptions = [], []
    al_candidates: dict[str, list[dict]] = defaultdict(list)
    revenue = 0.0

    for tx in txs:
        t = tx["t"]
        if not tx["refunded_at"] and t["offer"] != "free_trial":
            revenue += t["usd"]
        if t["purchase_type"] == "subscription":
            continue
        non_subscriptions.append({
            "purchase_id": _uuid("purchase", cuid, tx["tx_id"]),
            "store": store,
            "store_product_id": tx["spid"],
            "store_base_plan_id": None,
            "store_transaction_id": tx["tx_id"],
            "store_original_transaction_id": tx["tx_id"],
            "purchased_at": iso(tx["purchased_at"]),
            "environment": "Production",
            "is_refund": tx["refunded_at"] is not None,
            "is_consumable": False,
        })
        al = access_level_for(tx["spid"])
        if al:
            # INFERRED: a refunded lifetime purchase leaves an access level that expired at the refund time.
            al_candidates[al].append({
                "access_level_id": al, "store": store, "store_product_id": tx["spid"],
                "store_base_plan_id": None, "store_transaction_id": tx["tx_id"],
                "store_original_transaction_id": tx["tx_id"], "offer": None, "starts_at": None,
                "purchased_at": iso(tx["purchased_at"]), "originally_purchased_at": iso(tx["purchased_at"]),
                "expires_at": iso(tx["refunded_at"]), "renewal_cancelled_at": None,
                "billing_issue_detected_at": None, "is_in_grace_period": False,
                "cancellation_reason": "refund" if tx["refunded_at"] else None,
            })

    # One subscription entry per store product: the latest transaction of its chain (INFERRED grouping).
    latest: dict[str, dict] = {}
    for tx in txs:
        if tx["t"]["purchase_type"] == "subscription":
            cur = latest.get(tx["spid"])
            if cur is None or tx["purchased_at"] >= cur["purchased_at"]:
                latest[tx["spid"]] = tx
    for spid, tx in sorted(latest.items(), key=lambda kv: kv[1]["purchased_at"]):
        t = tx["t"]
        first = min((x for x in txs if x["spid"] == spid), key=lambda x: x["purchased_at"])
        expires = replay_end + timedelta(seconds=t["exp"])
        if tx["refunded_at"]:
            expires = min(expires, tx["refunded_at"])  # INFERRED: a refund revokes access at refund time
        renew_changed = at(t.get("renew_changed"))
        renewal_cancelled_at = renew_changed if (t.get("renew") is False and renew_changed) else None
        billing = at(t.get("billing"))
        reason = t["reason"] if (renewal_cancelled_at or tx["refunded_at"] or billing) else None
        sub = {
            "store": store,
            "store_product_id": spid,
            "store_base_plan_id": None,  # the seed sends no base plan id
            "store_transaction_id": tx["tx_id"],
            "store_original_transaction_id": tx["original_id"],
            "offer": tx["offer"],
            "environment": "Production",
            "purchased_at": iso(tx["purchased_at"]),
            "originally_purchased_at": iso(at(t.get("orig")) or first["purchased_at"]),
            "expires_at": iso(expires),
            "renewal_cancelled_at": iso(renewal_cancelled_at),
            "billing_issue_detected_at": iso(billing),
            "is_in_grace_period": False,  # the seed never sends grace_period_expires_at
            "cancellation_reason": reason,
        }
        subscriptions.append(sub)
        al = access_level_for(spid)
        if al:
            al_candidates[al].append({"access_level_id": al, "starts_at": None,
                                      **{k: v for k, v in sub.items() if k != "environment"}})

    access_levels = []
    for al, cands in al_candidates.items():
        # Lifetime (expires_at null) wins, else the latest expiry.
        best = max(cands, key=lambda c: (c["expires_at"] is None, c["expires_at"] or "", c["purchased_at"]))
        access_levels.append({k: best[k] for k in AL_KEYS})

    raw = {
        "app_id": APP_ID,
        "profile_id": _uuid("profile", cuid),
        "customer_user_id": cuid,
        "total_revenue_usd": round(revenue, 2),
        "segment_hash": hashlib.md5(f"{u['country']}:{revenue > 0}".encode()).hexdigest()[:16],
        "timestamp": int(now.timestamp() * 1000),
        "custom_attributes": custom_attributes,
        "access_levels": access_levels,
        "subscriptions": subscriptions,
        "non_subscriptions": non_subscriptions,
    }

    off = (offline or {}).get(f"u{i:05d}", {})
    sale_context = {"acquisition_channel": str(u["attrs"].get("acquisition_channel", ""))}
    for k in ("placement", "flow", "ab_test"):
        v = off.get(k) or u.get(k)
        if v:
            sale_context[k] = v
    user_prices = {}
    for spid in {tx["spid"] for tx in txs}:
        p = (prices or {}).get((product_key(spid), u["country"]))
        if p:
            user_prices[spid] = {"amount": p[0], "currency": p[1]}
    extras = {"store_country": u["country"], "platform": platform, "locale": u["locale"],
              "timezone": u["timezone"], "device": u["device"], "prices": user_prices,
              "product_access_levels": {spid: access_level_for(spid) for spid in sorted({tx["spid"] for tx in txs})},
              "sale_context": sale_context, "seed_user_id": f"u{i:05d}"}
    return raw, extras


# --------------------------------------------------------------------------- situations

def _active(obj: dict, now: datetime) -> bool:
    exp = obj.get("expires_at")
    return exp is None or _parse(exp) > now or bool(obj.get("is_in_grace_period"))


def situation(raw: dict, now: datetime) -> str:
    """Coarse situation label for reporting / demo picking (Builder 2 owns the real classifier)."""
    subs, nons, als = raw["subscriptions"], raw["non_subscriptions"], raw["access_levels"]
    if any(a["store"] == "adapty" and _active(a, now) for a in als):
        return "GRANTED_BY_DEVELOPER"
    if not subs and not nons:
        return "NO_PURCHASE"
    if any(not n["is_refund"] for n in nons):
        return "LIFETIME"
    active = [s for s in subs if _active(s, now)]
    if active:
        s = max(active, key=lambda s: s["expires_at"])
        if s["billing_issue_detected_at"]:
            return "GRACE_PERIOD" if s["is_in_grace_period"] else "BILLING_RETRY"
        if (s["offer"] or {}).get("type") == "free_trial":
            return "TRIAL_CANCELLED" if s["renewal_cancelled_at"] else "TRIAL_ACTIVE"
        return "CANCELLED_PAID_UP" if s["renewal_cancelled_at"] else "ACTIVE_RENEWING"
    last = max(subs + nons, key=lambda s: s["purchased_at"])
    if last.get("is_refund") or last.get("cancellation_reason") == "refund":
        return "REFUNDED"
    if last.get("cancellation_reason") == "billing_error" or last.get("billing_issue_detected_at"):
        return "EXPIRED_BILLING_ERROR"
    if last.get("renewal_cancelled_at"):
        return "EXPIRED_CANCELLED"
    return "EXPIRED_NO_RENEWAL_SENT"  # auto-renew on, but the seed sent no renewal after the replay end


# --------------------------------------------------------------------------- build all

def build_all(now: datetime | None = None, repo: Path = SEED_REPO) -> dict:
    data = load_dataset(repo)
    replay_end = derive_replay_end(data, repo)
    now = now or replay_end + timedelta(days=1)
    offline = load_offline_users(repo)
    prices = price_book(data)
    profiles, extras = {}, {}
    for u in data["users"]:
        raw, ex = build_profile(u, replay_end, now, offline, prices)
        profiles[raw["customer_user_id"]] = raw
        extras[raw["customer_user_id"]] = ex
    meta = {"source": "adapty-seed-data-hack: data/lumen_dataset.json.gz v1 + data/offline/*.csv.gz",
            "replay_end": iso(replay_end), "now": iso(now), "users": len(profiles),
            "cuid_format": CUID_PREFIX + "<i:05d>"}
    return {"meta": meta, "profiles": profiles, "extras": extras}


def _days_since_expiry(p: dict, now: datetime) -> float:
    exp = max(_parse(s["expires_at"]) for s in p["subscriptions"])
    return (now - exp).total_seconds() / 86400


def pick_demo_users(bundle: dict) -> tuple[list[dict], list]:
    now = _parse(bundle["meta"]["now"])
    profiles, extras = bundle["profiles"], bundle["extras"]
    sit = {c: situation(p, now) for c, p in profiles.items()}

    def first(pred):
        return next((c for c in sorted(profiles) if pred(c)), None)

    def days(a: str | None) -> float | None:
        return None if a is None else round((_parse(a) - now).total_seconds() / 86400, 1)

    picks = []

    def add(cuid, why, note=""):
        if not cuid:
            return
        p, ex = profiles[cuid], extras[cuid]
        last = max(p["subscriptions"] + p["non_subscriptions"], key=lambda s: s["purchased_at"], default=None)
        picks.append({"customer_user_id": cuid, "seed_user_id": ex["seed_user_id"], "situation": sit[cuid],
                      "why": why, "platform": ex["platform"], "store_country": ex["store_country"],
                      "locale": ex["locale"], "product": last and last["store_product_id"],
                      "price": last and ex["prices"].get(last["store_product_id"]),
                      "expires_at": last and last.get("expires_at"),
                      "days_from_now_to_expiry": last and days(last.get("expires_at")),
                      "sale_context": ex["sale_context"], "note": note})

    u9 = f"{CUID_PREFIX}00009"
    s9 = profiles[u9]["subscriptions"][-1]
    add(u9, "Serbian iOS annual (Pro Annual), cancelled but paid up",
        f"bought {s9['purchased_at'][:10]}, auto-renew off {(s9['renewal_cancelled_at'] or '')[:10]}, "
        f"paid up until {s9['expires_at'][:10]} = {days(s9['expires_at'])} days after now "
        f"({round((_parse(s9['expires_at']) - _parse(bundle['meta']['replay_end'])).total_seconds() / 86400, 1)}"
        f" after replay end)")

    es = sorted((round(_days_since_expiry(p, now), 1), c) for c, p in profiles.items()
                if extras[c]["locale"] == "es_MX" and extras[c]["platform"] == "Android"
                and sit[c] == "EXPIRED_BILLING_ERROR")
    if es:
        d, c = min(es, key=lambda x: abs(x[0] - 7) if x[0] <= 14 else 100 + x[0])
        paid = profiles[c]["total_revenue_usd"] > 0
        note = (f"expired {d} days before now (within 14); "
                + ("had paid before" if paid else "trial that failed to convert, never paid") if d <= 14 else
                f"NO es_MX Android user expired on a billing error within 14 days; closest: {d} days before now")
        add(c, "es_MX Android, expired on a billing error (grant-eligible)", note)
    add(first(lambda c: sit[c] == "REFUNDED" and extras[c]["platform"] == "iOS"), "refunded (App Store)")
    add(first(lambda c: sit[c] == "REFUNDED" and extras[c]["platform"] == "Android"), "refunded (Google Play)")
    add(first(lambda c: sit[c] == "LIFETIME"), "lifetime purchase")
    add(first(lambda c: sit[c] == "ACTIVE_RENEWING" and len(profiles[c]["subscriptions"]) == 1
              and days(profiles[c]["subscriptions"][0]["expires_at"]) > 2), "active, auto-renewing")
    add(first(lambda c: sit[c] == "TRIAL_ACTIVE" and days(profiles[c]["subscriptions"][-1]["expires_at"]) > 1)
        or first(lambda c: sit[c] == "TRIAL_ACTIVE"), "free trial, will convert")
    add(first(lambda c: sit[c] == "TRIAL_CANCELLED"), "free trial, auto-renew off")
    add(first(lambda c: sit[c] == "EXPIRED_CANCELLED"), "expired after voluntary cancel")
    add(first(lambda c: sit[c] == "NO_PURCHASE"), "never purchased")
    return picks, es


def write_outputs(bundle: dict, out: Path = DATA_DIR) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with gzip.open(out / RAW_FILE, "wt", encoding="utf-8") as f:
        json.dump(bundle, f, separators=(",", ":"))
    now = _parse(bundle["meta"]["now"])
    counts = Counter(situation(p, now) for p in bundle["profiles"].values())
    picks, es = pick_demo_users(bundle)
    for d in picks:
        d["display_name"] = f"{NAMES.get(d['locale'], 'User')} ({d['locale']}, {d['seed_user_id']})"
        d["scenario"] = _scenario(d)
    demo = {"meta": bundle["meta"], "population": dict(counts.most_common()), "users": picks,
            "es_MX_android_expired_billing_error_days_since_expiry": es}
    (out / DEMO_FILE).write_text(json.dumps(demo, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return demo


NAMES = {"sr_RS": "Marko", "es_MX": "Lucía", "en_US": "Jake", "en_AU": "Chloe", "en_CA": "Emma", "en_GB": "Oliver",
         "de_DE": "Lena", "pt_BR": "João", "fr_FR": "Camille", "hi_IN": "Aarav", "pl_PL": "Kasia", "ja_JP": "Yuki",
         "tr_TR": "Elif", "nl_NL": "Daan", "sv_SE": "Astrid"}
STORE_NAMES = {"iOS": "App Store", "Android": "Google Play"}


def _scenario(d: dict) -> str:
    sit, store = d["situation"], STORE_NAMES.get(d["platform"], d["platform"])
    n = d["days_from_now_to_expiry"]
    product = product_title(d["product"]) if d["product"] else None
    if sit == "CANCELLED_PAID_UP":
        return f"{product} ({store}), cancelled, paid up for {int(n)} more days"
    if sit == "EXPIRED_BILLING_ERROR":
        return f"{product} ({store}), payment failed, access expired {int(-n)} days ago"
    if sit == "REFUNDED":
        return f"{product} ({store}), refunded"
    if sit == "LIFETIME":
        return f"{product} ({store})"
    if sit == "ACTIVE_RENEWING":
        return f"{product} ({store}), active, renews automatically"
    if sit == "TRIAL_ACTIVE":
        return f"{product} ({store}), free trial ending in {int(n)} days, will convert"
    if sit == "TRIAL_CANCELLED":
        return f"{product} ({store}), free trial, cancelled"
    if sit == "EXPIRED_CANCELLED":
        return f"{product} ({store}), cancelled, expired {int(-n)} days ago"
    if sit == "NO_PURCHASE":
        return f"No purchase ({store})"
    return sit


def demo_users(path: Path | str | None = None) -> list[dict]:
    """For GET /api/demo/users: customer_user_id, display_name, locale, scenario, situation, platform, ..."""
    p = Path(path or DATA_DIR / DEMO_FILE)
    users = json.loads(p.read_text(encoding="utf-8"))["users"]
    for d in users:
        d.setdefault("display_name", f"{NAMES.get(d['locale'], 'User')} ({d['locale']}, {d['seed_user_id']})")
        d.setdefault("scenario", _scenario(d))
    return users


def demo_now(path: Path | str | None = None) -> datetime:
    """The clock the seeded snapshot was built for (meta.now); use as CASEDESK_NOW in demos."""
    p = Path(path or DATA_DIR / DEMO_FILE)
    return _parse(json.loads(p.read_text(encoding="utf-8"))["meta"]["now"])


def load_raw(path: Path | str | None = None) -> dict:
    """{"meta", "profiles", "extras"} from data/profiles_raw.json.gz (or env ADAPTY_PROFILES_RAW)."""
    path = Path(path or os.environ.get("ADAPTY_PROFILES_RAW") or DATA_DIR / RAW_FILE)
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    ap = argparse.ArgumentParser(description="Build data/profiles_raw.json.gz + data/demo_users.json")
    ap.add_argument("--now", help="ISO datetime; default replay end + 1 day")
    ap.add_argument("--seed-repo", default=str(SEED_REPO))
    ap.add_argument("--out", default=str(DATA_DIR))
    a = ap.parse_args()
    bundle = build_all(_parse(a.now) if a.now else None, Path(a.seed_repo))
    demo = write_outputs(bundle, Path(a.out))
    print(json.dumps({"meta": demo["meta"], "population": demo["population"]}, indent=2))
    for d in demo["users"]:
        print(f"  {d['customer_user_id']}  {d['situation']:<24} {d['platform']:<7} {d['locale']:<6} "
              f"{d['product']}  exp {d['expires_at']} ({d['days_from_now_to_expiry']} d)  {d['note']}")
    print("  es_MX Android expired-billing-error (days since expiry):", demo[
        "es_MX_android_expired_billing_error_days_since_expiry"][:12])


if __name__ == "__main__":
    main()
