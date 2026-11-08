/* Iteration 4 "Board": the console as a triage board. Four lanes across the top sort the work by what it needs
   (Needs your OK, Needs a person, Privacy, Answered); the selected case opens as a full-width spread below.
   Behaviour is console.js's: this file only changes how the list, the case and the top bar are drawn.
   Motion: when a ticket changes lane it travels there (FLIP, 280ms); a lane numeral ticks when its count changes. */
window.CaseDeskConsoleView = (h) => {
  "use strict";
  const { S, $, el, day, stateLine, actionText, langName, nameOf, shortId, realViolations, llmErrors,
    reasonText, FILTERS, auto, cap, select, decide } = h;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const curly = (s) => String(s).replace(/(\p{L})'(\p{L})/gu, "$1’$2"); // our own sentences get real apostrophes
  const text = (s) => document.createTextNode(s);

  // ---------------------------------------------------------------- icons: one family, 16px, 1.5 stroke, round joins
  const NS = "http://www.w3.org/2000/svg";
  const PATHS = {
    check: "M3.5 8.4 6.6 11.5 12.5 4.5",
    alert: "M8 4.5v4.2M8 11.2v.3M2.5 13.5h11L8 2.5z",
    up: "M8 13.5V3M3.8 7.2 8 3l4.2 4.2",
    chev: "M6 3.5 10.5 8 6 12.5",
    down: "M4 6l4 4 4-4",
    person: "M8 8a2.6 2.6 0 1 0 0-5.2A2.6 2.6 0 0 0 8 8zM3 13.6c.6-2.4 2.6-3.8 5-3.8s4.4 1.4 5 3.8",
  };
  function icon(name) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("class", "i i-" + name); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", PATHS[name]); s.append(p);
    return s;
  }

  // ---------------------------------------------------------------- small formatters
  // "Ava 00239": the name, then the 5-digit id in mono (no middle dot); no name in production, so the full id
  function who(cuid, tag = "span") {
    const w = el(tag, "who-name"); const n = nameOf(cuid);
    const id = el("span", n ? "uid" : "uid solo", n ? shortId(cuid) : cuid); id.translate = false;
    if (n) { w.append(text(n + " "), id); w.title = cuid; } else w.append(id);
    return w;
  }
  // compact ticket time: "now", "12 min", "3 h", then the date
  function when(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (isNaN(s)) return "";
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + " min";
    if (s < 86400) return Math.floor(s / 3600) + " h";
    return day(iso);
  }
  function timeEl(iso, short) {
    const t = el("time", "tk-time", short ? when(iso) : day(iso, true)); t.dateTime = iso; t.title = day(iso, true); return t;
  }
  const REASONS = { user_requested_human: "Asked for a person", privacy_request: "Privacy or data request" };
  const reasonLine = (c) => (c.escalation_reasons || []).map((r) => REASONS[r] || cap(reasonText(r))).join(". ") || "Handed to a person";
  function stateEl(tone, label, settled) {
    const mark = settled && (tone === "bad" || tone === "warn") ? "out" : tone || "info";
    const s = el("span", "tk-state"); s.append(el("i", "tm " + mark), el("span", "ell", curly(label))); return s;
  }

  // ---------------------------------------------------------------- the board
  const LANES = [
    ["person", "Needs a person", "No one is waiting for a person."],
    ["privacy", "Privacy", "No privacy or data requests."],
    ["done", "Answered", "Answered cases collect here."],
  ];
  const laneOf = (c, queued) => (queued.has(c.id) ? "ok" : c.privacy ? "privacy" : c.escalated ? "person" : "done");
  const L = {};
  function buildLanes() {
    const host = $("#cases");
    for (const [key, word] of LANES) {
      const sec = el("section", "lane"); sec.dataset.lane = key;
      const head = el("h2", "lane-head"); head.id = "lane-" + key;
      const clip = el("span", "num-clip"); const num = el("span", "num", ""); clip.append(num);
      head.append(clip, text(" "), el("span", "word", word));
      sec.setAttribute("aria-labelledby", head.id);
      const ol = el("ol", "lane-list"); const empty = el("p", "lane-empty");
      sec.append(head, ol, empty); host.append(sec);
      L[key] = { sec, num, ol, empty };
    }
    L.ok = { sec: $("#queue").closest(".lane"), num: $("#qCount"), ol: $("#queue"), empty: $("#qEmpty") };
    L.ok.num.textContent = "";
    for (const x of Object.values(L)) {
      const cue = el("button", "lane-more"); cue.type = "button"; cue.hidden = true;
      cue.append(el("span", "lm-t"), icon("down"));
      cue.onclick = () => x.ol.scrollBy({ top: x.ol.clientHeight, behavior: reduced() ? "auto" : "smooth" });
      x.ol.after(cue); x.cue = cue;
      x.ol.addEventListener("scroll", () => countBelow(x), { passive: true });
    }
    const ro = new ResizeObserver(() => { cancelAnimationFrame(fitAll.raf); fitAll.raf = requestAnimationFrame(fitAll); });
    ro.observe($("#board"));
    if (document.fonts) document.fonts.ready.then(fitAll);
  }
  // a lane shows whole tickets only: it ends on the last one that fits, and counts the rest under it
  function fit(x) {
    const list = x.ol, cue = x.cue, items = [...list.children];
    list.style.maxHeight = "";
    if (!items.length) { cue.hidden = true; return; }
    cue.hidden = false; // its line is reserved while measuring
    const room = list.clientHeight, pad = 2;
    if (list.scrollHeight <= room + cue.offsetHeight) { cue.hidden = true; return; }
    let bottom = 0;
    for (const it of items) { const b = it.offsetTop + it.offsetHeight; if (b + pad > room) break; bottom = b; }
    if (bottom) list.style.maxHeight = bottom + pad + "px";
    countBelow(x);
  }
  function countBelow(x) {
    if (!x.cue || x.cue.hidden) return;
    const list = x.ol, edge = list.scrollTop + list.clientHeight + 1;
    const n = [...list.children].filter((it) => it.offsetTop + it.offsetHeight > edge).length;
    x.cue.querySelector(".lm-t").textContent = n ? `${n} more below` : "End of lane";
    x.cue.classList.toggle("end", !n);
    x.cue.disabled = !n;
  }
  function fitAll() { for (const x of Object.values(L)) fit(x); }
  // the numeral ticks like a counter: the new figure rolls in from below (count up) or above (count down)
  function setNum(key, n, animate) {
    const { num, sec } = L[key]; const prev = num.textContent; const next = String(n);
    sec.classList.toggle("has", n > 0);
    if (prev === next) return;
    num.textContent = next;
    if (animate && prev !== "" && !reduced()) {
      const up = n > Number(prev);
      num.animate([{ transform: `translateY(${up ? 70 : -70}%)` }, { transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }
  // FLIP: where each ticket was before the re-render, by case id
  function snapshot() {
    const m = new Map();
    document.querySelectorAll("#board [data-key]").forEach((n) => {
      const r = n.getBoundingClientRect(); const box = n.closest(".lane-list").getBoundingClientRect();
      const seen = r.bottom > box.top + 8 && r.top < box.bottom - 8 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      m.set(n.dataset.key, { lane: n.dataset.lane, r, seen });
    });
    return m;
  }
  function travel(node, from) {
    const list = node.closest(".lane-list");
    const lr = list.getBoundingClientRect(); let to = node.getBoundingClientRect();
    if (to.top < lr.top || to.bottom > lr.bottom) { list.scrollTop += to.top - lr.top - 8; to = node.getBoundingClientRect(); }
    if (!to.width || to.right < 0 || to.left > innerWidth) return;
    const ghost = node.cloneNode(true);
    ghost.removeAttribute("id"); ghost.setAttribute("aria-hidden", "true"); ghost.inert = true; ghost.tabIndex = -1;
    ghost.classList.add("in-transit");
    Object.assign(ghost.style, { left: from.r.left + "px", top: from.r.top + "px", width: to.width + "px", height: to.height + "px" });
    document.body.append(ghost);
    node.style.visibility = "hidden";
    const a = ghost.animate([{ transform: "translate(0, 0)" }, { transform: `translate(${to.left - from.r.left}px, ${to.top - from.r.top}px)` }],
      { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
    const done = () => { ghost.remove(); node.style.visibility = ""; };
    a.onfinish = done; a.oncancel = done;
  }

  function queueItem(a, c) {
    const failed = a.status === "failed";
    const whoN = nameOf(a.customer_user_id) || "them";
    const what = `${a.days || 3} days of premium`;
    const li = el("li", "q-item" + (failed ? " failed" : ""));
    li.dataset.key = a.case_id; li.dataset.lane = "ok";
    li.setAttribute("aria-current", String(a.case_id === S.selected));
    const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
    const top = el("span", "tk-top"); top.append(who(a.customer_user_id), timeEl((c && c.updated_at) || a.created_at, true));
    b.append(top, el("span", "tk-ask", failed ? `Giving ${what} failed` : `Case Desk suggests ${what}`));
    if (c && c.state_badge) b.append(stateEl(c.state_badge.tone, c.state_badge.label));
    b.onclick = () => select(a.case_id);
    li.append(b);
    if (failed) li.append(el("p", "fail", curly("Adapty couldn't give it: " + ((a.result && a.result.error) || "unknown error") + ".")));
    const row = el("div", "grant-row");
    const ok = el("button", "btn approve", failed ? `Try again to give ${whoN} ${what}` : `Give ${whoN} ${what}`);
    ok.type = "button"; ok.onclick = () => decide(a.id, "approve", ok);
    const no = el("button", "btn ghost deny", "Deny"); no.type = "button"; no.onclick = () => decide(a.id, "deny", no);
    row.append(ok, no);
    li.append(row, el("p", "hint", "Nothing is granted until you approve."));
    return li;
  }
  function ticket(c, lane) {
    const li = el("li");
    const b = el("button", "c-item"); b.type = "button";
    b.dataset.key = c.id; b.dataset.lane = lane;
    b.setAttribute("aria-current", String(c.id === S.selected));
    const top = el("span", "tk-top"); top.append(who(c.customer_user_id), timeEl(c.updated_at, true));
    const msg = auto(el("span", "tk-msg", c.first_message || "…"));
    const st = lane === "person" || lane === "privacy"
      ? stateEl("bad", reasonLine(c))
      : stateEl(c.state_badge && c.state_badge.tone, (c.state_badge && c.state_badge.label) || "No status yet", true);
    b.append(top, msg, st);
    b.onclick = () => select(c.id);
    li.append(b);
    return li;
  }

  let first = true;
  function renderList() {
    if (!L.ok) buildLanes();
    const prev = first ? null : snapshot();
    const keep = Object.fromEntries(Object.entries(L).map(([k, x]) => [k, x.ol.scrollTop]));
    const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
    const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
    const queued = new Set(pend.map((a) => a.case_id));
    const pred = (FILTERS.find((f) => f[0] === S.filter) || FILTERS[0])[2];
    const passes = (c) => S.filter === "all" || !c || pred(c);

    // filters: quiet words with a counter; the active one gets ink and a small leading mark
    const fb = $("#filters"); fb.textContent = "";
    for (const [key, label, p] of FILTERS) {
      const n = key === "waiting" ? S.cases.filter((c) => p(c) || queued.has(c.id)).length : S.cases.filter(p).length;
      const b = el("button", "filt"); b.type = "button";
      b.setAttribute("aria-pressed", String(S.filter === key));
      b.append(el("i", "f-mark"), el("span", "f-word", label), el("span", "f-n", String(n)));
      b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
      fb.append(b);
    }

    // lane 1: the grants waiting for an OK. The one Approve / Deny for each grant lives here.
    const q = L.ok.ol; q.textContent = "";
    const qShown = pend.filter((a) => S.filter === "waiting" || passes(byCase[a.case_id]));
    for (const a of qShown) q.append(queueItem(a, byCase[a.case_id]));
    setNum("ok", qShown.length, !first);
    L.ok.empty.hidden = qShown.length > 0;
    L.ok.empty.textContent = pend.length && !qShown.length ? "Grants are waiting, hidden by this filter. Show all to see them."
      : "Nothing waiting for your OK. When Case Desk asks to give someone premium, it lands here.";

    // lanes 2 to 4: every other case, in exactly one lane
    const shown = S.cases.filter((c) => passes(c) && (S.filter !== "waiting" || pred(c) || queued.has(c.id)));
    const groups = { person: [], privacy: [], done: [] };
    for (const c of shown) { const k = laneOf(c, queued); if (k !== "ok") groups[k].push(c); }
    for (const [key, , emptyText] of LANES) {
      const x = L[key]; x.ol.textContent = "";
      for (const c of groups[key]) x.ol.append(ticket(c, key));
      setNum(key, groups[key].length, !first);
      x.empty.textContent = S.filter === "all" ? emptyText : "None in this view.";
      x.empty.hidden = groups[key].length > 0;
    }
    const total = S.cases.length;
    $("#cCount").textContent = S.filter === "all" ? "" : `Showing ${shown.length} of ${total}`;
    const ce = $("#cEmpty"); ce.textContent = "";
    if (!total) {
      ce.append(text("No cases yet. Open "));
      const a = el("a", null, "Lumen Help"); a.href = "/help?v=4"; a.target = "_blank"; a.rel = "noopener";
      ce.append(a, text(" and send a message as a subscriber; it shows up here within a few seconds."));
    } else if (!shown.length && !qShown.length) ce.append(text("Nothing matches this filter right now."));
    ce.hidden = !ce.textContent;

    fitAll();
    for (const [k, top] of Object.entries(keep)) { L[k].ol.scrollTop = top; countBelow(L[k]); }
    if (prev && !reduced()) {
      document.querySelectorAll("#board [data-key]").forEach((n) => {
        const p = prev.get(n.dataset.key);
        if (p && p.seen && p.lane !== n.dataset.lane) travel(n, p);
      });
    }
    first = false;
  }

  // ---------------------------------------------------------------- the spread
  function metaSentence(c, f) {
    const bits = [];
    if (c.language) bits.push(`Writes in ${langName(c.language)}.`);
    if (f.store_name && f.product_name) bits.push(`Bought on ${/^google/i.test(f.store_name) ? "" : "the "}${f.store_name.replace(/^the /i, "")}.`);
    bits.push(`Case opened ${day(c.created_at, true)}.`);
    return bits.join(" ");
  }
  function factsMini(f) {
    const dl = el("dl", "facts");
    const add = (k, v) => { if (v) { const d = el("div"); d.append(el("dt", null, k), el("dd", null, v)); dl.append(d); } };
    add("Price", f.price);
    if (f.granted_until) add("Given until", day(f.granted_until));
    if (f.trial_ends_on) add("Trial ends", day(f.trial_ends_on));
    if (f.renews_on) add("Renews on", day(f.renews_on));
    if (f.billing_issue_on) add("Payment failed", day(f.billing_issue_on));
    if (f.cancelled_on) add("Cancelled", day(f.cancelled_on));
    if (f.refunded_on) add("Refunded", day(f.refunded_on));
    if (f.expires_on && !f.renews_on) add(f.days_since_expired != null ? "Ended on" : "Access until", day(f.expires_on));
    if (f.last_charged_on) add("Last charged", day(f.last_charged_on));
    return dl.children.length ? dl : null;
  }
  const didText = (a) => {
    if (a.kind !== "ESCALATE_TO_HUMAN") return actionText(a);
    const r = (a.params || {}).reason;
    return r === "user_requested_human" ? "Handed it to a person, as they asked" : r === "privacy_request" ? "Handed it to a person, because it is a privacy or data request" : actionText(a);
  };
  function checkFlag(meta) {
    const s = el("span", "flag");
    if (meta.status === "error") { s.classList.add("bad"); s.append(icon("alert"), text("Something went wrong")); return s; }
    const rv = realViolations(meta.violations);
    if (rv.length && !meta.used_fallback) { s.classList.add("bad"); s.append(icon("alert"), text("Check this reply")); return s; }
    s.classList.add("ok"); s.append(icon("check"), text("Checked"));
    s.title = meta.used_fallback ? "The checked template answered" : "Every fact matches the account";
    return s;
  }
  function grantEl(a, c) {
    const f = c.facts || {};
    const whoN = nameOf(a.customer_user_id) || "them";
    const what = `${a.days || f.grant_days || 3} days of premium`;
    const w = el("div", "grant " + a.status);
    if (a.status === "pending" || a.status === "failed") {
      const p = el("p", "waiting"); p.append(icon("up"));
      p.append(el("span", null, a.status === "failed"
        ? `Giving ${whoN} ${what} failed. Try again in the first lane.`
        : "Waiting for your OK. Give or deny it in the first lane."));
      w.append(p);
    } else if (a.status === "approved") {
      const p = el("p", "done"); p.append(icon("check"), el("span", "big", "Premium given"));
      const exp = a.result && a.result.expires_at;
      if (exp) p.append(el("span", "until", `Until ${day(exp, true)}`));
      w.append(p);
    } else if (a.status === "denied") {
      w.append(el("p", "done no", `You said no to ${what}. ${cap(nameOf(a.customer_user_id) || "the user")} will see that.`));
    } else w.append(el("p", "done no", `${cap(what)}: ${a.status}.`));
    return w;
  }
  function kv(obj) {
    const t = el("table", "kv"); const tb = el("tbody");
    Object.entries(obj || {}).forEach(([k, v]) => {
      const tr = el("tr"); const th = el("th", null, k); th.scope = "row"; th.translate = false;
      tr.append(th, el("td", null, typeof v === "string" ? v : JSON.stringify(v))); tb.append(tr);
    });
    t.append(tb); return t;
  }
  function block(title, note, cls, ...kids) {
    const s = el("section", "rec " + (cls || "")); s.append(el("h3", null, title));
    if (note) s.append(el("p", "rec-note", note));
    s.append(...kids); return s;
  }

  function renderDetail(d) {
    const box = $("#detail"); box.textContent = "";
    const c = d.case; const f = c.facts || {}; const fl = d.flags || {};
    const art = el("article", "spread");

    const head = el("header", "d-head");
    const h2 = el("h2"); h2.append(who(c.customer_user_id));
    head.append(h2, el("p", "meta", metaSentence(c, f)));
    art.append(head);

    const grid = el("div", "spread-grid");

    // the evidence column: the facts, the actions policy chose, and whether the reply was checked
    const ev = el("section", "evidence"); ev.setAttribute("aria-label", "The account and what Case Desk did");
    const tone = (c.state && c.state.tone) || "info";
    const waiting = d.approvals.some((a) => a.status === "pending" || a.status === "failed");
    // the bar above the status: coral only while the case needs you, green when the account is fine
    const bar = waiting || fl.escalated || fl.privacy ? "need" : tone === "ok" ? "ok" : "quiet";
    const status = el("p", "status " + bar); status.append(text(curly(stateLine(c.state, f))));
    const sg = el("div", "state-group"); sg.append(status);
    if (f.product_name) sg.append(el("p", "plan", f.product_name));
    ev.append(sg);

    const alerts = [];
    if (fl.privacy) alerts.push("Privacy or data request. Handle it through your data-protection process.");
    (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy)
      .forEach((r) => alerts.push(r === "user_requested_human" ? "They asked for a person. Reply to them yourself." : `Needs a person: ${reasonText(r)}.`));
    if (c.intent && c.intent.injection_suspected) alerts.push("The message tried to give Case Desk orders. It was ignored.");
    if (alerts.length) {
      const ul = el("ul", "alerts");
      alerts.forEach((t) => { const li = el("li"); li.append(icon(/person/.test(t) ? "person" : "alert"), el("span", null, t)); ul.append(li); });
      ev.append(ul);
    }
    for (const a of d.approvals) ev.append(grantEl(a, c));

    const v = c.validator || null;
    const ver = el("p", "verdict");
    if (v) {
      const rv = realViolations(v.violations), le = llmErrors(v.violations, v.llm_error);
      const okp = v.used_fallback || !rv.length; // a rejected draft is replaced by the checked template
      ver.classList.add(okp ? "ok" : "bad"); ver.append(icon(okp ? "check" : "alert"));
      let msg = okp ? "Checked against the account. Every fact in the reply matches." : `${rv.length} ${rv.length === 1 ? "fact in this reply does" : "facts in this reply do"} not match the account. The technical record lists ${rv.length === 1 ? "it" : "them"}.`;
      if (okp && v.used_fallback) msg = le.length ? "The model was unreachable, so the checked template answered. Every fact matches the account."
        : rv.length ? "The draft broke a rule, so the checked template answered. Every fact matches the account."
        : "Answered with the checked template. Every fact matches the account.";
      else if (le.length) msg += " The model was unreachable for part of it.";
      ver.append(el("span", null, msg));
    } else { ver.classList.add("soft"); ver.append(el("span", null, "The reply is still being written…")); }
    ev.append(ver);

    const did = el("section", "did");
    did.append(el("h3", null, "What Case Desk did"));
    const acts = c.actions || [];
    if (acts.length) {
      const ul = el("ul");
      acts.forEach((a) => {
        const open = a.requires_approval && waiting; // once you decided, the request is just something it did
        const li = el("li", open ? "needs" : null); li.append(open ? el("i", "tm bad") : icon("check"), el("span", null, curly(didText(a)))); ul.append(li);
      });
      did.append(ul);
    } else did.append(el("p", "soft", c.validator ? "Answered the message. Nothing else was needed." : "Still working on it…"));
    ev.append(did);
    const fm = factsMini(f); if (fm) ev.append(fm);

    // the conversation column: a script, speaker in the margin
    const convo = el("section", "convo"); convo.setAttribute("aria-labelledby", "convH");
    const ch = el("h3", "sr-only", "Conversation"); ch.id = "convH"; convo.append(ch);
    const ol = el("ol", "turns");
    for (const m of d.messages) {
      const meta = m.meta || {}; const pending = meta.status === "pending";
      const t = el("li", `turn ${m.role}${pending ? " pending" : ""}${meta.status === "error" ? " error" : ""}`);
      const w = el("div", "who");
      w.append(el("b", null, m.role === "user" ? (nameOf(c.customer_user_id) || "User") : m.role === "system" ? "System" : "Case Desk"), timeEl(m.created_at));
      if (m.role === "assistant" && !pending) w.append(checkFlag(meta));
      if (meta.abandoned) w.append(el("span", "flag", "Never seen by the user"));
      t.append(w, auto(el("div", "txt", pending ? "Writing the reply…" : m.text)));
      ol.append(t);
    }
    convo.append(ol);
    grid.append(ev, convo);
    art.append(grid);

    // technical record: one disclosure under the spread, closed until asked for
    const more = el("details", "more");
    const sm = el("summary"); sm.append(icon("chev"), el("span", "sum-t", "Technical record"), el("span", "sum-d", "FactSheet, policy actions, validator, claims, approvals and audit log"));
    more.append(sm);
    const body = el("div", "more-body");

    body.append(block("FactSheet", "The only facts a reply may use.", "r-facts", kv(c.facts)));
    const side = el("div", "rec-side"); body.append(side);
    const claims = (c.intent && c.intent.claims) || {};
    side.append(block("What the user claims", "Read from the message. Checked against the FactSheet, never trusted.", "r-claims",
      Object.keys(claims).length ? kv(claims) : el("p", "empty", "No specific claims.")));

    const pa = el("ul", "pol");
    for (const a of acts) {
      const li = el("li"); const k = el("code", null, a.kind); k.translate = false; li.append(k);
      if (a.requires_approval) li.append(el("span", "needs", "needs your OK"));
      if (a.params && Object.keys(a.params).length) li.append(el("code", "params", JSON.stringify(a.params)));
      pa.append(li);
    }
    side.append(block("Actions decided by policy", "Plain code chose these from the account state. The model only wrote the words.", "r-pol",
      acts.length ? pa : el("p", "empty", "No actions.")));

    const vb = el("div", "val");
    if (v) {
      const rv = realViolations(v.violations), le = llmErrors(v.violations, v.llm_error);
      vb.append(kv({ "fallback used": v.used_fallback ? "yes" : "no", violations: String(rv.length), source: v.source || "model" }));
      if (rv.length) { const ul = el("ul", "bad-list"); rv.forEach((x) => ul.append(el("li", null, x))); vb.append(ul); }
      if (le.length) { const ul = el("ul", "mono-list"); le.forEach((x) => ul.append(el("li", null, x))); vb.append(ul); }
    } else vb.append(el("p", "empty", "Reply still being written."));
    const replies = d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending");
    if (replies.length) {
      const ul = el("ul", "mono-list");
      replies.forEach((m, i) => {
        const meta = m.meta; const bits = [meta.used_fallback ? "template fallback" : meta.source === "seed" ? "scripted demo reply passed" : "model reply passed"];
        const rv = realViolations(meta.violations), le = llmErrors(meta.violations, meta.llm_error);
        if (rv.length) bits.push(rv.length + " violation(s)"); if (le.length) bits.push("model unavailable: " + le.join(", "));
        if (meta.status === "error") bits.push("pipeline error");
        ul.append(el("li", null, `Reply ${i + 1}, ${day(m.created_at, true)}: ${bits.join(", ")}`));
      });
      vb.append(ul);
    }
    side.append(block("Validator", "Every reply is checked before the subscriber sees it.", "r-val", vb));

    if (d.approvals.length) {
      const t = el("table", "grid-t"); const hr = el("tr");
      ["Approval", "Status", "Grant", "Requested", "Result"].forEach((x) => { const th = el("th", null, x); th.scope = "col"; hr.append(th); });
      const th = el("thead"); th.append(hr); const tb = el("tbody");
      d.approvals.forEach((a) => {
        const tr = el("tr"); const id = el("td", "m", a.id); id.translate = false;
        tr.append(id, el("td", null, a.status), el("td", null, `${a.days || "?"} days of ${a.access_level_id}`), el("td", "n", day(a.created_at, true)),
          el("td", "m", a.result && Object.keys(a.result).length ? JSON.stringify(a.result) : "none"));
        tb.append(tr);
      });
      t.append(th, tb); const sx = el("div", "scroll-x"); sx.append(t);
      side.append(block("Approval records", null, "r-appr", sx));
    }

    const sc = c.sale_context || {};
    const caseKv = { case: c.id, user: c.customer_user_id, opened: day(c.created_at, true) };
    if (c.language) caseKv.language = c.language;
    if (c.intent && c.intent.type) caseKv.intent = c.intent.type;
    if (c.state) caseKv.state = c.state.code;
    if (c.state && c.state.evidence && c.state.evidence.length) caseKv.evidence = c.state.evidence.join("; ");
    caseKv.channel = (sc.acquisition_channel || "unknown").replace(/_/g, " ");
    if (sc.placement) caseKv.placement = sc.placement;
    if (sc.flow) caseKv.flow = sc.flow;
    const mods = Object.entries(S.modules).map(([k, val]) => `${k.replace("_", ".")} ${val}`);
    if (mods.length) caseKv.modules = mods.join(", ");
    side.append(block("Case", sc.placement || sc.flow ? "Placement and flow come from the seed CSV, a stand-in for Adapty paywall data." : null, "r-case", kv(caseKv)));

    const at = el("table", "grid-t audit"); const ah = el("thead"); const ahr = el("tr");
    ["Time", "Actor", "Event", "Detail"].forEach((x) => { const th = el("th", null, x); th.scope = "col"; ahr.append(th); });
    ah.append(ahr); const ab = el("tbody");
    d.audit.forEach((e) => {
      const tr = el("tr"); tr.append(el("td", "n", day(e.ts, true)), el("td", "m", e.actor), el("td", "m", e.event), el("td", "m dim", JSON.stringify(e.detail)));
      ab.append(tr);
    });
    at.append(ah, ab); const asx = el("div", "scroll-x"); asx.append(at);
    body.append(block(`Audit log, ${d.audit.length} ${d.audit.length === 1 ? "entry" : "entries"}`, null, "r-audit", asx));

    more.append(body);
    art.append(more);
    box.append(art);
  }

  // ---------------------------------------------------------------- top bar, live state, toast
  function renderMeta(meta) {
    const m = $("#topMeta"); if (!m) return;
    m.textContent = "";
    if (meta.demo) m.append(el("span", "meta-item", "Demo data"));
    const stubs = Object.values(S.modules).filter((v) => v === "stub").length;
    if (stubs) m.append(el("span", "meta-item warn", `${stubs} ${stubs === 1 ? "module runs" : "modules run"} on stubs`));
  }
  function live(t, tone) {
    const n = $("#live"); if (!n) return;
    n.dataset.tone = tone || "ok";
    n.textContent = /^updated /.test(t) ? "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : curly(cap(t));
  }
  function toast(t, ms = 3200) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const n = el("div", "toast", curly(t)); n.setAttribute("role", "status");
    document.body.append(n);
    setTimeout(() => n.remove(), Math.min(ms, 5500));
  }

  return { renderList, renderDetail, renderMeta, live, toast };
};
