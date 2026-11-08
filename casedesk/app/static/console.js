/* Case Desk developer console. Auth: X-Console-Token (sessionStorage) or the demo cookie set by /console.
   Layout: queue + cases on the left; one plain-English case card on the right. Everything technical
   (policy kinds, validator, FactSheet, claims, audit log, module status) lives in one collapsed "Details". */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const S = { token: sessionStorage.getItem("casedesk_console") || "", selected: new URLSearchParams(location.search).get("case"), cases: [], approvals: [], filter: "all", sig: { list: "", detail: "" }, timer: null, names: {}, modules: {} };

  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json" };
    if (S.token) headers["X-Console-Token"] = S.token;
    const r = await fetch(path, { ...opts, headers, credentials: "same-origin" });
    let body = null; try { body = await r.json(); } catch { /* */ }
    if (!r.ok) { const e = new Error((body && body.detail) || r.statusText); e.status = r.status; throw e; }
    return body;
  }
  // Demo clock: under CASEDESK_NOW the server stamps everything with its demo date (4 Nov 2026, ticking at real speed).
  // Shift this page's own "now" (Date.now() and new Date()) by the same amount, so "now" / "3 min" labels and
  // same-day checks in every design variant compare against the server's clock, not the browser's.
  function syncClock(meta, sentAt) {
    if (!meta || !meta.server_now || !meta.clock || meta.clock === "real") return;
    const server = new RealDate(meta.server_now).getTime();
    if (isNaN(server)) return;
    // server_now has whole seconds; take the request's midpoint as "when the server read it"
    const off = server - (sentAt + RealDate.now()) / 2;
    if (Math.abs(off) < 2000) return;
    clockOffset = off;
    if (window.Date === RealDate) {
      window.Date = class extends RealDate {
        constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + clockOffset); }
        static now() { return RealDate.now() + clockOffset; }
      };
    }
  }
  const RealDate = window.Date; let clockOffset = 0;
  const fmtTime = (iso) => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago"; return fmtTime(iso); };
  function toast(text, ms = 3200) { const t = el("div", "toast", text); t.setAttribute("role", "status"); document.body.append(t); setTimeout(() => t.remove(), ms); }

  // ------------------------------------------------------------ plain-English helpers
  // Dates: FactSheet values are ISO dates ("2026-10-22") -> "22 Oct" (year only when it isn’t this year’s).
  function day(iso, withTime) {
    if (!iso) return "";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
    if (isNaN(d)) return String(iso);
    const o = { day: "numeric", month: "short" };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
    if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return d.toLocaleString("en-GB", o);
  }
  const on = (iso) => (iso ? " on " + day(iso) : "");
  const until = (iso) => (iso ? " until " + day(iso) : "");
  const storeOf = (f) => { const n = (f.store_name || "").replace(/^the /i, ""); return !n ? "the store" : /^google play$/i.test(n) ? n : "the " + n; };
  // state code -> one sentence, built only from facts the case carries
  const STATE_TEXT = {
    ACTIVE_RENEWING: (f) => "Premium is active and renews by itself" + on(f.renews_on),
    CANCELLED_PAID_UP: (f) => "Cancelled, but premium stays on" + until(f.expires_on),
    TRIAL_ACTIVE: (f) => "On a free trial" + until(f.trial_ends_on || f.expires_on),
    TRIAL_CANCELLED: (f) => "Cancelled the free trial, so no charge will follow",
    GRACE_PERIOD: (f) => `${cap(storeOf(f))} couldn’t take the payment. Premium stays on for now` + until(f.grace_ends_on),
    BILLING_RETRY: (f) => `${cap(storeOf(f))} couldn’t take the payment${on(f.billing_issue_on)} and is retrying`,
    EXPIRED_BILLING_ERROR: (f) => (f.ever_charged === "yes" ? "Paid, then " : "") + `${f.ever_charged === "yes" ? storeOf(f) : cap(storeOf(f))} couldn’t take the renewal` + on(f.billing_issue_on || f.expires_on),
    EXPIRED_CANCELLED: (f) => "Cancelled, and premium ended" + on(f.expires_on),
    REFUNDED: (f) => "Got a refund" + on(f.refunded_on),
    LIFETIME: () => "Has lifetime premium",
    GRANTED_BY_DEVELOPER: (f) => "Has premium you gave" + until(f.granted_until || f.expires_on),
    NO_PURCHASE: () => "Never bought anything on this account",
    FAMILY_SHARED: () => "Gets premium through Family Sharing",
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function stateLine(state, facts) {
    const fn = state && STATE_TEXT[state.code];
    if (fn) return fn(facts || {});
    return (state && state.label) || "Still looking at the account";
  }
  // action kind -> what Case Desk did, in plain words
  const ACTION_TEXT = {
    EXPLAIN_STATUS: (p) => p.claim_contradicted ? "Explained what really happened (the account says otherwise)" : "Explained what happened",
    MANAGE_SUBSCRIPTION_LINK: () => "Sent the link to manage the subscription",
    CANCEL_STEPS: () => "Showed how to cancel",
    REFUND_PATH_APPLE: () => "Showed how to ask Apple for a refund",
    REFUND_PATH_GOOGLE: () => "Showed how to ask Google Play for a refund",
    RESTORE_PURCHASES_STEPS: () => "Showed how to restore purchases",
    UPDATE_PAYMENT_METHOD: () => "Sent the link to update payment",
    PROPOSE_GRANT: (p) => `Asked you for a ${p.days || 3}-day courtesy extension`,
    ESCALATE_TO_HUMAN: (p) => "Handed it to a person: " + reasonText(p.reason),
  };
  const actionText = (a) => (ACTION_TEXT[a.kind] || (() => cap(String(a.kind).toLowerCase().replace(/_/g, " "))))(a.params || {});
  const langName = (code) => { try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) || code; } catch { return code; } };

  // "Ava (en_US, u00239)" -> "Ava"; only demo mode has names (GET /api/demo/users)
  const nameOf = (cuid) => S.names[cuid] || "";
  const shortId = (cuid) => { const t = String(cuid).split("_").pop(); return /^\d+$/.test(t) ? t : cuid; };
  function whoEl(cuid, tag = "b") {
    const w = el(tag, "who-name"); const n = nameOf(cuid);
    if (n) { w.append(document.createTextNode(n + " "), el("span", "uid", "· " + shortId(cuid))); w.title = cuid; }
    else w.append(el("span", "uid solo", cuid));
    return w;
  }
  const callName = (cuid) => nameOf(cuid) || "this user";

  // "llm_error:..." entries mean the model was unreachable and the template answered; they are not rule breaks.
  const isLlmErr = (x) => /^llm_error\b/i.test(String(x));
  const realViolations = (v) => (v || []).filter((x) => !isLlmErr(x));
  const llmErrors = (v, field) => [...(field ? [field] : []), ...(v || []).filter(isLlmErr)].filter((x, i, a) => a.indexOf(x) === i);
  const REASON = { user_requested_human: "they asked for a person", privacy_request: "privacy / data request" };
  const reasonText = (r) => REASON[r] || String(r || "escalated").replace(/_/g, " ");
  const FILTERS = [["all", "All", () => true], ["escalated", "Escalated", (c) => c.escalated && c.status !== "resolved"],
    ["privacy", "Privacy", (c) => c.privacy], ["waiting", "Waiting", (c) => c.pending_approval],
    ["resolved", "Resolved", (c) => c.status === "resolved"]];
  const auto = (n) => { n.dir = "auto"; return n; };
  const dot = (tone) => el("span", "dot " + (tone || "info"));

  // ------------------------------------------------------------ list + queue
  function renderList() {
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
    $("#qCount").textContent = pend.length; $("#qEmpty").hidden = pend.length > 0;
    const q = $("#queue"); q.textContent = "";
    for (const a of pend) {
      // the queue is the action column: the ONE Approve / Deny for each grant lives here
      const c = byCase[a.case_id] || {};
      const who = nameOf(a.customer_user_id) || "this user";
      const what = `${a.days || 3} days of premium`;
      const li = el("li", "q-item" + (a.status === "failed" ? " failed" : ""));
      li.setAttribute("aria-current", String(a.case_id === S.selected));
      const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
      const top = el("div", "row-top"); top.append(whoEl(a.customer_user_id), el("span", "c-time", ago(a.created_at)));
      b.append(top, el("div", "line", `Wants ${what}`));
      if (c.state_badge) { const s2 = el("div", "line soft"); s2.append(dot(c.state_badge.tone), el("span", "ell", c.state_badge.label)); b.append(s2); }
      b.onclick = () => select(a.case_id);
      li.append(b);
      if (a.status === "failed") li.append(el("p", "fail", "Adapty couldn’t give it: " + ((a.result && a.result.error) || "error")));
      const row = el("div", "grant-row");
      const ok = el("button", "btn approve", a.status === "failed" ? `Try again: give ${who} ${what}` : `Give ${who} ${what}`);
      ok.type = "button"; ok.onclick = () => decide(a.id, "approve", ok);
      const no = el("button", "btn deny", "Deny"); no.type = "button"; no.onclick = () => decide(a.id, "deny", no);
      row.append(ok, no);
      li.append(row, el("p", "hint", "Nothing is granted until you approve."));
      q.append(li);
    }
    const fb = $("#filters"); fb.textContent = "";
    for (const [key, label, pred] of FILTERS) {
      const n = S.cases.filter(pred).length;
      const b = el("button", "filt" + (key === "escalated" && n ? " hot" : "") + (key === "privacy" && n ? " priv" : ""), n && key !== "all" ? `${label} ${n}` : label);
      b.type = "button"; b.setAttribute("aria-pressed", String(S.filter === key));
      b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
      fb.append(b);
    }
    const shown = S.cases.filter((FILTERS.find((f) => f[0] === S.filter) || FILTERS[0])[2]);
    $("#cCount").textContent = (shown.length === S.cases.length ? S.cases.length : `${shown.length} / ${S.cases.length}`) + (S.total > S.cases.length ? ` (newest of ${S.total})` : "");
    $("#cEmpty").hidden = shown.length > 0;
    const list = $("#cases"); list.textContent = "";
    for (const c of shown) {
      const li = el("li"); const b = el("button", "c-item"); b.type = "button";
      b.setAttribute("aria-current", String(c.id === S.selected));
      const top = el("div", "row-top"); top.append(whoEl(c.customer_user_id), el("span", "c-time", ago(c.updated_at)));
      const st = el("div", "line soft");
      st.append(dot(c.state_badge && c.state_badge.tone), el("span", "ell", (c.state_badge && c.state_badge.label) || "No status yet"));
      if (c.pending_approval) st.append(el("span", "tag wait", "waiting"));
      if (c.privacy) st.append(el("span", "tag priv", "privacy"));
      else if (c.escalated) st.append(el("span", "tag esc", "needs a person"));
      b.append(top, auto(el("div", "c-msg", c.first_message || "…")), st);
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
  function sub(title, ...kids) { const p = el("section", "sub"); p.append(el("h3", null, title), ...kids); return p; }
  function saleEl(sc) {
    const w = el("span", "sale"); sc = sc || {};
    w.append(el("span", "ch", (sc.acquisition_channel || "unknown channel").replace(/_/g, " ")));
    if (sc.placement || sc.flow) {
      w.append(el("span", "pl", [sc.placement, sc.flow].filter(Boolean).join(" / ")));
      const si = el("span", "si", "stand-in"); si.title = "Placement and flow come from the seed CSV, a stand-in for Adapty paywall data."; w.append(si);
    }
    return w;
  }

  function grantBox(a, c) {
    const f = c.facts || {};
    const who = nameOf(a.customer_user_id) || "this user";
    const what = `${a.days || f.grant_days || 3} days of premium`;
    const w = el("div", "grant " + a.status);
    if (a.status === "pending" || a.status === "failed") {
      const t = el("p", "waiting");
      t.append(el("span", "arrow", "←"), document.createTextNode(a.status === "failed"
        ? `Giving ${who} ${what} failed. Try again in the list.`
        : `Waiting for your OK on ${what} for ${who}. Approve or deny it in the list.`));
      w.append(t);
    } else if (a.status === "approved") {
      const t = el("p", "done"); t.append(el("span", "tick", "✓"), document.createTextNode("Premium given" + (a.result && a.result.expires_at ? " · expires " + day(a.result.expires_at, true) : "")));
      w.append(t);
    } else if (a.status === "denied") {
      w.append(el("p", "done no", `Denied by the team: no ${what}. ${cap(nameOf(a.customer_user_id) || "the user")} sees that in the chat.`));
    } else w.append(el("p", "done no", `${cap(what)}: ${a.status}`));
    return w;
  }

  function renderDetail(d) {
    const box = $("#detail"); box.textContent = "";
    const c = d.case; const f = c.facts || {}; const fl = d.flags || {};
    const card = el("article", "case");

    // who + status
    const head = el("header", "d-head");
    const av = el("span", "avatar", (nameOf(c.customer_user_id) || c.customer_user_id || "?").charAt(0).toUpperCase());
    const idl = el("div", "id-lines");
    const h = el("h2"); h.append(whoEl(c.customer_user_id, "span"));
    const meta = el("div", "meta", [c.language && langName(c.language), f.store_name].filter(Boolean).join(" · ") || "Language unknown");
    idl.append(h, meta); head.append(av, idl);
    card.append(head);

    const status = el("p", "status " + ((c.state && c.state.tone) || "info"));
    status.append(dot(c.state && c.state.tone), document.createTextNode(stateLine(c.state, f)));
    card.append(status);

    const v = c.validator || null;
    if (v) {
      const rv = realViolations(v.violations);
      const okp = v.used_fallback || !rv.length; // a rejected draft is replaced by the checked template
      const pill = el("span", "trust " + (okp ? "ok" : "bad"), okp ? "✓ Checked: every fact matches the account" : "Check this reply: see Details");
      card.append(pill);
    }

    // things that need a human, visible (not hidden in details)
    const alerts = [];
    if (fl.privacy) alerts.push("Privacy or data request. Handle it through your data-protection process.");
    (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy).forEach((r) => alerts.push("Needs a person: " + reasonText(r) + "."));
    if (c.intent && c.intent.injection_suspected) alerts.push("The message tried to give Case Desk orders. It was ignored.");
    alerts.forEach((t) => card.append(el("p", "alert", t)));

    // conversation
    const convo = el("div", "convo");
    for (const m of d.messages) {
      const meta = m.meta || {};
      const pending = meta.status === "pending";
      const t = el("div", `turn ${m.role}${pending ? " pending" : ""}`);
      const who = el("div", "who", (m.role === "user" ? (nameOf(c.customer_user_id) || "User") : m.role === "system" ? "System" : "Case Desk") + " · " + fmtTime(m.created_at));
      if (meta.status === "error") who.append(el("span", "vflag bad", "something went wrong"));
      if (meta.abandoned) who.append(el("span", "vflag", "never seen by the user"));
      t.append(who, auto(el("div", "txt", pending ? "writing the reply…" : m.text)));
      convo.append(t);
    }
    card.append(convo);

    // what Case Desk did
    const did = el("section", "did");
    did.append(el("h3", null, "What Case Desk did"));
    const acts = c.actions || [];
    if (acts.length) { const ul = el("ul"); acts.forEach((a) => ul.append(el("li", a.requires_approval ? "needs" : null, actionText(a)))); did.append(ul); }
    else did.append(el("p", "soft", c.validator ? "Answered the message. Nothing else was needed." : "Still working on it…"));
    card.append(did);

    // approval
    for (const a of d.approvals) card.append(grantBox(a, c));

    // details for the curious
    const more = el("details", "more");
    more.append(el("summary", null, "Details (for the curious)"));
    const dbody = el("div", "more-body");
    const caseInfo = el("div", "evid");
    caseInfo.append(el("div", null, `case ${c.id} · user ${c.customer_user_id} · opened ${fmtTime(c.created_at)}`));
    const tags = el("div", "tags");
    if (c.state) tags.append(el("span", "tag mono", c.state.code));
    if (c.intent && c.intent.type) tags.append(el("span", "tag mono", "intent " + c.intent.type));
    if (c.language) tags.append(el("span", "tag mono", c.language));
    tags.append(saleEl(c.sale_context));
    caseInfo.append(tags);
    if (c.state && c.state.evidence && c.state.evidence.length) caseInfo.append(el("div", null, "evidence: " + c.state.evidence.join(" · ")));
    dbody.append(sub("Case", caseInfo));

    const pa = el("div", "acts");
    for (const a of acts) {
      const x = el("div", "act"); x.append(el("b", a.requires_approval ? "needs" : null, a.kind + (a.requires_approval ? " · needs approval" : "")));
      if (a.params && Object.keys(a.params).length) x.append(el("code", null, JSON.stringify(a.params))); pa.append(x);
    }
    if (!acts.length) pa.append(el("p", "empty", "No actions."));
    dbody.append(sub("Actions decided by policy", pa));

    const ver = el("div", "verdict");
    if (v) {
      ver.append(el("span", "vflag " + (v.used_fallback ? "" : "ok"), v.used_fallback ? "fallback used: yes" : "fallback used: no"));
      const rv = realViolations(v.violations), le = llmErrors(v.violations, v.llm_error);
      ver.append(el("span", "vflag " + (rv.length ? "bad" : "ok"), `violations: ${rv.length}`));
      if (le.length) ver.append(el("span", "vflag", "LLM unavailable, template answered"));
      if (rv.length) { const ul = el("ul"); rv.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
      if (le.length) { const ul = el("ul", "info"); le.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
    } else ver.append(el("span", "empty", "Reply still being written."));
    const perReply = el("ul", "info");
    d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending").forEach((m, i) => {
      const meta = m.meta; const bits = [meta.used_fallback ? "template fallback" : meta.source === "seed" ? "scripted demo reply passed" : "LLM reply passed"];
      const rv = realViolations(meta.violations), le = llmErrors(meta.violations, meta.llm_error);
      if (rv.length) bits.push(rv.length + " violation(s)"); if (le.length) bits.push("LLM unavailable: " + le.join(", "));
      if (meta.status === "error") bits.push("pipeline error");
      perReply.append(el("li", null, `reply ${i + 1} (${fmtTime(m.created_at)}): ${bits.join(" · ")}`));
    });
    if (perReply.children.length) ver.append(perReply);
    dbody.append(sub("Validator", ver));

    const claims = (c.intent && c.intent.claims) || {};
    dbody.append(sub("What the user claims", Object.keys(claims).length ? kvTable(claims) : el("p", "empty", "No specific claims.")));
    dbody.append(sub("FactSheet: the only facts the reply may use", kvTable(c.facts)));

    if (d.approvals.length) {
      const ap = el("ul", "info");
      d.approvals.forEach((a) => ap.append(el("li", null, `${a.id} · ${a.status} · ${a.days || "?"} days of ${a.access_level_id} · requested ${fmtTime(a.created_at)}` + (a.result ? " · " + JSON.stringify(a.result) : ""))));
      dbody.append(sub("Approval records", ap));
    }

    const ol = el("ol", "audit"); d.audit.forEach((e) => { const li = el("li"); li.append(el("span", null, fmtTime(e.ts)), el("span", null, `${e.actor} · ${e.event}`), el("span", null, JSON.stringify(e.detail))); ol.append(li); });
    dbody.append(sub(`Audit log (${d.audit.length})`, ol));

    const mods = el("div", "tags");
    Object.entries(S.modules).forEach(([k, val]) => mods.append(el("span", "pill" + (val === "stub" ? " stub" : ""), `${k.replace("_", ".")}: ${val}`)));
    if (mods.children.length) dbody.append(sub("System modules", mods));
    more.append(dbody);
    card.append(more);
    box.append(card);
  }

  async function select(id) {
    S.selected = id; S.sig.detail = "";
    const u = new URL(location.href); u.searchParams.set("case", id); // keeps ?v= (the design variant)
    history.replaceState(null, "", u);
    V.renderList();
    await refreshDetail();
    if (matchMedia(V.narrowQuery).matches) $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function refreshDetail() {
    if (!S.selected) return;
    try {
      const d = await api("/api/cases/" + encodeURIComponent(S.selected));
      const sig = JSON.stringify(d);
      if (sig !== S.sig.detail) {
        // re-rendering the same case keeps whichever disclosures the reader opened
        const same = S.sig.detailId === S.selected;
        const open = [...document.querySelectorAll("#detail details")].map((x) => x.open);
        S.sig.detail = sig; S.sig.detailId = S.selected;
        V.renderDetail(d);
        if (same) document.querySelectorAll("#detail details").forEach((x, i) => { if (open[i]) x.open = true; });
      }
    } catch (e) { if (e.status === 404) { S.selected = null; } else throw e; }
  }

  async function decide(id, verb, btn) {
    btn.disabled = true;
    try {
      const r = await api(`/api/approvals/${id}/${verb}`, { method: "POST" });
      const a = r.approval;
      V.toast(verb === "approve" ? `Gave ${callName(a.customer_user_id)} ${a.days || 3} days of premium` : `Denied. ${cap(callName(a.customer_user_id))} will see it`);
      await refresh();
    } catch (e) {
      let msg = e.message || "Failed";
      if (e.status === 409 && !/^Not eligible/.test(msg)) { // lost the race: say who-ish and when
        try {
          const a = ((await api("/api/approvals?scope=console")).approvals || []).find((x) => x.id === id);
          if (a && a.decided_at && a.status !== "pending") {
            const d = new Date(a.decided_at);
            msg = `Already ${a.status} by someone else at ${isNaN(d) ? a.decided_at : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`;
          }
        } catch { /* keep the server's message */ }
      }
      V.toast(msg, 7000); btn.disabled = false;
      const host = btn.closest(".q-item, [data-approval-host]");
      if (host) { host.querySelector(".refused")?.remove(); const r = el("p", "refused", msg); r.setAttribute("role", "alert"); host.append(r); }
    }
  }

  // ------------------------------------------------------------ top bar
  function renderMeta(meta) {
    const m = $("#topMeta"); if (!m) return;
    m.textContent = "";
    if (meta.demo) m.append(el("span", "pill demo", "demo mode"));
    const stubs = Object.values(S.modules).filter((v) => v === "stub").length;
    if (stubs) m.append(el("span", "pill stub", `${stubs} module(s) on stubs`));
  }
  function live(text) { const n = $("#live"); if (n) n.textContent = text; }

  // ------------------------------------------------------------ refresh loop
  async function loadNames() {
    try {
      const r = await api("/api/demo/users");
      for (const u of r.users || []) {
        const n = String(u.display_name || "").replace(/\s*\(.*\)\s*$/, "").trim();
        if (n && n !== u.customer_user_id) S.names[u.customer_user_id] = n;
      }
    } catch { /* names are a demo nicety; ids still work */ }
  }
  async function refresh() {
    // scope=console: open requests + recently decided ones, not every approval ever
    const [cs, ap] = await Promise.all([api("/api/cases"), api("/api/approvals?scope=console")]);
    S.cases = cs.cases; S.approvals = ap.approvals; S.total = cs.total || cs.cases.length;
    // seeded demo cases carry a display name (GET /api/cases, demo only); the picker’s names win
    for (const c of S.cases) if (c.display_name && !S.names[c.customer_user_id]) S.names[c.customer_user_id] = c.display_name;
    const sig = JSON.stringify([S.cases, S.approvals, S.selected]);
    if (sig !== S.sig.list) { S.sig.list = sig; V.renderList(); }
    await refreshDetail();
    V.live("updated " + new Date().toLocaleTimeString("en-GB"), "ok");
  }
  async function start() {
    try {
      const sentAt = RealDate.now();
      const meta = await api("/api/console/meta");
      syncClock(meta, sentAt);
      $("#gate").hidden = true; $("#app").hidden = false;
      S.meta = meta; S.modules = meta.modules || {};
      if (meta.demo) await loadNames();
      V.renderMeta(meta);
      await refresh();
      clearInterval(S.timer);
      // no polling while the tab is hidden; catch up the moment it is visible again
      const tick = () => { if (!document.hidden) refresh().catch(() => V.live("offline, retrying", "bad")); };
      S.timer = setInterval(tick, 3000);
      if (!S.visHook) { S.visHook = true; document.addEventListener("visibilitychange", tick); }
    } catch (e) {
      if (e.status === 401) { $("#gate").hidden = false; $("#app").hidden = true; if (S.token) $("#gateErr").hidden = false; $("#tok").focus(); }
      else { V.live("can’t reach the server", "bad"); setTimeout(start, 3000); }
    }
  }

  // ------------------------------------------------------------ design variants
  // /console?v=N loads static/vN/console.view.js before this file. It may set
  //   window.CaseDeskConsoleView = (h) => ({ renderList, renderDetail, renderMeta, live, toast, narrowQuery })
  // and receives every helper below in h: a variant changes how the console looks, never what it does.
  const H = {
    S, $, el, api, toast, fmtTime, ago, day, stateLine, actionText, langName, nameOf, shortId, whoEl, callName,
    realViolations, llmErrors, reasonText, FILTERS, auto, dot, cap, kvTable, sub, saleEl, grantBox, select, decide,
    rerenderList: () => { S.sig.list = ""; V.renderList(); },
    defaults: { renderList, renderDetail, renderMeta, live, toast },
  };
  const V = Object.assign({ renderList, renderDetail, renderMeta, live, toast, narrowQuery: "(max-width: 979px)" },
    typeof window.CaseDeskConsoleView === "function" ? window.CaseDeskConsoleView(H) : {});

  // the header wraps on narrower desktops; the sticky case list sits just below whatever height it has
  const topEl = document.querySelector(".top");
  if (topEl) new ResizeObserver(() => document.documentElement.style.setProperty("--top-h", topEl.offsetHeight + "px")).observe(topEl);
  $("#gateForm").addEventListener("submit", (e) => {
    e.preventDefault(); S.token = $("#tok").value.trim(); sessionStorage.setItem("casedesk_console", S.token); start();
  });
  start();
})();
