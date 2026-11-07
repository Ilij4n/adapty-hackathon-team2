/* Case Desk developer console. Auth: X-Console-Token (sessionStorage) or the demo cookie set by /console. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const S = { token: sessionStorage.getItem("casedesk_console") || "", selected: new URLSearchParams(location.search).get("case"), cases: [], approvals: [], filter: "all", sig: { list: "", detail: "" }, timer: null };

  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json" };
    if (S.token) headers["X-Console-Token"] = S.token;
    const r = await fetch(path, { ...opts, headers, credentials: "same-origin" });
    let body = null; try { body = await r.json(); } catch { /* */ }
    if (!r.ok) { const e = new Error((body && body.detail) || r.statusText); e.status = r.status; throw e; }
    return body;
  }
  const fmtTime = (iso) => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago"; return fmtTime(iso); };
  function toast(text, ms = 3200) { const t = el("div", "toast", text); t.setAttribute("role", "status"); document.body.append(t); setTimeout(() => t.remove(), ms); }

  // "llm_error:..." entries mean the model was unreachable and the template answered; they are not rule breaks.
  const isLlmErr = (x) => /^llm_error\b/i.test(String(x));
  const realViolations = (v) => (v || []).filter((x) => !isLlmErr(x));
  const llmErrors = (v, field) => [...(field ? [field] : []), ...(v || []).filter(isLlmErr)].filter((x, i, a) => a.indexOf(x) === i);
  const REASON = { user_requested_human: "asked for a person", privacy_request: "privacy / data request" };
  const reasonText = (r) => REASON[r] || String(r || "escalated").replace(/_/g, " ");
  const FILTERS = [["all", "All", () => true], ["escalated", "Escalated", (c) => c.escalated],
    ["privacy", "Privacy", (c) => c.privacy], ["waiting", "Approval waiting", (c) => c.pending_approval]];
  const auto = (n) => { n.dir = "auto"; return n; };
  function badgeEl(b) { const s = el("span", "badge " + ((b && b.tone) || "info"), (b && b.label) || "—"); if (b && b.code) s.title = b.code; return s; }
  function saleEl(sc) {
    const w = el("span", "sale"); sc = sc || {};
    w.append(el("span", "ch", (sc.acquisition_channel || "unknown channel").replace(/_/g, " ")));
    if (sc.placement || sc.flow) {
      w.append(el("span", "pl", [sc.placement, sc.flow].filter(Boolean).join(" / ")));
      const si = el("span", "si", "stand-in"); si.title = "Placement and flow come from the seed CSV — a stand-in for Adapty paywall data."; w.append(si);
    }
    w.title = "Sale context: acquisition channel · placement / flow";
    return w;
  }

  // ------------------------------------------------------------ list + queue
  function renderList() {
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
    $("#qCount").textContent = pend.length; $("#qEmpty").hidden = pend.length > 0;
    const q = $("#queue"); q.textContent = "";
    for (const a of pend) {
      const c = byCase[a.case_id] || {};
      const li = el("li", "q-item");
      const who = el("div", "who"); who.append(el("b", null, a.customer_user_id), el("span", "c-time", ago(a.created_at)));
      const what = el("div", "what", `${a.days || 3} days of ${a.access_level_id} — ${(c.state_badge && c.state_badge.label) || "state unknown"}`);
      if (a.status === "failed") what.append(el("div", "fail", "Adapty grant failed: " + ((a.result && a.result.error) || "error") + " — retry it."));
      const row = el("div", "row");
      const ok = el("button", "btn small approve", a.status === "failed" ? "Retry grant" : "Approve"); ok.onclick = () => decide(a.id, "approve", ok);
      const no = el("button", "btn small deny", "Deny"); no.onclick = () => decide(a.id, "deny", no);
      const open = el("button", "btn small ghost", "Open case"); open.onclick = () => select(a.case_id);
      row.append(ok, no, open); li.append(who, what, row); q.append(li);
    }
    const fb = $("#filters"); fb.textContent = "";
    for (const [key, label, pred] of FILTERS) {
      const n = S.cases.filter(pred).length;
      const b = el("button", "filt" + (key === "escalated" && n ? " hot" : "") + (key === "privacy" && n ? " priv" : ""), `${label} ${n}`);
      b.type = "button"; b.setAttribute("aria-pressed", String(S.filter === key));
      b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
      fb.append(b);
    }
    const shown = S.cases.filter((FILTERS.find((f) => f[0] === S.filter) || FILTERS[0])[2]);
    $("#cCount").textContent = shown.length === S.cases.length ? S.cases.length : `${shown.length} / ${S.cases.length}`;
    $("#cEmpty").hidden = shown.length > 0;
    const list = $("#cases"); list.textContent = "";
    for (const c of shown) {
      const li = el("li"); const b = el("button", "c-item"); b.type = "button";
      b.setAttribute("aria-current", String(c.id === S.selected));
      const top = el("div", "c-top"); top.append(el("b", null, c.customer_user_id), el("span", "c-time", ago(c.updated_at)));
      const tags = el("div", "c-tags");
      if (c.language) tags.append(el("span", "tag lang", c.language));
      if (c.intent) tags.append(el("span", "tag intent", c.intent));
      tags.append(badgeEl(c.state_badge));
      if (c.pending_approval) tags.append(el("span", "tag wait", "approval waiting"));
      if (c.privacy) tags.append(el("span", "tag priv", "privacy request"));
      else if (c.escalated) tags.append(el("span", "tag esc", "escalated: " + (c.escalation_reasons || []).map(reasonText).join(", ")));
      const sale = el("div", "c-tags"); sale.append(saleEl(c.sale_context));
      b.append(top, auto(el("div", "c-msg", c.first_message || "…")), tags, sale);
      b.onclick = () => select(c.id);
      li.append(b); list.append(li);
    }
  }

  // ------------------------------------------------------------ detail
  function kvTable(obj) {
    const t = el("table", "kv"); const tb = el("tbody");
    Object.entries(obj || {}).forEach(([k, v]) => { const tr = el("tr"); tr.append(el("th", null, k), el("td", null, typeof v === "string" ? v : JSON.stringify(v))); tb.append(tr); });
    t.append(tb); const w = el("div", "scroll-x"); w.append(t); return w;
  }
  function panel(title, ...kids) { const p = el("section", "panel"); p.append(el("h3", null, title), ...kids); return p; }

  function renderDetail(d) {
    const box = $("#detail"); box.textContent = "";
    const c = d.case;
    const head = el("div", "d-head");
    head.append(el("h2", null, c.customer_user_id));
    const meta = el("div", "meta");
    meta.append(badgeEl(c.state));
    if (c.language) meta.append(el("span", "tag lang", c.language));
    if (c.intent && c.intent.type) meta.append(el("span", "tag intent", c.intent.type));
    if (c.intent && c.intent.injection_suspected) meta.append(el("span", "tag wait", "injection suspected — ignored"));
    const fl = d.flags || {};
    if (fl.privacy) meta.append(el("span", "tag priv", "privacy request — handle by the data-protection process"));
    (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy).forEach((r) => meta.append(el("span", "tag esc", "escalated: " + reasonText(r))));
    meta.append(saleEl(c.sale_context));
    head.append(meta);
    if (c.state && c.state.evidence && c.state.evidence.length) head.append(el("div", "evid", "evidence: " + c.state.evidence.join(" · ")));
    head.append(el("div", "evid", `case ${c.id} · opened ${fmtTime(c.created_at)}`));
    box.append(head);

    // conversation
    const convo = el("div", "convo");
    for (const m of d.messages) {
      const meta = m.meta || {};
      const pending = meta.status === "pending";
      const t = el("div", `turn ${m.role}${pending ? " pending" : ""}`);
      const who = el("div", "who"); who.append(el("span", null, m.role === "user" ? "user" : m.role === "system" ? "system" : "Case Desk"), el("span", null, fmtTime(m.created_at)));
      if (m.role === "assistant" && !pending && meta.status !== "error") {
        who.append(el("span", "vflag " + (meta.used_fallback ? "" : "ok"), meta.used_fallback ? "template fallback" : "LLM reply passed"));
        const rv = realViolations(meta.violations), le = llmErrors(meta.violations, meta.llm_error);
        if (rv.length) who.append(el("span", "vflag bad", rv.length + " violation(s)"));
        if (le.length) { const f = el("span", "vflag", "LLM unavailable"); f.title = le.join("\n"); who.append(f); }
      }
      if (meta.status === "error") who.append(el("span", "vflag bad", "pipeline error"));
      if (meta.abandoned) { const f = el("span", "vflag", "abandoned"); f.title = "The user switched away before this reply arrived; they never saw it."; who.append(f); }
      t.append(who, auto(el("div", "txt", pending ? "writing the reply…" : m.text)));
      convo.append(t);
    }

    // actions
    const acts = el("div", "acts");
    for (const a of c.actions || []) {
      const x = el("div", "act"); const b = el("b", a.requires_approval ? "needs" : null, a.kind + (a.requires_approval ? " · needs approval" : ""));
      x.append(b); if (a.params && Object.keys(a.params).length) x.append(el("code", null, JSON.stringify(a.params))); acts.append(x);
    }
    if (!acts.children.length) acts.append(el("p", "empty", c.validator ? "No actions — the reply answers on its own (e.g. thanks, another app)." : "No actions yet."));

    // claims the user made (typed, sanitised) — compare with the FactSheet
    const claims = (c.intent && c.intent.claims) || {};
    const claimsBox = Object.keys(claims).length ? kvTable(claims) : el("p", "empty", "No specific claims in the user's messages.");

    // validator
    const v = c.validator || {};
    const ver = el("div", "verdict");
    if (c.validator) {
      ver.append(el("span", "vflag " + (v.used_fallback ? "" : "ok"), v.used_fallback ? "fallback used: yes" : "fallback used: no"));
      const rv = realViolations(v.violations), le = llmErrors(v.violations, v.llm_error);
      ver.append(el("span", "vflag " + (rv.length ? "bad" : "ok"), `violations: ${rv.length}`));
      if (le.length) ver.append(el("span", "vflag", "LLM unavailable — template answered"));
      if (rv.length) { const ul = el("ul"); rv.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
      if (le.length) { const ul = el("ul", "info"); le.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
    } else ver.append(el("span", "empty", "Reply still being written."));

    // approvals
    const ap = el("div", "acts");
    for (const a of d.approvals) {
      const w = el("div", "appr");
      const r1 = el("div", "row"); r1.append(el("span", "st " + a.status, a.status), el("small", null, `${a.days || "?"} days · ${a.access_level_id} · requested ${fmtTime(a.created_at)}`));
      w.append(r1);
      if (a.status === "pending" || a.status === "failed") {
        if (a.status === "failed") w.append(el("small", "fail", "Adapty grant failed: " + ((a.result && a.result.error) || "error")));
        const r2 = el("div", "row"); r2.style.justifyContent = "flex-start";
        const ok = el("button", "btn small approve", a.status === "failed" ? "Retry grant via Adapty" : "Approve — grant via Adapty"); ok.onclick = () => decide(a.id, "approve", ok);
        const no = el("button", "btn small deny", "Deny"); no.onclick = () => decide(a.id, "deny", no);
        r2.append(ok, no); w.append(r2);
      } else if (a.result && a.result.expires_at) w.append(el("small", null, "Granted until " + fmtTime(a.result.expires_at)));
      else if (a.result && a.result.error) w.append(el("small", null, a.result.error));
      ap.append(w);
    }

    const left = el("div", "stack"); left.append(panel("Conversation", convo));
    const right = el("div", "stack");
    if (d.approvals.length) right.append(panel("Approval", ap));
    right.append(panel("Actions decided by policy", acts), panel("What the user claims", claimsBox), panel("Validator", ver), panel("FactSheet — the only facts the reply may use", kvTable(c.facts)));
    const g = el("div", "grid2"); g.append(left, right); box.append(g);

    const au = el("details", "audit panel"); au.append(el("summary", null, `Audit log (${d.audit.length})`));
    const ol = el("ol"); d.audit.forEach((e) => { const li = el("li"); li.append(el("span", null, fmtTime(e.ts)), el("span", null, `${e.actor} · ${e.event}`), el("span", null, JSON.stringify(e.detail))); ol.append(li); });
    au.append(ol); box.append(au);
  }

  async function select(id) {
    S.selected = id; S.sig.detail = "";
    history.replaceState(null, "", "?case=" + encodeURIComponent(id));
    renderList();
    await refreshDetail();
    if (matchMedia("(max-width: 979px)").matches) $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function refreshDetail() {
    if (!S.selected) return;
    try {
      const d = await api("/api/cases/" + encodeURIComponent(S.selected));
      const sig = JSON.stringify(d);
      if (sig !== S.sig.detail) { const open = document.querySelector("details.audit")?.open; S.sig.detail = sig; renderDetail(d); if (open) document.querySelector("details.audit").open = true; }
    } catch (e) { if (e.status === 404) { S.selected = null; } else throw e; }
  }

  async function decide(id, verb, btn) {
    btn.disabled = true;
    try {
      const r = await api(`/api/approvals/${id}/${verb}`, { method: "POST" });
      const a = r.approval;
      toast(verb === "approve" ? `Granted ${a.access_level_id} to ${a.customer_user_id} via Adapty` : `Denied — ${a.customer_user_id} will see it`);
      await refresh();
    } catch (e) {
      const msg = e.message || "Failed";
      toast(msg, 7000); btn.disabled = false;
      const host = btn.closest(".appr, .q-item");
      if (host) { host.querySelector(".refused")?.remove(); const r = el("p", "refused", msg); r.setAttribute("role", "alert"); host.append(r); }
    }
  }

  // ------------------------------------------------------------ refresh loop
  async function refresh() {
    const [cs, ap] = await Promise.all([api("/api/cases"), api("/api/approvals")]);
    S.cases = cs.cases; S.approvals = ap.approvals;
    const sig = JSON.stringify([S.cases, S.approvals, S.selected]);
    if (sig !== S.sig.list) { S.sig.list = sig; renderList(); }
    await refreshDetail();
    $("#live").textContent = "updated " + new Date().toLocaleTimeString();
  }
  async function start() {
    try {
      const meta = await api("/api/console/meta");
      $("#gate").hidden = true; $("#app").hidden = false;
      const m = $("#topMeta"); m.textContent = "";
      if (meta.demo) m.append(el("span", "pill demo", "demo mode"));
      Object.entries(meta.modules || {}).forEach(([k, v]) => { const p = el("span", "pill" + (v === "stub" ? " stub" : ""), `${k.replace("_", ".")}: ${v}`); m.append(p); });
      await refresh();
      clearInterval(S.timer);
      S.timer = setInterval(() => refresh().catch(() => { $("#live").textContent = "offline — retrying"; }), 3000);
    } catch (e) {
      if (e.status === 401) { $("#gate").hidden = false; $("#app").hidden = true; if (S.token) $("#gateErr").hidden = false; $("#tok").focus(); }
      else { $("#live").textContent = "can't reach the server"; setTimeout(start, 3000); }
    }
  }
  // the header wraps on narrower desktops; the sticky case list sits just below whatever height it has
  const topEl = document.querySelector(".top");
  new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", topEl.offsetHeight + "px")).observe(topEl);
  $("#gateForm").addEventListener("submit", (e) => {
    e.preventDefault(); S.token = $("#tok").value.trim(); sessionStorage.setItem("casedesk_console", S.token); start();
  });
  start();
})();
