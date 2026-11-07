"""sqlite storage: cases, messages, approvals, audit log. Path from CASEDESK_DB (default ./var/casedesk.db)."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  customer_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  language TEXT,
  intent TEXT,          -- JSON of the latest Intent
  state TEXT,           -- JSON {code, label, evidence}
  facts TEXT,           -- JSON FactSheet.fields
  actions TEXT,         -- JSON list of Action
  sale_context TEXT,    -- JSON
  validator TEXT        -- JSON {used_fallback, violations, status}
);
CREATE INDEX IF NOT EXISTS cases_user ON cases(customer_user_id, updated_at);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  role TEXT NOT NULL,   -- user | assistant | system
  text TEXT NOT NULL,
  meta TEXT,            -- JSON (assistant: status pending|ready, used_fallback, violations)
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_case ON messages(case_id, id);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  customer_user_id TEXT NOT NULL,
  access_level_id TEXT NOT NULL,
  days INTEGER,
  expires_at TEXT,
  status TEXT NOT NULL,   -- pending | approved | denied | failed
  created_at TEXT NOT NULL,
  decided_at TEXT,
  result TEXT
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  event TEXT NOT NULL,
  case_id TEXT,
  detail TEXT
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def default_path() -> Path:
    env = os.environ.get("CASEDESK_DB")
    return Path(env) if env else Path.cwd() / "var" / "casedesk.db"


class Store:
    def __init__(self, path: str | Path | None = None):
        p = str(path) if path is not None else str(default_path())
        if p != ":memory:":
            Path(p).parent.mkdir(parents=True, exist_ok=True)
        self.path = p
        self._lock = threading.RLock()
        self._db = sqlite3.connect(p, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        with self._lock:
            self._db.executescript(SCHEMA)
            self._db.commit()

    # ------------------------------------------------------------------ helpers
    def _x(self, sql: str, args: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._db.execute(sql, args)
            self._db.commit()
            return cur

    def _all(self, sql: str, args: tuple = ()) -> list[dict]:
        with self._lock:
            return [dict(r) for r in self._db.execute(sql, args).fetchall()]

    @staticmethod
    def _j(v) -> str:
        return json.dumps(v, default=str, ensure_ascii=False)

    # ------------------------------------------------------------------ cases
    def create_case(self, customer_user_id: str, sale_context: dict, case_id: str | None = None,
                    at: str | None = None) -> str:
        """`case_id` / `at` are for the demo seeder (stable ids, back-dated times); live cases leave them unset."""
        cid = case_id or "c_" + uuid.uuid4().hex[:10]
        t = at or now_iso()
        self._x("INSERT INTO cases(id, customer_user_id, created_at, updated_at, sale_context) VALUES (?,?,?,?,?)",
                (cid, customer_user_id, t, t, self._j(sale_context)))
        return cid

    def update_case(self, case_id: str, *, at: str | None = None, **fields) -> None:
        cols = []
        vals = []
        for k, v in fields.items():
            cols.append(f"{k}=?")
            vals.append(v if isinstance(v, str) or v is None else self._j(v))
        cols.append("updated_at=?")
        vals.append(at or now_iso())
        self._x(f"UPDATE cases SET {', '.join(cols)} WHERE id=?", (*vals, case_id))

    def get_case(self, case_id: str) -> dict | None:
        rows = self._all("SELECT * FROM cases WHERE id=?", (case_id,))
        return self._decode_case(rows[0]) if rows else None

    def list_cases(self, limit: int = 200) -> list[dict]:
        return [self._decode_case(r) for r in
                self._all("SELECT * FROM cases ORDER BY updated_at DESC, created_at DESC LIMIT ?", (limit,))]

    def user_cases(self, customer_user_id: str) -> list[dict]:
        return [self._decode_case(r) for r in self._all(
            "SELECT * FROM cases WHERE customer_user_id=? ORDER BY created_at", (customer_user_id,))]

    @staticmethod
    def _decode_case(r: dict) -> dict:
        for k in ("intent", "state", "facts", "actions", "sale_context", "validator"):
            if r.get(k):
                try:
                    r[k] = json.loads(r[k])
                except ValueError:
                    pass
        return r

    # ------------------------------------------------------------------ messages
    def add_message(self, case_id: str, role: str, text: str, meta: dict | None = None, at: str | None = None) -> int:
        cur = self._x("INSERT INTO messages(case_id, role, text, meta, created_at) VALUES (?,?,?,?,?)",
                      (case_id, role, text, self._j(meta or {}), at or now_iso()))
        return int(cur.lastrowid)

    def update_message(self, msg_id: int, text: str, meta: dict) -> None:
        self._x("UPDATE messages SET text=?, meta=? WHERE id=?", (text, self._j(meta), msg_id))

    def get_message(self, msg_id: int) -> dict | None:
        rows = self._all("SELECT * FROM messages WHERE id=?", (msg_id,))
        if not rows:
            return None
        rows[0]["meta"] = json.loads(rows[0]["meta"] or "{}")
        return rows[0]

    def messages(self, case_id: str) -> list[dict]:
        out = self._all("SELECT * FROM messages WHERE case_id=? ORDER BY id", (case_id,))
        for m in out:
            m["meta"] = json.loads(m["meta"] or "{}")
        return out

    # ------------------------------------------------------------------ approvals
    # Approval timestamps take `at` from the caller: the engine's clock (CASEDESK_NOW in demo), so the 90-day grant
    # rule compares like with like. Everything else is stamped with the real clock.
    def create_approval(self, case_id: str, customer_user_id: str, access_level_id: str, days: int | None,
                        expires_at: str | None, at: str | None = None) -> str:
        aid = "a_" + uuid.uuid4().hex[:10]
        self._x("INSERT INTO approvals(id, case_id, customer_user_id, access_level_id, days, expires_at, status,"
                " created_at) VALUES (?,?,?,?,?,?,?,?)",
                (aid, case_id, customer_user_id, access_level_id, days, expires_at, "pending", at or now_iso()))
        return aid

    def create_approval_once(self, case_id: str, customer_user_id: str, access_level_id: str, days: int | None,
                             expires_at: str | None, at: str | None = None) -> tuple[str, bool]:
        """(approval id, created?): the user's open (pending or failed) approval if there is one, else a new one. Atomic, so two
        concurrent chats from one user cannot both create a pending grant."""
        with self._lock:
            # A failed grant (Adapty error) is still an open request the team can retry: reuse it too.
            rows = self._all("SELECT id FROM approvals WHERE customer_user_id=? AND status IN ('pending', 'failed') "
                             "ORDER BY created_at DESC LIMIT 1", (customer_user_id,))
            if rows:
                return rows[0]["id"], False
            return self.create_approval(case_id, customer_user_id, access_level_id, days, expires_at, at), True

    def get_approval(self, aid: str) -> dict | None:
        rows = self._all("SELECT * FROM approvals WHERE id=?", (aid,))
        return self._decode_appr(rows[0]) if rows else None

    def list_approvals(self, status: str | None = None) -> list[dict]:
        if status:
            rows = self._all("SELECT * FROM approvals WHERE status=? ORDER BY created_at DESC", (status,))
        else:
            rows = self._all("SELECT * FROM approvals ORDER BY created_at DESC")
        return [self._decode_appr(r) for r in rows]

    def user_approvals(self, customer_user_id: str) -> list[dict]:
        return [self._decode_appr(r) for r in self._all(
            "SELECT * FROM approvals WHERE customer_user_id=? ORDER BY created_at", (customer_user_id,))]

    def case_approvals(self, case_id: str) -> list[dict]:
        return [self._decode_appr(r) for r in self._all(
            "SELECT * FROM approvals WHERE case_id=? ORDER BY created_at", (case_id,))]

    def decide_approval(self, aid: str, status: str, result: dict | None = None, at: str | None = None,
                        from_statuses: tuple[str, ...] = ("pending",)) -> bool:
        """Atomically move an approval in one of `from_statuses` (default: pending) to `status`. False otherwise."""
        marks = ",".join("?" * len(from_statuses))
        cur = self._x(f"UPDATE approvals SET status=?, decided_at=?, result=? WHERE id=? AND status IN ({marks})",
                      (status, at or now_iso(), self._j(result or {}), aid, *from_statuses))
        return cur.rowcount == 1

    def set_approval_result(self, aid: str, status: str, result: dict) -> None:
        self._x("UPDATE approvals SET status=?, result=? WHERE id=?", (status, self._j(result), aid))

    @staticmethod
    def _decode_appr(r: dict) -> dict:
        if r.get("result"):
            try:
                r["result"] = json.loads(r["result"])
            except ValueError:
                pass
        return r

    # ------------------------------------------------------------------ audit
    def audit(self, actor: str, event: str, case_id: str | None = None, detail: dict | None = None,
              at: str | None = None) -> None:
        self._x("INSERT INTO audit(ts, actor, event, case_id, detail) VALUES (?,?,?,?,?)",
                (at or now_iso(), actor, event, case_id, self._j(detail or {})))

    def audit_log(self, case_id: str | None = None, limit: int = 200) -> list[dict]:
        if case_id:
            rows = self._all("SELECT * FROM audit WHERE case_id=? ORDER BY id DESC LIMIT ?", (case_id, limit))
        else:
            rows = self._all("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (limit,))
        for r in rows:
            r["detail"] = json.loads(r["detail"] or "{}")
        return rows
