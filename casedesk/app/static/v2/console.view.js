/* Case Desk console, iteration 2 "Night Shift". Same data, calls and actions as the stock console (static/console.js);
   only the drawing changes: three panes (cases, transcript, inspector) and a decision dock that holds the queue.
   - Every value is set with textContent; nothing from the API goes through innerHTML.
   - A value that changes on the live refresh (a status, a grant, a new message, a case row) flashes once in reverse video.
   - j / k move through the case list (the hint in the list header is real). */
window.CaseDeskConsoleView = (h) => {
  "use strict";
  const { S, $, el, auto, cap } = h;
  const SVG = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------ small builders
  function icon(kind) { // one stroke family: 16px box, 1.6px stroke, round joins
    const s = document.createElementNS(SVG, "svg"); s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "ic ic-" + kind);
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", { tick: "M3.5 8.5 6.5 11.5 12.5 4.5", cross: "M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5", down: "M8 3.5v8.5M4.5 8.5 8 12l3.5-3.5" }[kind]);
    p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "1.6");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.append(p); return s;
  }
  const lamp = (tone, label) => {
    const s = el("span", "lamp " + (tone || "info"));
    if (label) { s.setAttribute("role", "img"); s.setAttribute("aria-label", label); s.title = label; } else s.setAttribute("aria-hidden", "true");
    return s;
  };
  const mono = (cls, text) => { const n = el("span", "mono" + (cls ? " " + cls : ""), text); n.translate = false; return n; };
  // "Ava 00239": the name, then the short id in mono. No middle dot: the two are told apart by face and ink.
  function who(cuid, tag = "b") {
    const w = el(tag, "who-name"); const n = h.nameOf(cuid);
    if (n) { w.append(el("span", "nm", n), document.createTextNode(" "), mono("uid", h.shortId(cuid))); w.title = cuid; }
    else w.append(mono("uid solo", cuid));
    return w;
  }
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
  const dm = (d) => d.toLocaleString("en-GB", { day: "numeric", month: "short" });
  function clock(iso) { const d = new Date(iso); return isNaN(d) ? String(iso || "") : dm(d) + " " + hm(d); }
  function short(iso) {
    const d = new Date(iso); if (isNaN(d)) return "";
    const s = (Date.now() - d) / 1000;
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + " min";
    return d.toDateString() === new Date().toDateString() ? hm(d) : dm(d);
  }
  function timeEl(iso, full) {
    const t = el("time", "mono t", full ? clock(iso) : short(iso)); t.dateTime = iso || ""; t.title = clock(iso); return t;
  }
  const TONE_C = { ok: "var(--teal)", warn: "var(--amber)", bad: "var(--coral)", info: "var(--ink)", amber: "var(--amber)" };
  function flash(n, tone) {
    if (!n) return;
    n.style.setProperty("--fc", TONE_C[tone] || "var(--ink)");
    n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash");
    n.addEventListener("animationend", (e) => { if (e.target === n) n.classList.remove("flash"); }, { once: true });
  }
  const sub = (title, extra) => {
    const s = el("section", "sec"); const hd = el("h3", null, title);
    if (extra != null) hd.append(document.createTextNode(" "), mono("n", String(extra)));
    s.append(hd); return s;
  };
  const words = (k) => String(k).replace(/_/g, " ");
  // a params / detail object as "key value" tokens (keys in the third ink), one level of nesting flattened
  function tokens(code, obj, skip) {
    const val = (v) => Array.isArray(v) ? (v.length ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ") : "none")
      : v !== null && typeof v === "object" ? JSON.stringify(v) : String(v);
    const add = (k, v) => code.append(" ", el("span", "pk", k), " ", el("span", "pv", val(v)));
    for (const [k, v] of Object.entries(obj || {})) {
      if (skip && skip.has(k)) continue;
      if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) add(k + "." + k2, v2);
      else add(k, v);
    }
    return code;
  }

  // ------------------------------------------------------------ list + dock
  let shown = [];
  let firstList = true;
  const rowSig = new Map();
  const seenQ = new Set();
  let navFocus = false;

  function renderList() {
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
    const dock = $("#dock");
    $("#qCount").textContent = pend.length; $("#qEmpty").hidden = pend.length > 0;
    const rises = dock && pend.length > 0 && dock.classList.contains("is-empty"); // the dock rises when a grant arrives
    if (dock) dock.classList.toggle("is-empty", !pend.length);
    document.body.classList.toggle("has-pending", pend.length > 0);
    if (rises) {
      dock.classList.remove("rising"); void dock.offsetWidth; dock.classList.add("rising");
      dock.addEventListener("animationend", () => dock.classList.remove("rising"), { once: true });
    }

    // the dock: the ONE Give / Deny for each grant lives here
    const q = $("#queue"); q.textContent = "";
    for (const a of pend) {
      const c = byCase[a.case_id] || {};
      const name = h.nameOf(a.customer_user_id) || "them";
      const what = `${a.days || 3} days of premium`;
      const li = el("li", "q-item" + (a.status === "failed" ? " failed" : ""));
      li.setAttribute("aria-current", String(a.case_id === S.selected));
      if (!seenQ.has(a.id)) { seenQ.add(a.id); if (!rises) li.classList.add("arrive"); }
      const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
      const l1 = el("span", "q-l1"); l1.append(who(a.customer_user_id), el("span", "q-want", "wants " + what));
      const l2 = el("span", "q-l2");
      const tone = c.state_badge && c.state_badge.tone;
      l2.append(lamp(tone), el("span", "ell", (c.state_badge && c.state_badge.label) || "No status yet"), timeEl(a.created_at));
      b.append(l1, l2);
      b.onclick = () => h.select(a.case_id);
      li.append(b);
      if (a.status === "failed") li.append(el("p", "fail", "Adapty couldn't give it: " + ((a.result && a.result.error) || "error") + ". Nothing changed for " + name + "."));
      const row = el("div", "grant-row");
      const label = a.status === "failed" ? `Try again: give ${name} ${what}` : `Give ${name} ${what}`;
      const ok = el("button", "btn approve", label); ok.type = "button";
      ok.onclick = () => { ok.textContent = `Giving ${name} ${what}…`; Promise.resolve(h.decide(a.id, "approve", ok)).finally(() => { if (!ok.disabled) ok.textContent = label; }); };
      const no = el("button", "btn deny", "Deny"); no.type = "button";
      no.onclick = () => h.decide(a.id, "deny", no);
      row.append(ok, no);
      li.append(row, el("p", "hint", "Nothing is granted until you approve."));
      q.append(li);
    }

    // filters: plain words with counts; the active one in teal
    const fb = $("#filters"); fb.textContent = "";
    for (const [key, label, pred] of h.FILTERS) {
      const n = S.cases.filter(pred).length;
      const b = el("button", "filt"); b.type = "button";
      b.setAttribute("aria-pressed", String(S.filter === key));
      b.append(el("span", "fl", label), document.createTextNode(" "), el("span", "fn", String(n)));
      if (key !== "all" && n) b.classList.add("has");
      b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
      fb.append(b);
    }

    const f = h.FILTERS.find((x) => x[0] === S.filter) || h.FILTERS[0];
    shown = S.cases.filter(f[2]);
    $("#cCount").textContent = shown.length === S.cases.length ? String(S.cases.length) : `${shown.length} of ${S.cases.length}`;
    const empty = $("#cEmpty");
    empty.hidden = shown.length > 0;
    if (!shown.length) {
      empty.textContent = "";
      if (!S.cases.length) {
        const a = el("a", null, "Lumen Help"); a.href = "/help?v=2"; a.target = "_blank"; a.rel = "noopener";
        empty.append(document.createTextNode("No cases yet. Open "), a, document.createTextNode(" and send a message; it shows up here."));
      } else {
        const what = { escalated: "No case needs a person right now.", privacy: "No privacy or data requests.", waiting: "No case is waiting for a grant." }[S.filter] || "Nothing here.";
        empty.append(document.createTextNode(what + " "));
        const back = el("button", "linkish", "Show all cases"); back.type = "button";
        back.onclick = () => { S.filter = "all"; S.sig.list = ""; renderList(); };
        empty.append(back);
      }
    }

    const list = $("#cases"); list.textContent = "";
    let current = null;
    for (const c of shown) {
      const li = el("li"); const b = el("button", "c-item"); b.type = "button";
      b.setAttribute("aria-current", String(c.id === S.selected)); b.dataset.id = c.id;
      if (c.id === S.selected) current = b;
      const st = c.state_badge || {};
      const r1 = el("span", "r1"); r1.append(who(c.customer_user_id), timeEl(c.updated_at));
      const r2 = el("span", "r2"); r2.append(auto(el("span", "c-msg", c.first_message || "…")));
      const flags = el("span", "flags");
      if (c.pending_approval) flags.append(el("span", "flag", "waiting"));
      if (c.privacy) flags.append(el("span", "flag", "privacy"));
      else if (c.escalated) flags.append(el("span", "flag", "needs a person"));
      if (flags.children.length) r2.append(flags);
      b.append(lamp(st.tone, st.label || "No status yet"), r1, r2);
      b.onclick = () => h.select(c.id);
      li.append(b); list.append(li);
    }
    // a row whose state, flags or message count changed since the last refresh flashes once
    const now = new Map();
    for (const c of S.cases) now.set(c.id, [c.state_badge && c.state_badge.code, c.pending_approval, c.escalated, c.privacy, c.messages].join("|"));
    if (!firstList) {
      for (const b of list.querySelectorAll(".c-item")) if (rowSig.get(b.dataset.id) !== now.get(b.dataset.id)) flash(b, "info");
    }
    rowSig.clear(); now.forEach((v, k) => rowSig.set(k, v));
    firstList = false;
    if (current && navFocus) { current.scrollIntoView({ block: "nearest" }); current.focus({ preventScroll: true }); navFocus = false; }
  }

  // ------------------------------------------------------------ detail: transcript + inspector
  const ACT_ICON = (a) => (a.requires_approval ? lamp("warn") : icon("tick"));
  const CLAIM = {
    says_paid: "Says they paid", says_no_access: "Says premium doesn't work", says_charged: "Says they were charged",
    says_cancelled: "Says they cancelled", wants_refund: "Wants a refund", wants_to_cancel: "Wants to cancel",
    says_new_device: "Has a new phone", wants_human: "Asked for a person", privacy_request: "Asked for their data to be deleted",
    claimed_amount: "Mentions an amount", follow_up: "Writes again about the same case", previous_intent: "Earlier question",
    thanks: "Says thanks",
  };
  const CLAIM_FACT = { says_paid: "last_charged_on", says_no_access: "expires_on", says_charged: "last_charged_on",
    says_cancelled: "cancelled_on", wants_refund: "refund_policy", wants_to_cancel: "renews_on",
    says_new_device: "restore_steps_key", claimed_amount: "price" };
  const CONTRA = {
    nothing_charged: { keys: ["says_charged"], text: "The account shows no charge." },
    charged_before_cancel: { keys: ["says_charged"], text: "The charge came before the cancellation." },
    has_access: { keys: ["says_no_access"], text: "Premium is active on the account." },
  };
  const VAL_CLAIM = new Set(["claimed_amount", "previous_intent"]);
  const HIDE_PARAM = new Set(["store", "state", "steps_key"]); // the same values sit in the FactSheet right below

  function grantEl(a, c) {
    const f = c.facts || {};
    const name = h.nameOf(a.customer_user_id) || "them";
    const what = `${a.days || f.grant_days || 3} days of premium`;
    const w = el("div", "grant " + a.status);
    w.dataset.k = "g:" + a.id; w.dataset.v = a.status;
    w.dataset.tone = a.status === "approved" ? "ok" : a.status === "failed" ? "bad" : a.status === "pending" ? "warn" : "info";
    if (a.status === "pending" || a.status === "failed") {
      const p = el("p", "waiting");
      p.append(icon("down"), el("span", null, a.status === "failed"
        ? `Giving ${name} ${what} failed. Try again in the decision bar below.`
        : `Waiting for your OK on ${what} for ${name}. Give it or deny it in the decision bar below.`));
      w.append(p);
    } else if (a.status === "approved") {
      const p = el("p", "done");
      p.append(icon("tick"), el("span", null, "Premium given" + (a.result && a.result.expires_at ? " until " + h.day(a.result.expires_at, true) : "")));
      w.append(p);
    } else if (a.status === "denied") {
      w.append(el("p", "done no", `You said no to ${what}. ${cap(h.nameOf(a.customer_user_id) || "the user")} will see that.`));
    } else w.append(el("p", "done no", `${cap(what)} is ${a.status}.`));
    return w;
  }

  function kvTable(rows, cls) { // rows: [label, value, title?, valueClass?]
    const t = el("table", "kv" + (cls ? " " + cls : "")); const tb = el("tbody");
    for (const [k, v, title, vc] of rows) {
      const tr = el("tr"); const th = el("th", null, k); th.scope = "row"; if (title) th.title = title;
      const td = el("td", vc || "mono"); td.translate = false;
      if (v instanceof Node) td.append(v); else td.textContent = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
      tr.append(th, td); tb.append(tr);
    }
    t.append(tb); return t;
  }

  function claimsBlock(c) {
    const claims = (c.intent && c.intent.claims) || {};
    const f = c.facts || {};
    const ex = (c.actions || []).find((a) => a.kind === "EXPLAIN_STATUS");
    const contra = ex && ex.params && ex.params.claim_contradicted ? (CONTRA[ex.params.reason] || { keys: [], text: "The account says otherwise." }) : null;
    const keys = Object.keys(claims);
    let struck = contra ? contra.keys.filter((k) => k in claims) : [];
    if (contra && !struck.length && contra.keys.length) { keys.push(contra.keys[0]); struck = [contra.keys[0]]; }
    if (!keys.length) return el("p", "quiet", "No specific claims.");
    const ul = el("ul", "claims");
    for (const k of keys) {
      const v = claims[k];
      const isContra = struck.includes(k);
      const li = el("li", "claim" + (isContra ? " contra" : ""));
      const t = el("span", "cl-t"); t.title = k;
      t.append(el("span", "cl-w", CLAIM[k] || cap(words(k))));
      if (VAL_CLAIM.has(k) || (v !== true && v != null && !(k in CLAIM))) t.append(document.createTextNode(" "), mono("cl-v", String(v)));
      const fk = CLAIM_FACT[k];
      const fact = el("span", "cl-f");
      if (fk) {
        fact.append(mono("fk", fk), document.createTextNode(" "));
        if (f[fk]) fact.append(mono("fv", String(f[fk])));
        else fact.append(el("span", "none", "not on the account"));
      } else fact.append(el("span", "none", "no matching fact"));
      li.append(t, fact);
      if (isContra) li.append(el("span", "cl-why", contra.text));
      ul.append(li);
    }
    return ul;
  }

  function verdictLine(c) {
    const v = c.validator;
    if (!v) return el("p", "verdict wait", "The reply is still being written…");
    const rv = h.realViolations(v.violations);
    const ok = v.used_fallback || !rv.length; // a rejected draft is replaced by the checked template
    const p = el("p", "verdict " + (ok ? "ok" : "bad"));
    p.append(icon(ok ? "tick" : "cross"), el("span", null, ok
      ? "Every fact in the reply matches the account."
      : `The reply states ${rv.length === 1 ? "something" : rv.length + " things"} the account doesn't support. See Reply check.`));
    p.dataset.k = "verdict"; p.dataset.v = ok ? "ok" : "bad"; p.dataset.tone = ok ? "ok" : "bad";
    return p;
  }

  function replyNote(meta) {
    const rv = h.realViolations(meta.violations), le = h.llmErrors(meta.violations, meta.llm_error);
    const bits = [meta.used_fallback ? "Checked template answered" : meta.source === "seed" ? "Scripted demo reply passed the check" : "Model reply passed the check"];
    if (rv.length) bits[0] = rv.length + (rv.length === 1 ? " rule broken" : " rules broken");
    if (le.length) bits.push("the model was unavailable");
    if (meta.status === "error") bits.push("the pipeline failed");
    return { text: bits.join(", ") + ".", bad: rv.length > 0 || meta.status === "error", rv, le };
  }

  const prev = { id: null, vals: new Map() };
  function renderDetail(d) {
    const box = $("#detail");
    const c = d.case; const f = c.facts || {}; const fl = d.flags || {};
    const same = prev.id === c.id;
    const keep = same ? [box.scrollTop, ...[...box.querySelectorAll(".scroll")].map((n) => n.scrollTop)] : null;
    box.textContent = "";
    box.classList.add("has-case");

    // ---------------- transcript
    const tr = el("section", "transcript scroll"); tr.setAttribute("aria-label", "Conversation");
    const head = el("header", "d-head");
    const h2 = el("h2"); h2.append(who(c.customer_user_id, "span"));
    const meta = el("dl", "d-meta");
    const add = (k, v, cls) => { if (!v) return; const x = el("div"); x.append(el("dt", null, k), el("dd", cls || null, v)); meta.append(x); };
    add("Writes in", c.language ? h.langName(c.language) : "Not known yet");
    add("Store", f.store_name || "No purchase");
    add("Plan", f.product_name);
    add("Opened", clock(c.created_at), "mono");
    head.append(h2, meta);
    tr.append(head);

    const turns = el("ol", "turns");
    for (const m of d.messages) {
      const mm = m.meta || {};
      const pending = mm.status === "pending";
      const li = el("li", `turn ${m.role}${pending ? " pending" : ""}${mm.event === "grant_denied" ? " denied" : ""}`);
      li.dataset.k = "m:" + m.id; li.dataset.v = (mm.status || "") + (pending ? "" : String(m.text).length);
      li.dataset.tone = m.role === "assistant" ? "amber" : m.role === "system" ? (mm.event === "grant_denied" ? "info" : "ok") : "info";
      const th = el("div", "turn-head");
      th.append(el("span", "turn-who", m.role === "user" ? (h.nameOf(c.customer_user_id) || "User") : m.role === "system" ? "Lumen team" : "Case Desk"));
      if (m.role === "assistant" && !pending) {
        const n = replyNote(mm);
        const ck = el("span", "checked" + (n.bad ? " bad" : ""));
        ck.append(icon(n.bad ? "cross" : "tick"), el("span", null, n.bad ? "Check failed" : "Checked"));
        ck.title = n.text;
        th.append(ck);
      }
      if (mm.status === "error") th.append(el("span", "turn-flag bad", "Something went wrong"));
      if (mm.abandoned) th.append(el("span", "turn-flag", "Never seen by the user"));
      th.append(timeEl(m.created_at, true));
      li.append(th, auto(el("div", "txt", pending ? "Writing the reply…" : m.text)));
      turns.append(li);
    }
    tr.append(turns);

    // ---------------- inspector (always visible: no disclosure)
    const ins = el("section", "inspector scroll"); ins.setAttribute("aria-label", "Inspector");
    const tone = (c.state && c.state.tone) || "info";
    const ro = el("div", "readout " + tone);
    ro.dataset.k = "status"; ro.dataset.v = (c.state && c.state.code) + "|" + h.stateLine(c.state, f); ro.dataset.tone = tone;
    const rl = el("p", "ro-label"); rl.append(lamp(tone), el("span", null, (c.state && c.state.label) || "No status yet"));
    ro.append(rl, el("p", "ro-line", h.stateLine(c.state, f)));
    ro.append(verdictLine(c));
    const alerts = [];
    if (fl.privacy) alerts.push(["warn", "Privacy or data request. Handle it through your data-protection process."]);
    (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy).forEach((r) => alerts.push(["warn", "Needs a person, because " + h.reasonText(r) + "."]));
    if (c.intent && c.intent.injection_suspected) alerts.push(["bad", "The message tried to give Case Desk orders. It was ignored."]);
    if (alerts.length) {
      const ul = el("ul", "alerts");
      alerts.forEach(([t, text]) => { const li = el("li", "alert " + t); li.append(lamp(t), el("span", null, text)); ul.append(li); });
      ro.append(ul);
    }
    ins.append(ro);

    // what Case Desk did, with the policy code under each line and the grant under its request
    const did = sub("What Case Desk did");
    const acts = c.actions || [];
    const grants = d.approvals.map((a) => grantEl(a, c));
    if (acts.length) {
      const ul = el("ul", "did");
      for (const a of acts) {
        const li = el("li", a.requires_approval ? "needs" : null);
        const body = el("div", "did-b");
        body.append(el("span", "did-t", h.actionText(a)));
        const code = el("code", "did-k"); code.translate = false;
        code.append(el("span", "k", a.kind));
        tokens(code, a.params, HIDE_PARAM);
        body.append(code);
        if (a.kind === "PROPOSE_GRANT") grants.splice(0).forEach((g) => body.append(g));
        li.append(ACT_ICON(a), body);
        ul.append(li);
      }
      did.append(ul);
    } else did.append(el("p", "quiet", c.validator ? "Answered the message. Nothing else was needed." : "Still working on it…"));
    grants.forEach((g) => did.append(g));
    ins.append(did);

    // claims against the facts
    const cl = sub("What the user claims");
    cl.append(claimsBlock(c));
    ins.append(cl);

    // the FactSheet
    const fs = sub("Facts the reply may use");
    fs.append(el("p", "sec-note", "Code built this FactSheet from the Adapty profile. A reply may state these facts and nothing else."));
    fs.append(kvTable(Object.entries(f).map(([k, v]) => [words(k), v, k])));
    ins.append(fs);

    // validator, per reply
    const vc = sub("Reply check");
    const v = c.validator;
    if (v) {
      const rv = h.realViolations(v.violations), le = h.llmErrors(v.violations, v.llm_error);
      vc.append(kvTable([
        ["Rules broken", String(rv.length), null, "mono " + (rv.length ? "bad" : "ok")],
        ["Template used instead of the draft", v.used_fallback ? "yes" : "no", null, "mono"],
        ["Source", v.source || "", null, "mono"],
      ], "tight"));
      if (rv.length) { const ul = el("ul", "violations"); rv.forEach((x) => ul.append(el("li", null, x))); vc.append(ul); }
      if (le.length) { const ul = el("ul", "codes"); le.forEach((x) => ul.append(mono(null, x))); vc.append(ul); }
    } else vc.append(el("p", "quiet", "The reply is still being written…"));
    const per = el("ol", "per-reply");
    d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending").forEach((m) => {
      const n = replyNote(m.meta); const li = el("li", n.bad ? "bad" : null);
      li.append(timeEl(m.created_at, true), el("span", null, n.text)); per.append(li);
    });
    if (per.children.length) vc.append(per);
    ins.append(vc);

    // approval records
    if (d.approvals.length) {
      const ap = sub("Approval records", d.approvals.length);
      const ol = el("ol", "records");
      d.approvals.forEach((a) => {
        const li = el("li");
        li.append(kvTable([
          ["Request", a.id], ["Status", a.status], ["Grant", `${a.days || "?"} days of ${a.access_level_id}`],
          ["Requested", clock(a.created_at)], ...(a.decided_at ? [["Decided", clock(a.decided_at)]] : []),
          ...(a.result && Object.keys(a.result).length ? [["Adapty result", JSON.stringify(a.result)]] : []),
        ], "tight"));
        ol.append(li);
      });
      ap.append(ol);
      ins.append(ap);
    }

    // the case record (sale context without the A/B test)
    const rec = sub("Case record");
    const sc = c.sale_context || {};
    const rows = [["Case", c.id], ["User", c.customer_user_id], ["Opened", clock(c.created_at)], ["Updated", clock(c.updated_at)]];
    if (c.state) rows.push(["State", c.state.code]);
    if (c.intent && c.intent.type) rows.push(["Intent", c.intent.type + (c.intent.source ? " (" + c.intent.source + ")" : "")]);
    if (c.language) rows.push(["Language", c.language]);
    rows.push(["Channel", words(sc.acquisition_channel || "unknown")]);
    if (sc.placement || sc.flow) rows.push(["Placement and flow", [sc.placement, sc.flow].filter(Boolean).join(" / ")]);
    rec.append(kvTable(rows, "tight"));
    if (sc.placement || sc.flow) rec.append(el("p", "sec-note", "Placement and flow come from the seed CSV, a stand-in for Adapty paywall data."));
    if (c.state && c.state.evidence && c.state.evidence.length) {
      const ev = el("ul", "codes"); c.state.evidence.forEach((x) => { const li = el("li"); li.append(mono(null, x)); ev.append(li); });
      rec.append(el("p", "sec-sub", "Why the engine chose this state"), ev);
    }
    ins.append(rec);

    // audit log as a compact time grid
    const au = sub("Audit log", d.audit.length);
    const ol = el("ol", "audit");
    d.audit.forEach((e) => {
      const li = el("li");
      const ev = el("span", "a-ev"); ev.append(mono("a-e", e.event), document.createTextNode(" "), mono("a-a", e.actor));
      const det = el("code", "a-d"); det.translate = false;
      tokens(det, e.detail);
      li.append(timeEl(e.ts, true), ev, det);
      ol.append(li);
    });
    au.append(ol);
    ins.append(au);

    const mods = Object.entries(S.modules || {});
    if (mods.length) {
      const sm = sub("System modules");
      sm.append(kvTable(mods.map(([k, val]) => [words(k), val, k, "mono" + (val === "stub" ? " warn" : "")]), "tight"));
      ins.append(sm);
    }

    box.append(tr, ins);
    if (keep) { box.scrollTop = keep[0]; box.querySelectorAll(".scroll").forEach((n, i) => { n.scrollTop = keep[i + 1] || 0; }); }

    // reverse video for whatever changed on this case since the last refresh
    const vals = new Map();
    box.querySelectorAll("[data-k]").forEach((n) => vals.set(n.dataset.k, n.dataset.v));
    if (same) box.querySelectorAll("[data-k]").forEach((n) => { if (prev.vals.get(n.dataset.k) !== n.dataset.v) flash(n, n.dataset.tone); });
    prev.id = c.id; prev.vals = vals;
  }

  // ------------------------------------------------------------ top bar, live state, toast
  function renderMeta(meta) {
    const m = $("#topMeta"); if (!m) return;
    m.textContent = "";
    if (meta.demo) m.append(el("span", "tm", "Demo data"));
    const stubs = Object.values(S.modules).filter((v) => v === "stub").length;
    if (stubs) m.append(el("span", "tm warn", `${stubs} ${stubs === 1 ? "module runs" : "modules run"} on stand-ins`));
  }
  function live(text, tone) {
    const n = $("#live"); if (!n) return;
    const ok = tone !== "bad";
    n.textContent = ""; n.className = "live " + (ok ? "ok" : "bad");
    n.append(lamp(ok ? "ok" : "bad"), el("span", "lv", ok ? "Live" : cap(String(text || "offline"))));
    if (ok) { const d = new Date(); n.append(mono("lv-t", hm(d) + ":" + pad(d.getSeconds()))); }
  }
  function toast(text, ms = 3200) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const bad = ms > 5000; // errors come with a longer time
    const t = el("div", "toast" + (bad ? " bad" : "")); t.setAttribute("role", bad ? "alert" : "status");
    t.append(lamp(bad ? "bad" : /^denied/i.test(text) ? "info" : "ok"), el("span", null, text));
    document.body.append(t);
    setTimeout(() => t.remove(), Math.min(ms, 5200));
  }

  // ------------------------------------------------------------ keyboard: j / k move through the shown cases
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== "j" && e.key !== "k") return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const app = $("#app"); if (!app || app.hidden || !shown.length) return;
    const i = shown.findIndex((c) => c.id === S.selected);
    const j = i < 0 ? 0 : Math.max(0, Math.min(shown.length - 1, i + (e.key === "j" ? 1 : -1)));
    if (j === i) return;
    e.preventDefault();
    navFocus = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("#cases")) || matchMedia("(min-width: 980px)").matches;
    h.select(shown[j].id);
  });

  // the dock is a fixed sheet on phones: the page is padded by its height so it never hides the end of the page
  const dock = document.getElementById("dock");
  if (dock && "ResizeObserver" in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty("--dock-h", dock.offsetHeight + "px")).observe(dock);
  }

  return { renderList, renderDetail, renderMeta, live, toast, narrowQuery: "(max-width: 979px)" };
};
