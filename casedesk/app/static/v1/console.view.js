/* Case Desk console, iteration 1 "Statement". The case reads like an account statement: one dated spine
   (store events from the FactSheet, the conversation, what Case Desk did, the check, the grant request)
   beside the conversation. Behaviour stays in /static/console.js; this file only draws. */
window.CaseDeskConsoleView = (h) => {
  "use strict";
  const { S, $, el } = h;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const tx = (s) => document.createTextNode(s);

  // ------------------------------------------------------------ icons: one family, 16px grid, 1.5 stroke
  const NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    check: ["M3.5 8.4 6.6 11.5 12.5 4.5"],
    clock: ["c8,8,5.75", "M8 5v3.2l2.2 1.4"],
    alert: ["M8 2.6 14 13.2H2z", "M8 6.6v3", "M8 11.4v.2"],
    person: ["c8,5.4,2.4", "M3.4 13.6c.7-2.4 2.4-3.6 4.6-3.6s3.9 1.2 4.6 3.6"],
    lock: ["M4 7.2h8v6H4z", "M5.6 7.2V5.4a2.4 2.4 0 0 1 4.8 0v1.8"],
    stop: ["c8,8,5.75", "M4 12 12 4"],
    cross: ["M4.5 4.5l7 7M11.5 4.5l-7 7"],
  };
  function icon(name) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("class", "i i-" + name); s.setAttribute("aria-hidden", "true");
    for (const d of ICONS[name]) {
      let n;
      if (d[0] === "c") {
        const [cx, cy, r] = d.slice(1).split(",");
        n = document.createElementNS(NS, "circle"); n.setAttribute("cx", cx); n.setAttribute("cy", cy); n.setAttribute("r", r);
      } else { n = document.createElementNS(NS, "path"); n.setAttribute("d", d); }
      s.append(n);
    }
    return s;
  }

  // ------------------------------------------------------------ small formatters
  const nameOf = (cuid) => h.nameOf(cuid);
  function who(cuid, tag = "b") {
    // the name and the 5-digit id, set apart by space and ink, not by a middle dot
    const w = el(tag, "who-name"); const n = nameOf(cuid);
    if (n) { w.append(tx(n + " "), el("span", "uid", h.shortId(cuid))); w.title = cuid; }
    else w.append(el("span", "uid solo", cuid));
    return w;
  }
  const parse = (iso) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso);
  const hm = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dm = (d) => `${d.getDate()} ${MON[d.getMonth()]}`;
  function when(iso) { // list times: "just now", "12 min ago", "23:50" today, else "4 Nov"
    const d = parse(iso); if (isNaN(d)) return "";
    const s = (Date.now() - d) / 1000;
    if (s >= 0 && s < 60) return "just now";
    if (s >= 0 && s < 3600) return Math.floor(s / 60) + " min ago";
    if (new Date().toDateString() === d.toDateString()) return hm(d);
    return h.day(iso);
  }
  function stamp(iso, withTime) { // the spine's date: "22 Oct", "22 Sep 2027", or "8 Nov" over "23:50"
    const d = parse(iso); if (isNaN(d)) return { d: String(iso || ""), s: "" };
    return { d: dm(d) + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""), s: withTime ? hm(d) : "" };
  }
  // long URLs break after a slash, never in the middle of a word
  function breaks(text) {
    const f = document.createDocumentFragment(); const re = /https?:\/\/[^\s<>"]+/g; let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) f.append(tx(text.slice(last, m.index)));
      const scheme = m[0].match(/^https?:\/\//)[0];
      m[0].slice(scheme.length).split(/(?<=\/)/).forEach((part, i) => {
        if (i) f.append(document.createElement("wbr"));
        f.append(tx(i ? part : scheme + part));
      });
      last = m.index + m[0].length;
    }
    if (last < text.length) f.append(tx(text.slice(last)));
    return f;
  }
  const storeThe = (f) => { const n = (f.store_name || "").replace(/^the /i, ""); return !n ? "the store" : /^google play$/i.test(n) ? n : "the " + n; };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const REASON = { user_requested_human: "they asked", privacy_request: "it is a privacy or data request" };
  const reason = (r) => REASON[r] || h.reasonText(r);
  const actText = (a) => (a.kind === "ESCALATE_TO_HUMAN" ? `Handed to a person because ${reason(a.params && a.params.reason)}` : h.actionText(a));
  function stateWords(badge) {
    const s = el("span", "c-state");
    s.append(el("span", "mk " + ((badge && badge.tone) || "info")), el("span", "st-l", (badge && badge.label) || "No status yet"));
    return s;
  }

  // ------------------------------------------------------------ queue slips + case index
  function slip(a, c) {
    const nm = nameOf(a.customer_user_id) || "them";
    const what = `${a.days || 3} days of premium`;
    const li = el("li", "q-item" + (a.status === "failed" ? " failed" : ""));
    li.dataset.id = a.id;
    li.setAttribute("aria-current", String(a.case_id === S.selected));
    const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
    const top = el("span", "row-top"); top.append(who(a.customer_user_id), el("time", "c-time", when(c.updated_at || a.created_at)));
    b.append(top, el("span", "q-what", `Wants ${what}`));
    if (c.state_badge) b.append(stateWords(c.state_badge));
    b.onclick = () => h.select(a.case_id);
    li.append(b);
    if (a.status === "failed") {
      const p = el("p", "fail"); p.append(icon("alert"), tx(`Adapty couldn't give it (${(a.result && a.result.error) || "unknown error"}). Try again or deny.`));
      li.append(p);
    }
    const row = el("div", "grant-row");
    const ok = el("button", "btn approve", a.status === "failed" ? `Give ${nm} ${what} again` : `Give ${nm} ${what}`);
    ok.type = "button"; ok.onclick = () => h.decide(a.id, "approve", ok);
    const no = el("button", "btn deny", "Deny"); no.type = "button"; no.onclick = () => h.decide(a.id, "deny", no);
    row.append(ok, no);
    li.append(row, el("p", "hint", "Nothing is granted until you approve."));
    return li;
  }

  // the Approved stamp: a slip whose grant was just decided gets stamped, holds a beat, then leaves
  function stampAndLeave(li, a, q) {
    const wrap = el("li", "slip-gone" + (a.status === "denied" ? " denied" : ""));
    const inner = el("div", "slip-in");
    li.querySelectorAll(".grant-row, .refused, .fail").forEach((n) => n.remove());
    li.querySelectorAll("button").forEach((n) => { n.disabled = true; n.tabIndex = -1; });
    while (li.firstChild) inner.append(li.firstChild);
    const st = el("span", "stamp", a.status === "approved" ? "Approved" : "Denied");
    st.setAttribute("aria-hidden", "true");
    inner.append(st); wrap.append(inner); q.prepend(wrap);
    setTimeout(() => {
      $("#qEmpty").hidden = q.querySelector(".q-item") != null; // the empty note is in place before the slip folds away
      wrap.classList.add("leaving");
    }, 900);
    setTimeout(() => wrap.remove(), 1130);
  }

  function renderList() {
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
    const q = $("#queue");
    const pendIds = new Set(pend.map((a) => a.id));
    const shown = [...q.querySelectorAll("li.q-item")];
    const gone = [...q.querySelectorAll("li.slip-gone")];
    q.textContent = "";
    for (const a of pend) q.append(slip(a, byCase[a.case_id] || {}));
    gone.forEach((li) => q.prepend(li)); // a stamped slip keeps leaving through a refresh
    for (const li of shown) {
      if (pendIds.has(li.dataset.id)) continue;
      const a = S.approvals.find((x) => x.id === li.dataset.id);
      if (a && (a.status === "approved" || a.status === "denied")) stampAndLeave(li, a, q);
    }
    $("#qCount").textContent = pend.length ? String(pend.length) : "";
    $("#qEmpty").hidden = pend.length > 0 || q.querySelector(".slip-gone") != null;

    // filters: a short sentence of words and counts; the active one is underlined in ink
    const fb = $("#filters"); fb.textContent = "";
    h.FILTERS.forEach(([key, label, pred], i) => {
      const n = S.cases.filter(pred).length;
      const b = el("button", "filt"); b.type = "button";
      b.append(el("span", "f-l", label), tx(" "), el("span", "f-n", String(n)));
      b.setAttribute("aria-pressed", String(S.filter === key));
      b.setAttribute("aria-label", `${label}, ${plural(n, "case")}`);
      b.onclick = () => { S.filter = key; h.rerenderList(); };
      fb.append(b);
      if (i < h.FILTERS.length - 1) { const s = el("span", "f-sep", ","); s.setAttribute("aria-hidden", "true"); fb.append(s); }
    });

    const filt = (h.FILTERS.find((f) => f[0] === S.filter) || h.FILTERS[0])[2];
    const list = S.cases.filter(filt);
    $("#cCount").textContent = list.length === S.cases.length ? String(S.cases.length) : `${list.length} of ${S.cases.length}`;
    $("#cEmpty").hidden = list.length > 0;
    if (!list.length && S.cases.length) $("#cEmpty").textContent = "No cases match this filter. Choose All to see every case.";
    const ul = $("#cases"); ul.textContent = "";
    for (const c of list) {
      const li = el("li"); const b = el("button", "c-item"); b.type = "button";
      b.setAttribute("aria-current", String(c.id === S.selected));
      const top = el("span", "row-top"); top.append(who(c.customer_user_id));
      if (c.pending_approval) top.append(el("span", "flag warn", "Waiting for you"));
      else if (c.privacy) top.append(el("span", "flag bad", "Privacy"));
      else if (c.escalated) top.append(el("span", "flag warn", "Needs a person"));
      top.append(el("time", "c-time", when(c.updated_at)));
      b.append(top, h.auto(el("span", "c-msg", c.first_message || "…")), stateWords(c.state_badge));
      b.onclick = () => h.select(c.id);
      li.append(b); ul.append(li);
    }
  }

  // ------------------------------------------------------------ the case
  function checkText(meta) {
    const rv = h.realViolations(meta.violations), le = h.llmErrors(meta.violations, meta.llm_error);
    if (rv.length && !meta.used_fallback) return ["bad", "alert", `${cap(plural(rv.length, "fact"))} in this reply did not match the account`];
    return ["ok", "check", "Checked against the account", meta.used_fallback || le.length > 0];
  }
  function checkLine(meta, cls = "chk") {
    const [tone, ic, text] = checkText(meta || {});
    const p = el("p", cls + " " + tone); p.append(icon(ic), el("span", null, text));
    return p;
  }

  function grantEl(a, c) {
    const f = c.facts || {}; const nm = nameOf(a.customer_user_id) || "them";
    const what = `${a.days || f.grant_days || 3} days of premium`;
    const w = el("div", "grant " + a.status);
    if (a.status === "pending" || a.status === "failed") {
      const p = el("p", "waiting");
      p.append(icon(a.status === "failed" ? "alert" : "clock"), el("span", null, a.status === "failed"
        ? `Adapty couldn't give ${nm} ${what}. Try again under Needs your OK.`
        : "Waiting for you. Approve or deny it under Needs your OK."));
      w.append(p);
    } else if (a.status === "approved") {
      const exp = (a.result && a.result.expires_at) || a.expires_at;
      const p = el("p", "done"); p.append(icon("check"), el("span", null, "Premium given" + (exp ? ` until ${h.day(exp, true)}` : "")));
      w.append(p);
    } else if (a.status === "denied") {
      const p = el("p", "done no"); p.append(icon("cross"), el("span", null, `You said no. ${cap(nameOf(a.customer_user_id) || "the user")} sees that in Lumen Help.`));
      w.append(p);
    } else w.append(el("p", "done no", `${cap(what)}, status ${a.status}`));
    return w;
  }

  function jumpTo(id) {
    const t = document.getElementById("m-" + id); if (!t) return;
    t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    t.classList.remove("hl"); void t.offsetWidth; t.classList.add("hl");
    setTimeout(() => t.classList.remove("hl"), 1400);
  }

  // the account spine: store events before the conversation, what Case Desk did, then what is ahead
  function spine(d, fresh) {
    const c = d.case, f = c.facts || {}, nm = nameOf(c.customer_user_id);
    const asOf = f.as_of || String(c.created_at || "").slice(0, 10);
    const trial = !!f.trial_ends_on && /^TRIAL/.test(f.state || "");
    const ev = [];
    const push = (date, text, o = {}) => { if (date) ev.push({ date, text, ...o }); };
    const product = f.product_name || "premium";
    if (f.purchased_on) {
      if (trial) push(f.purchased_on, `Started a free trial of ${product}`, { sub: `On ${storeThe(f)}` });
      else push(f.purchased_on, `Bought ${product}`, { sub: `On ${storeThe(f)}`, amt: f.last_charged_on === f.purchased_on ? f.price : "" });
    }
    if (f.last_charged_on && f.last_charged_on !== f.purchased_on) push(f.last_charged_on, "Charged", { sub: "The last charge on record", amt: f.price });
    if (f.cancelled_on && f.cancelled_on !== f.billing_issue_on) push(f.cancelled_on, trial ? "Cancelled the free trial" : "Cancelled", { sub: "Auto-renew turned off" });
    if (f.billing_issue_on) push(f.billing_issue_on, `${cap(storeThe(f))} couldn't take the payment`, { cls: "bad" });
    if (f.refunded_on) push(f.refunded_on, "Refunded by the store", { amt: f.price });
    if (f.trial_ends_on) {
      const fut = f.trial_ends_on > asOf;
      push(f.trial_ends_on, !fut ? "Free trial ended" : f.renews_on ? "Free trial ends, then the first charge" : "Free trial ends; no charge follows",
        { amt: fut && f.renews_on ? (f.price_after_trial || f.price) : "" });
    }
    if (f.renews_on && f.renews_on !== f.trial_ends_on) push(f.renews_on, "Renews", { amt: f.price });
    if (f.expires_on && ![f.renews_on, f.trial_ends_on, f.granted_until].includes(f.expires_on)) push(f.expires_on, f.expires_on > asOf ? "Premium ends" : "Premium ended");
    if (f.grace_ends_on) push(f.grace_ends_on, f.grace_ends_on > asOf ? "Grace period ends" : "Grace period ended");
    if (f.granted_until) push(f.granted_until, f.granted_until > asOf ? "Premium you gave ends" : "Premium you gave ended", { cls: "ok" });
    ev.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
    const past = ev.filter((e) => e.date <= asOf).map((e) => ({ ...e, kind: "st", when: stamp(e.date) }));
    const ahead = ev.filter((e) => e.date > asOf).map((e) => ({ ...e, kind: "st fut", when: stamp(e.date) }));
    if (f.lifetime === "yes" || f.state === "LIFETIME") ahead.push({ text: "Lifetime premium has no end date", kind: "st fut", when: { d: "", s: "" } });

    // what Case Desk did, in the order it happened
    const appr = d.approvals || [], used = new Set();
    const msgs = d.messages || [];
    const lastA = [...msgs].reverse().find((m) => m.role === "assistant");
    const cd = []; let firstUser = null, follow = null;
    for (const m of msgs) {
      const meta = m.meta || {};
      if (m.role === "user") {
        if (!firstUser) firstUser = m; else follow = m;
      } else if (m.role === "assistant") {
        if (meta.status === "pending") { cd.push({ kind: "cd pend", text: "Writing the reply…", when: stamp(m.created_at, true) }); continue; }
        const failed = meta.status === "error";
        const [tone, , , viaTemplate] = checkText(meta);
        const base = follow ? "Answered the follow-up" : "Replied";
        const e = { kind: "cd" + (failed || tone === "bad" ? " bad" : ""), when: stamp(m.created_at, true), jump: m.id, nodes: [],
          sub: follow ? `${nm || "The user"} wrote again on ${h.day(follow.created_at, true)}` : "",
          text: failed ? `${base}, but the reply failed` : tone === "bad" ? `${base}, but the check found a problem` : viaTemplate ? `${base} with the checked template` : base };
        follow = null;
        const acts = meta.actions || (m === lastA ? c.actions || [] : []);
        if (acts.length) {
          const ul = el("ul", "sp-acts");
          for (const a of acts) {
            const li = el("li", a.requires_approval ? "needs" : null, actText(a));
            if (a.kind === "PROPOSE_GRANT") {
              const ap = appr.find((x) => x.id === meta.approval_id && !used.has(x.id)) || appr.find((x) => !used.has(x.id));
              if (ap) { used.add(ap.id); li.append(grantEl(ap, c)); }
            }
            ul.append(li);
          }
          e.nodes.push(ul);
        }
        if (meta.abandoned) e.nodes.push(el("p", "sp-s", "Never seen: they left before it arrived."));
        cd.push(e);
      } else if (m.role === "system" && !/^grant_/.test(meta.event || "")) {
        cd.push({ kind: "cd", text: "Note shown to the user", sub: m.text, when: stamp(m.created_at, true) });
      }
    }
    for (const ap of appr) if (!used.has(ap.id)) {
      cd.push({ kind: "cd", text: `Asked you for ${ap.days || 3} days of premium`, when: stamp(ap.created_at, true), nodes: [grantEl(ap, c)] });
    }
    for (const ap of appr) if (ap.status === "approved") {
      const exp = (ap.result && ap.result.expires_at) || ap.expires_at;
      if (exp) ahead.push({ kind: "st fut ok", text: "Premium you gave ends", when: stamp(exp, true), sortKey: exp });
    }
    if (!cd.length) cd.push({ kind: "cd pend", text: "Nothing yet", when: { d: "", s: "" } });

    const sec = el("section", "spine" + (fresh ? " draw" : ""));
    sec.setAttribute("aria-label", "Account timeline");
    const ol = el("ol", "sp-list");
    let i = 0;
    const row = (cls) => { const li = el("li", "sp " + cls); li.style.setProperty("--i", String(Math.min(i++, 18))); ol.append(li); return li; };
    const heading = (text, cls = "") => { const li = row("sp-h " + cls); li.append(el("span", "sp-when"), el("span", "sp-mk"), el("h3", null, text)); };
    const group = (items, start = "") => {
      let prev = start;
      for (const e of items) {
        const li = row("sp-e " + e.kind);
        const w = el("span", "sp-when");
        const timed = /^(us|cd)/.test(e.kind);
        // statement style: a date is printed once; entries on the same day share it
        if (e.when.d && e.when.d !== prev) w.append(el("span", "d", e.when.d));
        if (e.when.s && (e.when.d !== prev || timed)) w.append(el("span", "s", e.when.s));
        prev = e.when.d || prev;
        const mk = el("span", "sp-mk"); mk.setAttribute("aria-hidden", "true");
        const bd = el("div", "sp-body");
        if (e.jump != null) {
          const b = el("button", "sp-t sp-jump", e.text); b.type = "button"; b.title = "Show it in the conversation";
          b.onclick = () => jumpTo(e.jump); bd.append(b);
        } else bd.append(el("p", "sp-t", e.text));
        if (e.sub) bd.append(h.auto(el("p", "sp-s", e.sub)));
        (e.nodes || []).forEach((n) => bd.append(n));
        li.append(w, mk, bd);
        if (e.amt) li.append(el("span", "sp-amt", e.amt));
      }
    };
    if (past.length) { heading(`Before ${nm || "they"} wrote`); group(past); }
    if (firstUser) {
      const li = row("sp-h sp-u");
      const st = stamp(firstUser.created_at, true);
      const w = el("span", "sp-when"); w.append(el("span", "d", st.d), el("span", "s", st.s));
      const mk = el("span", "sp-mk"); mk.setAttribute("aria-hidden", "true");
      const h3 = el("h3"); const b = el("button", "sp-jump", `${nm || "The user"} wrote in`);
      b.type = "button"; b.title = "Show it in the conversation"; b.onclick = () => jumpTo(firstUser.id);
      h3.append(b); li.append(w, mk, h3);
    }
    heading("What Case Desk did"); group(cd, firstUser ? stamp(firstUser.created_at, true).d : "");
    ahead.sort((x, y) => String(x.sortKey || x.date || "9").localeCompare(String(y.sortKey || y.date || "9")));
    if (ahead.length) { heading("Next on the account", "fut"); group(ahead); }
    ol.lastElementChild.classList.add("last");
    sec.append(ol);
    return sec;
  }

  function convo(d) {
    const c = d.case, nm = nameOf(c.customer_user_id);
    const sec = el("section", "convo"); sec.setAttribute("aria-labelledby", "convH");
    const hh = el("h3", "col-h", "Conversation"); hh.id = "convH"; sec.append(hh);
    for (const m of d.messages) {
      const meta = m.meta || {}; const pending = meta.status === "pending";
      const t = el("div", `turn ${m.role}${pending ? " pending" : ""}${meta.status === "error" ? " error" : ""}`);
      t.id = "m-" + m.id;
      const whoL = el("div", "who");
      whoL.append(el("b", null, m.role === "user" ? (nm || "User") : m.role === "system" ? `Shown to ${nm || "the user"}` : "Case Desk"),
        el("time", null, h.day(m.created_at, true)));
      if (meta.status === "error") whoL.append(el("span", "flag bad", "Something went wrong"));
      if (meta.abandoned) whoL.append(el("span", "flag", "Never seen by the user"));
      const body = h.auto(el("div", "txt")); body.append(pending ? tx("Writing the reply…") : breaks(m.text));
      if (c.language && m.role !== "system" && !pending) body.lang = c.language; // Serbian Cyrillic gets its own letterforms
      t.append(whoL, body);
      if (m.role === "assistant" && !pending && meta.status !== "error") t.append(checkLine(meta));
      sec.append(t);
    }
    if (!d.messages.length) sec.append(el("p", "empty", "No messages yet."));
    return sec;
  }

  // ------------------------------------------------------------ the technical record
  const lit = (tag, cls, text) => { const n = el(tag, cls, text); n.translate = false; return n; };
  function section(title, note, ...kids) {
    const s = el("section", "sub"); s.append(el("h3", null, title));
    if (note) s.append(el("p", "sub-note", note));
    s.append(...kids); return s;
  }
  // each claim is anchored on the first FactSheet row that can confirm or contradict it
  const CLAIM_ANCHOR = {
    says_cancelled: ["cancelled_on", "state"], says_charged: ["last_charged_on", "ever_charged", "price"], says_paid: ["ever_charged", "last_charged_on"],
    claimed_amount: ["price"], wants_refund: ["refund_policy"], wants_to_cancel: ["renews_on", "state"], says_new_device: ["restore_steps_key"],
  };
  function claimPlan(c) {
    const claims = (c.intent && c.intent.claims) || {}, f = c.facts || {};
    const byFact = {}, loose = [];
    for (const [k, v] of Object.entries(claims)) {
      const at = (CLAIM_ANCHOR[k] || []).find((x) => f[x] != null && f[x] !== "");
      if (at) (byFact[at] = byFact[at] || []).push([k, v]); else loose.push([k, v]);
    }
    return { byFact, loose, n: Object.keys(claims).length };
  }
  const claimEl = ([k, v]) => { const s = el("span", "cl"); s.append(lit("span", "k", k)); if (v !== true) s.append(h.auto(el("span", "v", String(v)))); return s; };
  function factTable(f, plan) {
    const withClaims = Object.keys(plan.byFact).length > 0;
    const t = el("table", "kv facts" + (withClaims ? " with-claims" : ""));
    if (withClaims) { const th = el("thead"); const tr = el("tr"); tr.append(el("th", null, "Fact"), el("th", null, "On the account"), el("th", null, "The user claims")); th.append(tr); t.append(th); }
    const tb = el("tbody");
    for (const [k, v] of Object.entries(f || {})) {
      const tr = el("tr", plan.byFact[k] ? "has-claim" : null);
      const td = h.auto(el("td")); td.append(breaks(typeof v === "string" ? v : JSON.stringify(v)));
      tr.append(lit("th", null, k), td);
      if (withClaims) { const td = el("td", "cl-cell"); (plan.byFact[k] || []).forEach((x) => td.append(claimEl(x))); tr.append(td); }
      tb.append(tr);
    }
    t.append(tb); const w = el("div", "scroll-x"); w.append(t); return w;
  }
  function claimsNote(c, plan) {
    const w = el("div", "claims-w");
    if (!plan.n) { w.append(el("p", "empty", "No specific claims.")); return w; }
    const lined = plan.n - plan.loose.length;
    if (lined) w.append(el("p", null, lined === 1 ? "The claim sits in the FactSheet, on the row that can confirm or contradict it." : `The ${lined} claims sit in the FactSheet, each on the row that can confirm or contradict it.`));
    if (plan.loose.length) {
      w.append(el("p", "sub-note", plan.loose.length === 1 ? "Nothing on the account can confirm this one:" : "Nothing on the account can confirm these:"));
      const ul = el("ul", "loose"); plan.loose.forEach((x) => { const li = el("li"); li.append(claimEl(x)); ul.append(li); }); w.append(ul);
    }
    const contra = (c.actions || []).some((a) => a.params && a.params.claim_contradicted);
    if (contra) { const p = el("p", "contra"); p.append(icon("alert"), el("span", null, "Policy found that the account contradicts a claim; the reply explains what really happened.")); w.append(p); }
    return w;
  }
  function policyList(acts) {
    if (!acts.length) return el("p", "empty", "No actions.");
    const ul = el("ul", "pol");
    for (const a of acts) {
      const li = el("li"); const top = el("div", "pol-top");
      top.append(lit("span", "pol-k", a.kind));
      if (a.requires_approval) top.append(el("span", "flag warn", "Needs your approval"));
      li.append(top);
      if (a.params && Object.keys(a.params).length) li.append(lit("code", "json", JSON.stringify(a.params)));
      ul.append(li);
    }
    return ul;
  }
  function verdict(d) {
    const v = d.case.validator;
    if (!v) return el("p", "empty", "The reply is still being written.");
    const rv = h.realViolations(v.violations), le = h.llmErrors(v.violations, v.llm_error);
    const dl = el("dl", "vd");
    const row = (k, val, tone) => { const x = el("div"); x.append(el("dt", null, k), el("dd", tone || null, val)); dl.append(x); };
    row("Template fallback", v.used_fallback ? "Used" : "Not used");
    row("Rule violations", String(rv.length), rv.length ? "bad" : "ok");
    if (le.length) row("Model", "Unavailable; the template answered");
    const w = el("div", "vd-wrap"); w.append(dl);
    if (rv.length) { const ul = el("ul", "vd-list bad"); rv.forEach((x) => ul.append(lit("li", null, x))); w.append(ul); }
    if (le.length) { const ul = el("ul", "vd-list"); le.forEach((x) => ul.append(lit("li", null, x))); w.append(ul); }
    const per = el("ol", "vd-replies");
    d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending").forEach((m, i) => {
      const meta = m.meta; const r = h.realViolations(meta.violations), l = h.llmErrors(meta.violations, meta.llm_error);
      let s = meta.used_fallback ? "template fallback" : meta.source === "seed" ? "scripted demo reply, passed" : "model reply, passed";
      if (r.length) s += `, ${plural(r.length, "violation")}`;
      if (l.length) s += ", model unavailable";
      if (meta.status === "error") s += ", pipeline error";
      const li = el("li"); li.append(el("span", "n", `Reply ${i + 1}`), el("time", null, h.day(m.created_at, true)), el("span", null, s));
      per.append(li);
    });
    if (per.children.length) w.append(per);
    return w;
  }
  function approvalList(list) {
    const ul = el("ul", "apr");
    for (const a of list) {
      const li = el("li"); const top = el("div", "apr-top");
      top.append(lit("span", "k", a.id), el("span", "apr-st " + a.status, cap(a.status)));
      li.append(top, el("p", null, `${a.days || "?"} days of ${a.access_level_id}. Requested ${h.day(a.created_at, true)}${a.decided_at ? `, decided ${h.day(a.decided_at, true)}` : ""}.`));
      if (a.result && Object.keys(a.result).length) li.append(lit("code", "json", JSON.stringify(a.result)));
      ul.append(li);
    }
    return ul;
  }
  function auditTable(audit) {
    const t = el("table", "audit"); const tb = el("tbody");
    for (const e of audit) {
      const tr = el("tr");
      tr.append(el("td", "a-t", h.day(e.ts, true)), lit("td", "a-a", e.actor), lit("td", "a-e", e.event.replace(/_/g, " ")),
        lit("td", "a-d", JSON.stringify(e.detail)));
      tb.append(tr);
    }
    t.append(tb); return t;
  }
  function record(d) {
    const c = d.case, f = c.facts || {};
    const more = el("details", "more");
    const sum = el("summary");
    sum.append(el("span", "sum-t", "Technical record"), el("span", "sum-s", "FactSheet, policy, validator, claims, approvals and audit log"));
    more.append(sum);
    const body = el("div", "more-body");
    const ids = el("dl", "ids");
    const id = (k, val, isLit) => {
      if (val == null || val === "") return;
      const x = el("div"); x.append(el("dt", null, k), isLit ? lit("dd", "lit", String(val)) : el("dd", null, String(val))); ids.append(x);
    };
    id("Case", c.id, true); id("User", c.customer_user_id, true); id("State", c.state && c.state.code, true);
    id("Intent", c.intent && c.intent.type, true); id("Language", c.language, true); id("Opened", h.day(c.created_at, true));
    const sc = c.sale_context || {};
    id("Channel", (sc.acquisition_channel || "").replace(/_/g, " "));
    if (sc.placement || sc.flow) id("Placement and flow", [sc.placement, sc.flow].filter(Boolean).join(", ") + " (stand-in from the seed data)");
    body.append(ids);
    if (c.state && c.state.evidence && c.state.evidence.length) {
      const ul = el("ul", "evid"); c.state.evidence.forEach((x) => ul.append(lit("li", null, x)));
      body.append(section("Why policy chose this state", null, ul));
    }
    const cols = el("div", "rec-cols");
    const left = el("div", "rec-col"), right = el("div", "rec-col");
    const plan = claimPlan(c);
    left.append(section("FactSheet", "The only facts a reply may use. The user's claims sit beside the facts that answer them.", factTable(f, plan)));
    right.append(section("What the user claims", null, claimsNote(c, plan)));
    right.append(section("Actions decided by policy", null, policyList(c.actions || [])));
    right.append(section("Validator", null, verdict(d)));
    if (d.approvals.length) right.append(section("Approval records", null, approvalList(d.approvals)));
    cols.append(left, right); body.append(cols);
    const aw = el("div", "scroll-x"); aw.append(auditTable(d.audit));
    body.append(section(`Audit log, ${d.audit.length} ${d.audit.length === 1 ? "entry" : "entries"}`, null, aw));
    const mods = Object.entries(S.modules || {});
    if (mods.length) {
      const dl = el("dl", "ids mods");
      mods.forEach(([k, val]) => { const x = el("div"); x.append(lit("dt", null, k.replace("_", ".")), el("dd", val === "stub" ? "stub" : null, val)); dl.append(x); });
      body.append(section("System modules", null, dl));
    }
    more.append(body);
    return more;
  }

  let shownId = null;
  function renderDetail(d) {
    const box = $("#detail"); box.textContent = "";
    const c = d.case, f = c.facts || {}, fl = d.flags || {};
    const fresh = shownId !== c.id; shownId = c.id;
    const nm = nameOf(c.customer_user_id);
    const sheet = el("article", "case");

    const head = el("header", "d-head");
    const h2 = el("h2"); h2.append(who(c.customer_user_id, "span"));
    const bits = [c.language ? `Writes in ${h.langName(c.language)}.` : "Language not known yet."];
    if (f.product_name && f.state !== "NO_PURCHASE" && f.store !== "adapty") bits.push(`${f.product_name}, from ${storeThe(f)}.`);
    if (c.created_at) bits.push(`Opened ${h.day(c.created_at, true)}.`);
    head.append(h2, el("p", "d-meta", bits.join(" ")));
    sheet.append(head);

    sheet.append(el("p", "status " + ((c.state && c.state.tone) || "info"), h.stateLine(c.state, f)));
    if (c.validator) {
      const v = c.validator, rv = h.realViolations(v.violations), le = h.llmErrors(v.violations, v.llm_error);
      let tone = "ok", text = "Every fact in the reply was checked against the account, and it matches.";
      if (rv.length && !v.used_fallback) { tone = "bad"; text = "The validator found facts in this reply that the account does not support. The technical record lists them."; }
      else if (rv.length) text = `The first draft had ${plural(rv.length, "fact")} the account does not support, so the checked template went out instead.`;
      else if (v.used_fallback || le.length) text = "The checked template answered, and every fact in it matches the account.";
      const line = el("p", "trust " + tone); line.append(icon(tone === "bad" ? "alert" : "check"), el("span", null, text));
      sheet.append(line);
    }
    const alerts = [];
    if (fl.privacy) alerts.push(["bad", "lock", "Privacy or data request. Handle it through your data-protection process."]);
    (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy)
      .forEach((r) => alerts.push(["warn", "person", r === "user_requested_human" ? `${nm || "The user"} asked for a person.` : `A person should answer, because ${reason(r)}.`]));
    if (c.intent && c.intent.injection_suspected) alerts.push(["info", "stop", "The message tried to give Case Desk orders. It was ignored."]);
    if (alerts.length) {
      const ul = el("ul", "alerts");
      alerts.forEach(([t3, ic, text]) => { const li = el("li", "alert " + t3); li.append(icon(ic), el("span", null, text)); ul.append(li); });
      sheet.append(ul);
    }

    const body = el("div", "case-body");
    body.append(spine(d, fresh), convo(d));
    sheet.append(body, record(d));
    box.append(sheet);
  }

  // ------------------------------------------------------------ top bar, live state, toast
  function renderMeta(meta) {
    const m = $("#topMeta"); if (!m) return;
    m.textContent = "";
    if (meta.demo) m.append(el("span", "meta-demo", "Demo mode"));
    const stubs = Object.values(S.modules).filter((v) => v === "stub").length;
    if (stubs) m.append(el("span", "meta-stub", `${plural(stubs, "module")} on stubs`));
  }
  function live(text, tone) {
    const n = $("#live"); if (!n) return;
    n.dataset.tone = tone || "ok"; n.textContent = "";
    n.append(el("span", "mk " + (tone === "bad" ? "warn" : "ok")), tx(cap(String(text))));
  }
  function toast(text, ms = 3200) {
    const bad = ms > 4000; // console.js passes 7000 for failures
    const t = el("div", "toast" + (bad ? " bad" : "")); t.setAttribute("role", bad ? "alert" : "status");
    t.append(icon(bad ? "alert" : "check"), el("span", null, text));
    document.body.append(t);
    setTimeout(() => t.classList.add("out"), Math.min(ms, 5200));
    setTimeout(() => t.remove(), Math.min(ms, 5200) + 200);
  }

  return { renderList, renderDetail, renderMeta, live, toast };
};
