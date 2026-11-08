/* Case Desk console, iteration 2 "Night Shift". Same data, calls and actions as the stock console (static/console.js);
   only the drawing changes. Three panes: the case list; the case itself (status, conversation, what Case Desk did);
   the evidence (claims beside the facts, the reply check, records, the raw policy table, the audit log). The decision
   dock holds the queue and rises when a grant arrives.
   - Every value is set with textContent; nothing from the API goes through innerHTML.
   - A value that changes on the live refresh flashes once as a label-sized reverse-video chip, never a whole block.
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
    p.setAttribute("d", { tick: "M3.5 8.5 6.5 11.5 12.5 4.5", cross: "M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5", down: "M8 3.5v8.5M4.5 8.5 8 12l3.5-3.5",
      person: "M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 13.5c.6-2.3 2.4-3.6 4.5-3.6s3.9 1.3 4.5 3.6",
      chev: "M6 4l4 4-4 4" }[kind]);
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
  // the state label is written to the subscriber; the developer reads about them
  const devLabel = (l) => String(l || "").replace(/\bafter you cancelled\b/i, "after they cancelled");

  // ------------------------------------------------------------ time and value formatting (human words before codes)
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
  const dm = (d) => d.toLocaleString("en-GB", { day: "numeric", month: "short" });
  const dmy = (d) => d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/, ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  function clock(iso) { const d = new Date(iso); return isNaN(d) ? String(iso || "") : dm(d) + " " + hm(d); }
  function human(v) { // "2026-10-15" -> "15 Oct 2026"; "2026-11-07T00:12:04+00:00" -> "7 Nov 2026 00:12"
    if (typeof v !== "string") return v;
    if (ISO_DAY.test(v)) { const d = new Date(v + "T12:00:00"); return isNaN(d) ? v : dmy(d); }
    if (ISO_TS.test(v)) { const d = new Date(v); return isNaN(d) ? v : dmy(d) + " " + hm(d); }
    return v;
  }
  function short(iso) {
    const d = new Date(iso); if (isNaN(d)) return "";
    const s = (Date.now() - d) / 1000;
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + " min";
    return d.toDateString() === new Date().toDateString() ? hm(d) : dm(d);
  }
  function timeEl(iso, mode, sameDayAs) {
    let text = short(iso);
    if (mode === "full") text = clock(iso);
    if (mode === "turn") { const d = new Date(iso), o = new Date(sameDayAs); text = !isNaN(d) && !isNaN(o) && d.toDateString() === o.toDateString() ? hm(d) : clock(iso); }
    const t = el("time", "mono t", text); t.dateTime = iso || ""; t.title = clock(iso); return t;
  }
  const words = (k) => String(k).replace(/_/g, " ");

  // reverse video, label-sized: the element gets a chip in its own colour for 700ms
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
  // raw "key value" tokens for the technical tables; one level of nesting flattened
  function tokens(code, obj, fmt) {
    const val = (v) => Array.isArray(v) ? (v.length ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ") : "none")
      : v !== null && typeof v === "object" ? JSON.stringify(v) : String(fmt ? human(v) : v);
    const add = (k, v) => code.append(" ", el("span", "pk", k), " ", el("span", "pv", val(v)));
    for (const [k, v] of Object.entries(obj || {})) {
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
  const given = new Map();       // approval id -> the case open when it was given here (its green line stays until you move on)
  const why = new Map();         // case id -> the status sentence, learnt when the case was open
  const orders = new Map();      // case id -> the message tried to give Case Desk orders (from the case itself)
  const asked = new Set();
  let featured = null;           // the approval shown as the big decision card

  // escalated: the reason in words, never amber. Dylan "tried to give orders" (known once his case is read)
  function personReason(c) {
    if (orders.get(c.id)) return "tried to give orders";
    if (c.privacy || (c.escalation_reasons || []).includes("privacy_request")) return "privacy request";
    if ((c.escalation_reasons || []).includes("user_requested_human")) return "asked for a person";
    return "needs a person";
  }
  function learnOrders(cases) {
    for (const c of cases) {
      if (!c.escalated || asked.has(c.id)) continue;
      asked.add(c.id);
      h.api("/api/cases/" + encodeURIComponent(c.id)).then((d) => {
        if (d && d.case && d.case.intent && d.case.intent.injection_suspected) { orders.set(c.id, true); h.rerenderList(); }
      }).catch(() => asked.delete(c.id));
    }
  }

  function decideBtn(a, ok, label, busy) {
    ok.onclick = () => {
      given.set(a.id, S.selected);
      ok.closest(".q-item").classList.add("deciding");
      ok.textContent = busy;
      Promise.resolve(h.decide(a.id, "approve", ok)).finally(() => { if (!ok.disabled) { ok.textContent = label; given.delete(a.id); } });
    };
  }

  function bigCard(a, c) { // the one-click moment: who, what, why, what changes, then the amber button
    const name = h.nameOf(a.customer_user_id) || "them";
    const days = a.days || 3, what = `${days} days of premium`;
    const li = el("li", "q-item big" + (a.status === "failed" ? " failed" : ""));
    li.setAttribute("aria-current", String(a.case_id === S.selected));
    const kick = el("p", "q-kick");
    kick.append(lamp("warn"), el("span", null, a.status === "failed" ? "Adapty refused the last try" : "Case Desk asks you to confirm"), timeEl(a.created_at));
    const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
    const want = el("span", "q-want", what);
    const l1 = el("span", "q-l1"); l1.append(who(a.customer_user_id), want);
    b.append(l1);
    b.onclick = () => h.select(a.case_id);
    const body = el("div", "q-body");
    body.append(b);
    const sentence = why.get(a.case_id) || devLabel(c.state_badge && c.state_badge.label);
    if (sentence && a.case_id !== S.selected) body.append(el("p", "q-why", sentence)); // the open case already says why
    body.append(el("p", "q-change", `${cap(name)} gets premium for ${days} days. Nothing else changes.`));
    li.append(kick, body);
    if (a.status === "failed") li.append(el("p", "fail", "Adapty couldn't give it: " + ((a.result && a.result.error) || "error") + ". Nothing changed for " + name + "."));
    const row = el("div", "grant-row");
    const label = a.status === "failed" ? `Try again: give ${name} ${what}` : `Give ${name} ${what}`;
    const ok = el("button", "btn approve big", label); ok.type = "button";
    decideBtn(a, ok, label, `Giving ${name} ${what}…`);
    const no = el("button", "btn deny", "Deny"); no.type = "button";
    no.onclick = () => h.decide(a.id, "deny", no);
    row.append(ok, no);
    li.append(row, el("p", "hint", "Nothing is granted until you approve."));
    return { li, want };
  }

  function rowItem(a) { // a compact row with its own small Give / Deny
    const name = h.nameOf(a.customer_user_id) || "them";
    const days = a.days || 3, what = `${days} days of premium`;
    const li = el("li", "q-item row" + (a.status === "failed" ? " failed" : ""));
    li.setAttribute("aria-current", String(a.case_id === S.selected));
    const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
    const want = el("span", "q-want", `${days} ${days === 1 ? "day" : "days"}`);
    const l1 = el("span", "q-l1"); l1.append(who(a.customer_user_id), want);
    b.append(l1, timeEl(a.created_at));
    b.onclick = () => h.select(a.case_id);
    li.append(b);
    if (a.status === "failed") li.append(el("p", "fail", "Adapty refused the last try."));
    const row = el("div", "grant-row");
    const label = a.status === "failed" ? `Try again: give ${name} ${what}` : `Give ${name} ${what}`;
    const ok = el("button", "btn approve", a.status === "failed" ? "Try again" : `Give ${days} days`); ok.type = "button";
    ok.setAttribute("aria-label", label); ok.title = label;
    decideBtn(a, ok, ok.textContent, "Giving…");
    const no = el("button", "btn deny", "Deny"); no.type = "button"; no.setAttribute("aria-label", `Deny ${name} ${what}`);
    no.onclick = () => h.decide(a.id, "deny", no);
    row.append(ok, no);
    li.append(row, el("p", "hint sr-only", "Nothing is granted until you approve."));
    return { li, want };
  }

  function renderDock(byCase) {
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed")
      .sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)));
    for (const [id, at] of given) if (at !== S.selected) given.delete(id);  // you moved on: the green line goes
    const done = S.approvals.filter((a) => a.status === "approved" && given.has(a.id));
    const dock = $("#dock");
    const days = pend.reduce((n, a) => n + (a.days || 3), 0);
    $("#qCount").textContent = pend.length;
    $("#qWord").textContent = pend.length ? "waiting for your OK" : done.length ? "Nothing else waiting" : "Nothing waiting for your OK";
    $("#qCount").hidden = !pend.length;
    $("#qDays").textContent = pend.length ? `${days} ${days === 1 ? "day" : "days"} of premium asked for` : "";
    $("#qEmpty").hidden = pend.length > 0 || done.length > 0;
    const busy = pend.length > 0 || done.length > 0;
    const rises = dock && busy && dock.classList.contains("is-empty"); // the dock rises when a grant arrives
    if (dock) { dock.classList.toggle("is-empty", !busy); dock.classList.toggle("all-done", !pend.length && busy); }
    document.body.classList.toggle("has-pending", busy);
    if (rises) {
      dock.classList.remove("rising"); void dock.offsetWidth; dock.classList.add("rising");
      dock.addEventListener("animationend", () => dock.classList.remove("rising"), { once: true });
    }

    // a grant arrives (or is waiting on load) and no case is open: open its case, so the facts sit above the button
    const fresh = pend.find((a) => !seenQ.has(a.id));
    if (!S.selected && pend.length && (firstList || fresh) && matchMedia("(min-width: 980px)").matches) {
      const t = fresh || pend[0]; setTimeout(() => { if (!S.selected) h.select(t.case_id); }, 0);
    }
    const q = $("#queue"); q.textContent = "";
    // the green line a decided card collapses into
    for (const a of done) {
      const li = el("li", "q-done"); const p = el("p", "done");
      const until = a.result && a.result.expires_at ? " until " + human(String(a.result.expires_at).slice(0, 10)) : "";
      const t = el("span", null, `Premium given to ${h.nameOf(a.customer_user_id) || "this user"}${until}`);
      p.append(icon("tick"), t); li.append(p); q.append(li);
    }
    // the big card belongs to the case on screen; with no case open, the oldest request gets it.
    // Reading a case with nothing to approve (an escalated one, say), every request stays a compact row.
    featured = pend.find((a) => a.case_id === S.selected) || (S.selected ? null : pend[0]) || null;
    if (featured) {
      const { li, want } = bigCard(featured, byCase[featured.case_id] || {});
      q.append(li);
      if (!seenQ.has(featured.id)) { seenQ.add(featured.id); if (!rises && !firstList) requestAnimationFrame(() => flash(want, "warn")); }
    }
    const rest = pend.filter((a) => a !== featured);
    q.classList.toggle("has-rest", !!featured && rest.length > 0);
    if (rest.length) {
      const box = el("li", "q-rest"); box.setAttribute("role", "presentation");
      const hd = el("h3", "q-rest-h", featured ? "Also waiting" : "Open a request to see it in full, or decide it here");
      if (featured) hd.append(document.createTextNode(" "), mono("n", String(rest.length)));
      const ol = el("ol", "q-rows");
      for (const a of rest) {
        const { li, want } = rowItem(a); ol.append(li);
        if (!seenQ.has(a.id)) { seenQ.add(a.id); if (!rises && !firstList) requestAnimationFrame(() => flash(want, "warn")); }
      }
      box.append(hd, ol); q.append(box);
    }
  }

  function caseRow(c, wait) {
    const esc = c.escalated && c.status !== "resolved";
    const li = el("li"); const b = el("button", "c-item" + (esc && !wait ? " esc" : "") + (wait ? " wait" : "")); b.type = "button";
    b.setAttribute("aria-current", String(c.id === S.selected)); b.dataset.id = c.id;
    const st = c.state_badge || {};
    const r1 = el("span", "r1"); r1.append(who(c.customer_user_id), timeEl(c.updated_at));
    const r2 = el("span", "r2"); r2.append(auto(el("span", "c-msg", c.first_message || "…")));
    const flags = el("span", "flags");
    if (c.pending_approval) flags.append(el("span", "flag", "waiting for your OK"));
    if (esc) flags.append(el("span", "flag person", personReason(c)));
    if (flags.children.length) r2.append(flags);
    if (esc && !wait) {
      const m = icon("person"); m.setAttribute("role", "img"); m.setAttribute("aria-label", "Needs a person"); m.removeAttribute("aria-hidden");
      b.append(m, r1, r2);
    } else if (givenOf(S.approvals.filter((a) => a.case_id === c.id).sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))))) b.append(lamp("ok", "Premium given"), r1, r2);
    else b.append(lamp(st.tone, devLabel(st.label) || "No status yet"), r1, r2);
    b.onclick = () => h.select(c.id);
    li.append(b);
    return { li, b };
  }

  function renderList() {
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    learnOrders(S.cases);
    renderDock(byCase);

    // filters: plain words with counts; the active one in teal
    const fb = $("#filters"); fb.textContent = "";
    for (const [key, label, pred] of h.FILTERS) {
      const n = S.cases.filter(pred).length;
      const b = el("button", "filt"); b.type = "button";
      b.setAttribute("aria-pressed", String(S.filter === key));
      b.append(el("span", "fl", label), document.createTextNode(" "), el("span", "fn", String(n)));
      if (key !== "all" && n) b.classList.add("has", key === "waiting" ? "amber" : "person");
      b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
      fb.append(b);
    }

    const f = h.FILTERS.find((x) => x[0] === S.filter) || h.FILTERS[0];
    const matched = S.cases.filter(f[2]);
    // "Waiting for your OK" is pinned first (always, on All and Waiting), then "Needs a person", then the rest
    const waitIds = new Set(S.approvals.filter((a) => a.status === "pending" || a.status === "failed").map((a) => a.case_id));
    const isWait = (c) => c.pending_approval || waitIds.has(c.id);
    const showWait = S.filter === "all" || S.filter === "waiting";
    const waits = showWait ? matched.filter(isWait) : [];
    const people = matched.filter((c) => !waits.includes(c) && c.escalated && c.status !== "resolved");
    const others = matched.filter((c) => !waits.includes(c) && !people.includes(c));
    shown = [...waits, ...people, ...others];
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
    const group = (cls, title, n) => {
      const g = el("li", "c-group " + cls); g.setAttribute("role", "presentation");
      const hd = el("h3"); if (cls === "person") hd.append(icon("person"));
      hd.append(el("span", null, title), document.createTextNode(" "), mono("n", String(n)));
      g.append(hd); list.append(g);
    };
    if (showWait) {
      group("amber" + (waits.length ? " has" : ""), "Waiting for your OK", waits.length);
      if (!waits.length) { const e = el("li", "c-wait-empty", "Nothing waiting. Grants Case Desk asks you to confirm appear here."); e.setAttribute("role", "presentation"); list.append(e); }
    }
    for (const c of waits) { const { li, b } = caseRow(c, true); if (c.id === S.selected) current = b; list.append(li); }
    if (people.length) group("person", "Needs a person", people.length);
    for (const c of people) { const { li, b } = caseRow(c); if (c.id === S.selected) current = b; list.append(li); }
    if ((people.length || showWait) && others.length) group("rest", "Other cases", others.length);
    for (const c of others) { const { li, b } = caseRow(c); if (c.id === S.selected) current = b; list.append(li); }
    // a row whose state, flags or message count changed since the last refresh: its time flashes
    const now = new Map();
    for (const c of S.cases) now.set(c.id, [c.state_badge && c.state_badge.code, c.pending_approval, c.escalated, c.privacy, c.messages].join("|"));
    if (!firstList) {
      const mine = new Set(S.approvals.filter((a) => given.has(a.id)).map((a) => a.case_id)); // your own click: no list flash
      for (const b of list.querySelectorAll(".c-item")) if (rowSig.get(b.dataset.id) !== now.get(b.dataset.id) && !mine.has(b.dataset.id)) flash(b.querySelector(".t"), "info");
    }
    rowSig.clear(); now.forEach((v, k) => rowSig.set(k, v));
    firstList = false;
    if (current && navFocus) { current.scrollIntoView({ block: "nearest" }); current.focus({ preventScroll: true }); navFocus = false; }
  }

  // ------------------------------------------------------------ detail
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
  const MISSING = { last_charged_on: "No charge on the account", cancelled_on: "Never cancelled", renews_on: "Does not renew" };
  const CONTRA = {
    nothing_charged: { keys: ["says_charged"], text: "The account shows no charge." },
    charged_before_cancel: { keys: ["says_charged"], text: "The charge came before the cancellation." },
    has_access: { keys: ["says_no_access"], text: "Premium is active on the account." },
  };
  const VAL_CLAIM = new Set(["claimed_amount", "previous_intent"]);
  const FACT_LABEL = {
    state: "State", product_name: "Plan", access_level_name: "Access level", store_name: "Store", price: "Price",
    purchased_on: "Bought", started_on: "Started", last_charged_on: "Last charged", cancelled_on: "Cancelled",
    billing_issue_on: "Payment failed", expires_on: "Access ends", renews_on: "Renews", trial_ends_on: "Trial ends",
    grace_ends_on: "Grace period ends", granted_until: "Given until", refunded_on: "Refunded", days_left: "Days left",
    days_since_expired: "Days since it ended", ever_charged: "Ever charged", grant_days: "Grant length",
    grant_access_level: "Grant gives", manage_url: "Manage link", payment_url: "Payment link", refund_url: "Refund link",
    refund_policy: "Refunds", restore_steps_key: "Restore steps",
  };
  const FACT_SKIP = new Set(["store", "as_of", "app_name"]);
  const ENUM = { apple_only: "Only Apple refunds", google_request: "Request through Google Play", restore_ios: "iPhone steps", restore_android: "Android steps" };
  function factLabel(k, f) {
    if (k === "expires_on" && f.as_of && f[k] < f.as_of) return "Access ended";
    return FACT_LABEL[k] || cap(words(k));
  }
  function factValue(k, v, c) {
    if (k === "state" && c.state) return devLabel(c.state.label);
    if (k === "grant_days") return `${v} days`;
    if (typeof v === "string" && ENUM[v]) return ENUM[v];
    return human(v);
  }

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
        ? `Giving ${name} ${what} failed. Try again in the decision card below.`
        : `Waiting for your OK on ${what} for ${name}. Give it or deny it in the decision card below.`));
      w.append(p);
    } else if (a.status === "approved") {
      const p = el("p", "done");
      p.append(icon("tick"), el("span", null, "Premium given" + (a.result && a.result.expires_at ? " until " + human(a.result.expires_at) : "")));
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
      const t = el("span", "cl-t"); t.title = k + (v === true ? "" : " " + String(v));
      t.append(el("span", "cl-w", CLAIM[k] || cap(words(k))));
      if (VAL_CLAIM.has(k) || (v !== true && v != null && !(k in CLAIM))) t.append(document.createTextNode(" "), el("span", "cl-v", String(v)));
      const fk = CLAIM_FACT[k];
      const fact = el("span", "cl-f");
      if (fk && f[fk]) {
        fact.title = fk + " " + f[fk];
        fact.append(el("span", "fl", factLabel(fk, f)), document.createTextNode(" "), el("span", "fv", String(factValue(fk, f[fk], c))));
      } else if (fk) { fact.title = fk + " is not in the FactSheet"; fact.append(el("span", "fl", MISSING[fk] || "Not on the account")); }
      else fact.append(el("span", "fl", "Nothing to check against"));
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
    const s = el("span", null, ok
      ? "Every fact in the reply matches the account."
      : `The reply states ${rv.length === 1 ? "something" : rv.length + " things"} the account doesn't support. See Reply check.`);
    s.dataset.k = "verdict"; s.dataset.v = ok ? "ok" : "bad"; s.dataset.tone = ok ? "ok" : "bad";
    p.append(icon(ok ? "tick" : "cross"), s);
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

  // the case's latest grant request, when it was approved
  const givenOf = (aps) => { const l = (aps || [])[aps.length - 1]; return l && l.status === "approved" ? l : null; };
  const EV_KEY = "casedesk.v2.evidence";
  let evOpen = false;
  try { evOpen = localStorage.getItem(EV_KEY) === "open"; } catch { /* default: collapsed */ }
  const prev = { id: null, vals: new Map() };
  function renderDetail(d) {
    const box = $("#detail");
    const c = d.case; const f = c.facts || {}; const fl = d.flags || {};
    const same = prev.id === c.id;
    const keep = same ? [box.scrollTop, ...[...box.querySelectorAll(".scroll")].map((n) => n.scrollTop)] : null;
    box.textContent = "";
    box.classList.add("has-case");

    // ================= the case: who, the status, the conversation, what Case Desk did
    const tr = el("section", "transcript scroll"); tr.setAttribute("aria-label", "The case");
    const head = el("header", "d-head");
    const h2 = el("h2"); h2.append(who(c.customer_user_id, "span"));
    const meta = el("dl", "d-meta");
    const add = (k, v, cls) => { if (!v) return; const x = el("div"); x.append(el("dt", null, k), el("dd", cls || null, v)); meta.append(x); };
    add("Writes in", c.language ? h.langName(c.language) : "Not known yet");
    add("Store", f.store_name || "No purchase");
    add("Plan", f.product_name);
    add("Opened", clock(c.created_at), "mono");
    const evb = el("button", "ev-toggle"); evb.type = "button"; evb.id = "evToggle";
    evb.setAttribute("aria-controls", "evidence"); evb.setAttribute("aria-expanded", String(evOpen));
    evb.title = (evOpen ? "Hide" : "Show") + " the evidence: claims, facts, reply check, records, audit log (e)";
    evb.append(el("span", null, "Evidence"), icon("chev"), el("kbd", null, "e"));
    evb.lastChild.setAttribute("aria-hidden", "true");
    evb.onclick = () => setEvidence(!evOpen);
    head.append(h2, meta, evb);
    tr.append(head);

    const tone = (c.state && c.state.tone) || "info";
    const gave = givenOf(d.approvals);   // approved: the headline says what the click did, the old state below it, struck
    const ro = el("div", "readout " + (gave ? "given" : tone));
    const rl = el("p", "ro-label");
    const rlt = el("span", "ro-l", gave ? "Premium given by the team" : devLabel(c.state && c.state.label) || "No status yet");
    rlt.dataset.k = "status"; rlt.dataset.v = (c.state && c.state.code) + "|" + h.stateLine(c.state, f) + "|" + !!gave; rlt.dataset.tone = tone;
    rl.append(gave ? icon("tick") : lamp(tone), rlt);
    if (gave) {
      const until = gave.result && gave.result.expires_at ? " until " + human(String(gave.result.expires_at).slice(0, 10)) : "";
      ro.append(rl, el("p", "ro-line", `${cap(h.nameOf(c.customer_user_id) || "This user")} has premium${until}`),
        el("p", "ro-was", h.stateLine(c.state, f)), verdictLine(c));
    } else ro.append(rl, el("p", "ro-line", h.stateLine(c.state, f)), verdictLine(c));
    tr.append(ro);
    // escalated: Case Desk could not help, so no button can settle it. Its own ink, not amber (amber asks you to confirm).
    const injected = !!(c.intent && c.intent.injection_suspected);
    if (injected !== !!orders.get(c.id)) { orders.set(c.id, injected); setTimeout(() => h.rerenderList(), 0); }
    if (fl.escalated || fl.privacy) {
      const pn = el("section", "person-note"); pn.setAttribute("aria-label", "Needs a person");
      const ph = el("h3"); ph.append(icon("person"), el("span", null, "A person needs to answer this"));
      const nm = cap(h.nameOf(c.customer_user_id) || "the user");
      const lines = [];
      if (injected) lines.push(["bad", "The message tried to give Case Desk orders. It was ignored; nothing was granted or changed."]);
      if ((fl.escalation_reasons || []).includes("user_requested_human")) lines.push(["person", `${nm} asked for a person. Case Desk said a person will reply.`]);
      if (fl.privacy) lines.push(["person", "Privacy or data request. Handle it through your data-protection process."]);
      (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" && r !== "user_requested_human").forEach((r) => lines.push(["person", "Escalated because " + h.reasonText(r) + "."]));
      const ul = el("ul", "alerts");
      lines.forEach(([t, text]) => { const li = el("li", "alert " + t); li.append(lamp(t === "bad" ? "bad" : "person"), el("span", null, text)); ul.append(li); });
      pn.append(ph, ul, el("p", "pn-note", "Nothing here to approve. Reply from your support inbox."));
      tr.append(pn);
    } else if (injected) {
      const ul = el("ul", "alerts solo"); const li = el("li", "alert bad");
      li.append(lamp("bad"), el("span", null, "The message tried to give Case Desk orders. It was ignored.")); ul.append(li); tr.append(ul);
    }

    const turns = el("ol", "turns");
    for (const m of d.messages) {
      const mm = m.meta || {};
      const pending = mm.status === "pending";
      const li = el("li", `turn ${m.role}${pending ? " pending" : ""}${mm.event === "grant_denied" ? " denied" : ""}`);
      const th = el("div", "turn-head");
      const nm = el("span", "turn-who", m.role === "user" ? (h.nameOf(c.customer_user_id) || "User") : m.role === "system" ? "Lumen team" : "Case Desk");
      nm.dataset.k = "m:" + m.id; nm.dataset.v = (mm.status || "") + (pending ? "" : String(m.text).length);
      nm.dataset.tone = m.role === "assistant" ? "amber" : m.role === "system" ? (mm.event === "grant_denied" ? "info" : "ok") : "info";
      th.append(nm);
      if (m.role === "assistant" && !pending) {
        const n = replyNote(mm);
        const ck = el("span", "checked" + (n.bad ? " bad" : ""));
        ck.append(icon(n.bad ? "cross" : "tick"), el("span", null, n.bad ? "Check failed" : "Checked"));
        ck.title = n.text;
        th.append(ck);
      }
      if (mm.status === "error") th.append(el("span", "turn-flag bad", "Something went wrong"));
      if (mm.abandoned) th.append(el("span", "turn-flag", "Never seen by the user"));
      th.append(timeEl(m.created_at, "turn", c.created_at));
      li.append(th, auto(el("div", "txt", pending ? "Writing the reply…" : m.text)));
      turns.append(li);
    }
    tr.append(turns);

    // what Case Desk did: plain sentences (the policy code is in the title), the grant under its request
    const did = el("section", "did-sec");
    did.append(el("h3", null, "What Case Desk did"));
    const acts = c.actions || [];
    const grants = d.approvals.map((a) => grantEl(a, c));
    if (acts.length) {
      const ul = el("ul", "did");
      for (const a of acts) {
        const done = a.kind === "PROPOSE_GRANT" && gave;
        const li = el("li", a.requires_approval ? "needs" + (done ? " done" : "") : null);
        const body = el("div", "did-b");
        const t = el("span", "did-t", done ? "Premium given" : h.actionText(a)); t.title = a.kind;
        body.append(t);
        if (a.kind === "PROPOSE_GRANT") grants.splice(0).forEach((g) => body.append(g));
        li.append(a.requires_approval && !done ? lamp("warn") : icon("tick"), body);
        ul.append(li);
      }
      did.append(ul);
    } else did.append(el("p", "quiet", c.validator ? "Answered the message. Nothing else was needed." : "Still working on it…"));
    grants.forEach((g) => did.append(g));
    tr.append(did);

    // ================= the evidence column
    const ins = el("section", "inspector scroll"); ins.setAttribute("aria-label", "Evidence"); ins.id = "evidence";

    const cl = sub("What the user claims");
    cl.append(el("p", "sec-note", "Each claim beside the fact it was checked against."), claimsBlock(c));
    ins.append(cl);

    const fs = sub("Facts the reply may use");
    fs.append(el("p", "sec-note", "Code built this FactSheet from the Adapty profile. A reply may state these facts and nothing else."));
    const factRows = Object.entries(f).filter(([k]) => !FACT_SKIP.has(k)).map(([k, v]) => {
      const val = factValue(k, v, c);
      if (typeof v === "string" && /^https?:\/\//.test(v)) { const u = el("span", "url", v.replace(/^https?:\/\//, "")); u.title = v; return [factLabel(k, f), u, k]; }
      return [factLabel(k, f), val, k + " " + (typeof v === "string" ? v : JSON.stringify(v))];
    });
    fs.append(kvTable(factRows));
    ins.append(fs);

    const vc = sub("Reply check");
    const v = c.validator;
    if (v) {
      const rv = h.realViolations(v.violations), le = h.llmErrors(v.violations, v.llm_error);
      vc.append(kvTable([
        ["Rules broken", String(rv.length), null, "mono " + (rv.length ? "bad" : "ok")],
        ["Template used instead of the draft", v.used_fallback ? "Yes" : "No", null, "plain"],
        ["Reply written by", { seed: "Scripted demo text", template: "The checked template", llm: "The model" }[v.source] || words(v.source || ""), v.source, "plain"],
      ], "tight"));
      if (rv.length) { const ul = el("ul", "violations"); rv.forEach((x) => ul.append(el("li", null, x))); vc.append(ul); }
      if (le.length) { const ul = el("ul", "codes"); le.forEach((x) => { const li = el("li"); li.append(mono(null, x)); ul.append(li); }); vc.append(el("p", "sec-sub", "The model was unavailable, so the checked template answered."), ul); }
    } else vc.append(el("p", "quiet", "The reply is still being written…"));
    const per = el("ol", "per-reply");
    d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending").forEach((m) => {
      const n = replyNote(m.meta); const li = el("li", n.bad ? "bad" : null);
      li.append(timeEl(m.created_at, "turn", c.created_at), el("span", null, n.text)); per.append(li);
    });
    if (per.children.length) vc.append(per);
    ins.append(vc);

    if (d.approvals.length) {
      const ap = sub("Approval records", d.approvals.length);
      const ol = el("ol", "records");
      d.approvals.forEach((a) => {
        const li = el("li");
        const res = a.result && Object.keys(a.result).length ? el("code", "plainc") : null;
        if (res) tokens(res, a.result, true);
        li.append(kvTable([
          ["Request", a.id], ["Status", cap(a.status), null, "plain"], ["Grant", `${a.days || "?"} days of ${a.access_level_id}`, null, "plain"],
          ["Requested", clock(a.created_at)], ...(a.decided_at ? [["Decided", clock(a.decided_at)]] : []),
          ...(res ? [["Adapty result", res]] : []),
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
    if (c.state) rows.push(["State code", c.state.code]);
    if (c.intent && c.intent.type) rows.push(["Intent", c.intent.type + (c.intent.source ? " (" + c.intent.source + ")" : "")]);
    if (c.language) rows.push(["Language code", c.language]);
    rows.push(["Channel", cap(words(sc.acquisition_channel || "unknown")), null, "plain"]);
    if (sc.placement || sc.flow) rows.push(["Placement and flow", [sc.placement, sc.flow].filter(Boolean).join(" / ")]);
    rec.append(kvTable(rows, "tight"));
    if (sc.placement || sc.flow) rec.append(el("p", "sec-note", "Placement and flow come from the seed CSV, a stand-in for Adapty paywall data."));
    if (c.state && c.state.evidence && c.state.evidence.length) {
      const ev = el("ul", "codes"); c.state.evidence.forEach((x) => { const li = el("li"); li.append(mono(null, x)); ev.append(li); });
      rec.append(el("p", "sec-sub", "Why the engine chose this state"), ev);
    }
    ins.append(rec);

    // the one raw table: what policy decided, exactly as stored
    if (acts.length) {
      const pa = sub("Policy actions", acts.length);
      pa.append(kvTable(acts.map((a) => {
        const code = el("code", "raw"); tokens(code, a.params);
        if (a.requires_approval) code.append(" ", el("span", "pk", "requires_approval"), " ", el("span", "pv", "true"));
        return [a.kind, code, null, "mono raw"];
      }), "policy"));
      ins.append(pa);
    }

    const au = sub("Audit log", d.audit.length);
    const ol = el("ol", "audit");
    d.audit.forEach((e) => {
      const li = el("li");
      const ev = el("span", "a-ev"); ev.append(mono("a-e", e.event), document.createTextNode(" "), mono("a-a", e.actor));
      const det = el("code", "a-d"); det.translate = false;
      tokens(det, e.detail, true);
      li.append(timeEl(e.ts, "full"), ev, det);
      ol.append(li);
    });
    au.append(ol);
    ins.append(au);

    const mods = Object.entries(S.modules || {});
    if (mods.length) {
      const sm = sub("System modules");
      sm.append(kvTable(mods.map(([k, val]) => [cap(words(k)).replace(/^Ai\b/, "AI"), val, k, "mono" + (val === "stub" ? " warn" : "")]), "tight"));
      ins.append(sm);
    }

    box.append(tr, ins);
    box.classList.toggle("ev-open", evOpen);
    ins.inert = !evOpen;
    // the decision card reads the status sentence of the case it is about
    const sentence = h.stateLine(c.state, f);
    if (sentence && why.get(c.id) !== sentence) { why.set(c.id, sentence); if (S.approvals.some((a) => a.case_id === c.id && (a.status === "pending" || a.status === "failed"))) setTimeout(() => h.rerenderList(), 0); }
    if (keep) { box.scrollTop = keep[0]; box.querySelectorAll(".scroll").forEach((n, i) => { n.scrollTop = keep[i + 1] || 0; }); }

    // reverse video for whatever changed on this case since the last refresh (labels only)
    const vals = new Map();
    box.querySelectorAll("[data-k]").forEach((n) => vals.set(n.dataset.k, n.dataset.v));
    if (same) {
      const changed = [...box.querySelectorAll("[data-k]")].filter((n) => prev.vals.get(n.dataset.k) !== n.dataset.v);
      const g = changed.filter((n) => n.dataset.k.startsWith("g:")); // a decision: flash only its grant chip, once
      (g.length ? g : changed).forEach((n) => flash(n, n.dataset.tone));
    }
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

  // ------------------------------------------------------------ keyboard: j / k move, e evidence, a give / d deny the big card
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (!/^[jkead]$/.test(e.key)) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const app = $("#app"); if (!app || app.hidden) return;
    if (e.key === "e") { if ($("#detail").classList.contains("has-case")) { e.preventDefault(); setEvidence(!evOpen); } return; }
    if (e.key === "a" || e.key === "d") {
      const b = document.querySelector("#queue .q-item.big " + (e.key === "a" ? ".btn.approve" : ".btn.deny"));
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (!shown.length) return;
    const i = shown.findIndex((c) => c.id === S.selected);
    const j = i < 0 ? 0 : Math.max(0, Math.min(shown.length - 1, i + (e.key === "j" ? 1 : -1)));
    if (j === i) return;
    e.preventDefault();
    navFocus = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest("#cases")) || matchMedia("(min-width: 980px)").matches;
    h.select(shown[j].id);
  });

  // the evidence column: collapsed by default, the reader's choice remembered
  function setEvidence(open) {
    evOpen = open;
    try { localStorage.setItem(EV_KEY, open ? "open" : "closed"); } catch { /* private mode: still toggles */ }
    const box = $("#detail"); box.classList.toggle("ev-open", open);
    const ev = $("#evidence"); if (ev) ev.inert = !open;
    const b = $("#evToggle");
    if (b) { b.setAttribute("aria-expanded", String(open)); b.title = (open ? "Hide" : "Show") + " the evidence: claims, facts, reply check, records, audit log (e)"; }
    if (open && !matchMedia("(min-width: 1200px)").matches) { const ev = $("#evidence"); if (ev) ev.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }

  // the dock is a fixed sheet on phones: the page is padded by its height so it never hides the end of the page
  const dock = document.getElementById("dock");
  if (dock && "ResizeObserver" in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty("--dock-h", dock.offsetHeight + "px")).observe(dock);
  }

  return { renderList, renderDetail, renderMeta, live, toast, narrowQuery: "(max-width: 979px)" };
};
