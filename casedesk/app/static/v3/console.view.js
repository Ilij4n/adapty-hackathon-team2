/* Iteration 3, Correspondence: the console as a calm mail client.
   Folder rail (the four filters), an index (Needs your OK pinned on top, then the cases as roomy previews) and a
   wide reading pane where each case reads like a letter. Behaviour is console.js's; this file only draws. */
(() => {
  "use strict";
  window.CaseDeskConsoleView = (h) => {
    const { S, $, el, ago, day, fmtTime, stateLine, actionText, langName, nameOf, shortId, callName, realViolations,
      llmErrors, reasonText, FILTERS, auto, cap, select, decide } = h;
    const SVG = "http://www.w3.org/2000/svg";
    const narrow = () => matchMedia("(max-width: 979px)").matches;

    // ---------------------------------------------------------------- small pieces
    function icon(name, cls) {
      const s = document.createElementNS(SVG, "svg"); s.setAttribute("class", "ic" + (cls ? " " + cls : ""));
      s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
      const u = document.createElementNS(SVG, "use"); u.setAttribute("href", "#i-" + name); s.append(u); return s;
    }
    const mark = (tone) => el("span", "mark " + (tone || "info"));
    // name + 5-digit id, laid out (no middle dot). The full customer id stays in the tooltip.
    function who(cuid, tag = "b") {
      const w = el(tag, "who-name"); const n = nameOf(cuid);
      if (n) { w.append(el("span", "nm", n), document.createTextNode(" "), el("span", "uid", shortId(cuid))); w.title = cuid; }
      else w.append(el("span", "uid solo", cuid));
      w.translate = false;
      return w;
    }
    // mail-client dates: today shows the time, this year the day, older the year too
    function when(iso) {
      const d = new Date(iso); if (isNaN(d)) return String(iso || "");
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      if (Date.now() - d < 3600e3 * 24 && d < now) return ago(iso);
      const o = { day: "numeric", month: "short" }; if (d.getFullYear() !== now.getFullYear()) o.year = "numeric";
      return d.toLocaleDateString("en-GB", o);
    }
    function stamp(iso) { // "4 Nov, 00:10"
      const d = new Date(iso); if (isNaN(d)) return String(iso || "");
      const o = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
      if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
      return d.toLocaleString("en-GB", o);
    }
    const timeEl = (iso, cls) => { const t = el("time", cls || "c-time", when(iso)); t.dateTime = iso; t.title = stamp(iso); return t; };
    function stateEl(badge) {
      const s = el("span", "state"); s.append(mark(badge && badge.tone), el("span", "ell", (badge && badge.label) || "No status yet")); return s;
    }
    function flag(name, text, cls) { const f = el("span", "flag " + cls); f.title = text; f.append(icon(name), el("span", "sr-only", text)); return f; }
    // long links get break hints after / . ? & = so they wrap at a sensible point (text nodes only, never HTML)
    function withBreaks(node, text) {
      String(text).split(/(https?:\/\/[^\s]+)/g).forEach((p, i) => {
        if (!p) return;
        if (i % 2 === 0) { node.append(document.createTextNode(p)); return; }
        const m = p.match(/^(https?:\/\/)(.*)$/);
        node.append(document.createTextNode(m[1]));
        m[2].split(/(?<=[/.?&=_-])/).forEach((seg, j) => { if (j) node.append(el("wbr")); node.append(document.createTextNode(seg)); });
      });
      return node;
    }
    const storeName = (f) => { const n = (f.store_name || "").replace(/^the /i, ""); return !n ? "" : /^google play$/i.test(n) ? n : "the " + n; };

    // ---------------------------------------------------------------- folders + index
    const FOLDER = { all: ["Everything", "tray"], escalated: ["Escalated", "person"], privacy: ["Privacy", "lock"], waiting: ["Waiting", "clock"] };
    // the folders live in the rail on wide screens and fold into the index head below 1200px
    const wide = matchMedia("(min-width: 1200px)");
    function placeFolders() {
      const f = $("#filters"), home = wide.matches ? $("#railFolders") : $("#narrowFolders");
      if (f && home && f.parentNode !== home) home.append(f);
    }
    wide.addEventListener("change", placeFolders);

    function renderList() {
      placeFolders();
      const byCase = Object.fromEntries(S.cases.map((c) => [c.id, c]));
      const pend = S.approvals.filter((a) => a.status === "pending" || a.status === "failed");
      $("#qCount").textContent = pend.length || "";
      $("#qEmpty").hidden = pend.length > 0;
      document.querySelector(".queue").classList.toggle("has-items", pend.length > 0);
      const q = $("#queue"); q.textContent = "";
      for (const a of pend) {
        // the ONE Give / Deny for each grant lives here, in a short note
        const c = byCase[a.case_id] || {};
        const name = nameOf(a.customer_user_id) || "them";
        const what = `${a.days || 3} days of premium`;
        const li = el("li", "q-item" + (a.status === "failed" ? " failed" : ""));
        li.setAttribute("aria-current", String(a.case_id === S.selected));
        const b = el("button", "q-open"); b.type = "button"; b.title = "Open the case";
        const top = el("span", "row-top");
        top.append(icon(a.status === "failed" ? "x" : "gift", "q-ic"), who(a.customer_user_id), timeEl(a.created_at));
        b.append(top, el("span", "q-want", a.status === "failed" ? `Giving ${what} failed` : `Asks for ${what}`));
        if (c.state_badge) b.append(stateEl(c.state_badge));
        b.onclick = () => select(a.case_id);
        li.append(b);
        if (a.status === "failed") li.append(el("p", "fail", "Adapty couldn't give it: " + ((a.result && a.result.error) || "error") + "."));
        const row = el("div", "grant-row");
        const ok = el("button", "btn approve", a.status === "failed" ? `Try again: give ${name} ${what}` : `Give ${name} ${what}`);
        ok.type = "button"; ok.onclick = () => decide(a.id, "approve", ok);
        const no = el("button", "btn deny", "Deny"); no.type = "button"; no.onclick = () => decide(a.id, "deny", no);
        row.append(ok, no);
        li.append(row, el("p", "hint", "Nothing is granted until you approve."));
        q.append(li);
      }

      const fb = $("#filters"); fb.textContent = "";
      for (const [key, , pred] of FILTERS) {
        const n = S.cases.filter(pred).length;
        const [label, ic] = FOLDER[key] || [key, "tray"];
        const b = el("button", "filt" + (key !== "all" && n ? " has" : "")); b.type = "button";
        b.setAttribute("aria-pressed", String(S.filter === key));
        b.append(icon(ic), el("span", "f-name", label), el("span", "f-count", n ? String(n) : ""));
        b.setAttribute("aria-label", `${label}, ${n} ${n === 1 ? "case" : "cases"}`);
        b.onclick = () => { S.filter = key; S.sig.list = ""; renderList(); };
        fb.append(b);
      }

      const cur = FILTERS.find((f) => f[0] === S.filter) || FILTERS[0];
      const shown = S.cases.filter(cur[2]);
      $("#cH").textContent = (FOLDER[cur[0]] || [cur[1]])[0];
      $("#cCount").textContent = shown.length || "";
      $("#cEmpty").hidden = shown.length > 0;
      const list = $("#cases"); list.textContent = "";
      for (const c of shown) {
        const li = el("li"); const b = el("button", "c-item"); b.type = "button";
        b.setAttribute("aria-current", String(c.id === S.selected));
        const top = el("span", "row-top"); top.append(who(c.customer_user_id), timeEl(c.updated_at));
        const st = el("span", "line"); st.append(stateEl(c.state_badge));
        const flags = el("span", "flags");
        if (c.pending_approval) flags.append(flag("clock", "Waiting for your OK", "needs"));
        if (c.escalated && !c.privacy) flags.append(flag("person", "Needs a person", "needs"));
        if (c.privacy) flags.append(flag("lock", "Privacy request", "needs"));
        if (flags.children.length) st.append(flags);
        b.append(top, auto(el("span", "c-msg", c.first_message || "No message yet")), st);
        b.onclick = () => select(c.id);
        li.append(b); list.append(li);
      }
    }

    // ---------------------------------------------------------------- the letter
    let shownId = null; const seenMsgs = new Set(); const grantSeen = {};
    const KIND_ICON = { EXPLAIN_STATUS: "speech", MANAGE_SUBSCRIPTION_LINK: "link", UPDATE_PAYMENT_METHOD: "link",
      REFUND_PATH_APPLE: "link", REFUND_PATH_GOOGLE: "link", CANCEL_STEPS: "steps", RESTORE_PURCHASES_STEPS: "steps",
      PROPOSE_GRANT: "gift", ESCALATE_TO_HUMAN: "person" };

    function about(c, f) {
      const bits = [];
      bits.push(c.language ? `Writes in ${langName(c.language)}.` : "Language not known yet.");
      if (f.product_name && f.state !== "NO_PURCHASE") {
        // prices stay the raw strings the FactSheet carries
        const price = f.price ? `, priced ${f.price}` : f.price_after_trial ? `, priced ${f.price_after_trial} after the trial` : "";
        const where = storeName(f) ? ` on ${storeName(f)}` : "";
        const whenBought = f.purchased_on ? ` on ${day(f.purchased_on)}` : "";
        bits.push(`Bought ${f.product_name}${where}${whenBought}${price}.`);
      } else if (f.state === "NO_PURCHASE") bits.push("Nothing bought on this account.");
      return bits.join(" ");
    }

    function replyCheck(meta) {
      // what the checker said about one reply, in words
      const rv = realViolations(meta.violations), le = llmErrors(meta.violations, meta.llm_error);
      if (meta.status === "error") return ["bad", "x", "Something went wrong writing this reply."];
      if (rv.length && !meta.used_fallback) return ["bad", "x", `Broke ${rv.length} ${rv.length === 1 ? "rule" : "rules"}. See the technical record.`];
      if (rv.length) return ["ok", "check", "The draft broke a rule, so the checked template was sent."];
      if (meta.used_fallback || le.length) return ["ok", "check", "The model was unavailable, so the checked template answered."];
      return ["ok", "check", "Checked against the account."];
    }

    function grantBox(a, c) {
      const f = c.facts || {};
      const name = nameOf(a.customer_user_id) || "them";
      const what = `${a.days || f.grant_days || 3} days of premium`;
      const w = el("div", "grant " + a.status);
      const prev = grantSeen[a.id]; grantSeen[a.id] = a.status;
      if (prev && prev !== a.status) w.classList.add("changed");
      if (a.status === "pending" || a.status === "failed") {
        const t = el("p", "waiting");
        t.append(icon("left", "to-list wide-only"), icon("up", "to-list narrow-only"), el("span", null, a.status === "failed"
          ? `Giving ${name} ${what} failed. Try again under Needs your OK.`
          : `Waiting for your OK on ${what} for ${name}. Give it or deny it under Needs your OK.`));
        w.append(t);
      } else if (a.status === "approved") {
        const t = el("p", "done");
        const exp = a.result && a.result.expires_at;
        t.append(icon("check"), el("span", null, "Premium given" + (exp ? `, until ${stamp(exp)}.` : ".")));
        w.append(t, el("p", "grant-sub", `${cap(callName(a.customer_user_id))} sees it in Lumen Help.`));
      } else if (a.status === "denied") {
        const t = el("p", "done no"); t.append(icon("x"), el("span", null, `You said no to ${what}. ${cap(nameOf(a.customer_user_id) || "the user")} will see that.`));
        w.append(t);
      } else w.append(el("p", "done no", `${cap(what)}: ${a.status}.`));
      return w;
    }

    function section(title, ...kids) { const s = el("section", "sub"); s.append(el("h3", null, title), ...kids); return s; }
    function kv(obj, cls) {
      const t = el("table", "kv" + (cls ? " " + cls : "")); const tb = el("tbody");
      Object.entries(obj || {}).forEach(([k, v]) => {
        const tr = el("tr"); const th = el("th", null, k); th.translate = false; th.scope = "row";
        tr.append(th, withBreaks(auto(el("td")), typeof v === "string" ? v : JSON.stringify(v))); tb.append(tr);
      });
      t.append(tb); const w = el("div", "scroll-x"); w.append(t); return w;
    }
    function pairs(obj) { // an audit detail as "key value" pairs, not raw JSON
      const p = el("span", "pairs");
      Object.entries(obj || {}).forEach(([k, v]) => {
        const s = el("span", "pair"); const kk = el("span", "k", k); kk.translate = false;
        const val = v == null ? "none" : Array.isArray(v) ? (v.length ? v.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(", ") : "none") : typeof v === "object" ? JSON.stringify(v) : String(v);
        s.append(kk, document.createTextNode(" "), el("span", "v", val)); p.append(s);
      });
      return p;
    }

    function record(d, c, v) {
      const f = c.facts || {}; const acts = c.actions || [];
      const body = el("div", "more-body");
      // headers, like "show original" in a mail client
      const hd = el("dl", "headers");
      const row = (k, ...vals) => { const dt = el("dt", null, k); const dd = el("dd"); vals.forEach((x) => dd.append(x)); hd.append(dt, dd); };
      const lit = (t) => { const s = el("span", "lit", t); s.translate = false; return s; };
      row("Case", lit(c.id), el("span", "soft", ` opened ${stamp(c.created_at)}`));
      row("User", lit(c.customer_user_id));
      if (c.state) {
        const ev = el("span", "block soft"); (c.state.evidence || []).forEach((e, i) => { if (i) ev.append(el("br")); ev.append(document.createTextNode(e)); });
        row("State", lit(c.state.code), ev);
      }
      if (c.intent && c.intent.type) row("Intent", lit(c.intent.type), c.language ? el("span", "soft", ` in ${c.language}`) : "");
      const sc = c.sale_context || {};
      if (sc.acquisition_channel || sc.placement || sc.flow) {
        const src = el("span", null, (sc.acquisition_channel || "unknown channel").replace(/_/g, " "));
        const pl = [sc.placement, sc.flow].filter(Boolean).join(" / ");
        const extra = pl ? el("span", "soft", `, ${pl} `) : "";
        const si = el("span", "standin", "stand-in"); si.title = "Placement and flow come from the seed CSV, a stand-in for Adapty paywall data.";
        row("Came from", src, extra, pl ? si : "");
      }
      body.append(section("Case", hd));

      const pa = el("ul", "policy");
      for (const a of acts) {
        const li = el("li", a.requires_approval ? "needs" : null);
        const k = lit(a.kind); li.append(k);
        if (a.requires_approval) li.append(el("span", "needs-note", "needs your approval"));
        if (a.params && Object.keys(a.params).length) li.append(pairs(a.params));
        pa.append(li);
      }
      if (!acts.length) pa.append(el("li", "soft", "No actions."));
      body.append(section("Actions decided by policy", pa));

      const ver = el("div", "verdict");
      if (v) {
        const rv = realViolations(v.violations), le = llmErrors(v.violations, v.llm_error);
        const line = el("p", "v-line " + (rv.length && !v.used_fallback ? "bad" : "ok"));
        line.append(icon(rv.length && !v.used_fallback ? "x" : "check"), el("span", null,
          `${rv.length ? rv.length + (rv.length === 1 ? " violation" : " violations") : "No violations"}. ${v.used_fallback ? "The checked template was used." : "The written reply was used."}${le.length ? " The model was unavailable." : ""}`));
        ver.append(line);
        if (rv.length) { const ul = el("ul", "viol"); rv.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
        if (le.length) { const ul = el("ul", "plain"); le.forEach((x) => ul.append(el("li", null, x))); ver.append(ul); }
      } else ver.append(el("p", "soft", "The reply is still being written."));
      const per = el("ol", "per-reply");
      d.messages.filter((m) => m.role === "assistant" && m.meta && m.meta.status !== "pending").forEach((m, i) => {
        const meta = m.meta; const bits = [meta.used_fallback ? "template fallback" : meta.source === "seed" ? "scripted demo reply passed" : "model reply passed"];
        const rv = realViolations(meta.violations), le = llmErrors(meta.violations, meta.llm_error);
        if (rv.length) bits.push(rv.length + (rv.length === 1 ? " violation" : " violations"));
        if (le.length) bits.push("model unavailable: " + le.join(", "));
        if (meta.status === "error") bits.push("pipeline error");
        const li = el("li"); li.append(el("span", "n", `Reply ${i + 1}`), el("span", "t", stamp(m.created_at)), el("span", null, cap(bits.join(", "))));
        per.append(li);
      });
      if (per.children.length) ver.append(per);
      body.append(section("Validator", ver));

      // claims beside the facts, so a contradiction lines up
      const claims = (c.intent && c.intent.claims) || {};
      const two = el("div", "two");
      two.append(section("What the user claims", Object.keys(claims).length ? kv(claims) : el("p", "soft", "No specific claims.")),
        section("FactSheet: the only facts the reply may use", kv(c.facts, "facts")));
      body.append(two);

      if (d.approvals.length) {
        const ap = el("ul", "approvals");
        d.approvals.forEach((a) => {
          const li = el("li"); li.append(lit(a.id), el("span", null, ` ${a.status}, ${a.days || "?"} days of ${a.access_level_id}, requested ${stamp(a.created_at)}`));
          if (a.result) li.append(pairs(a.result));
          ap.append(li);
        });
        body.append(section("Approval records", ap));
      }

      const ol = el("ol", "audit");
      d.audit.forEach((e) => {
        const li = el("li"); const ev = el("span", "ev"); ev.append(el("b", null, e.actor), document.createTextNode(" "), lit(e.event));
        li.append(el("time", "t", stamp(e.ts)), ev, pairs(e.detail)); ol.append(li);
      });
      body.append(section(`Audit log (${d.audit.length})`, ol));

      const mods = Object.entries(S.modules);
      if (mods.length) {
        const ml = el("dl", "modules");
        mods.forEach(([k, val]) => { const dt = el("dt", null, k.replace("_", ".")); dt.translate = false; ml.append(dt, el("dd", val === "stub" ? "stub" : null, val)); });
        body.append(section("System modules", ml));
      }
      return body;
    }

    function renderDetail(d) {
      const box = $("#detail");
      const c = d.case; const f = c.facts || {}; const fl = d.flags || {};
      const fresh = shownId !== c.id;
      if (fresh) { seenMsgs.clear(); d.messages.forEach((m) => seenMsgs.add(m.id)); }
      shownId = c.id;
      box.textContent = "";
      const card = el("article", "case" + (fresh ? " enter" : ""));

      // the letter head
      const head = el("header", "d-head");
      const h2 = el("h2"); h2.append(who(c.customer_user_id, "span"));
      const opened = el("p", "opened"); opened.append(document.createTextNode("Opened "), timeEl(c.created_at, "o-time"));
      head.append(h2, opened, el("p", "about", about(c, f)));
      card.append(head);

      const tone = (c.state && c.state.tone) || "info";
      const status = el("p", "status " + tone);
      status.append(mark(tone), el("span", null, stateLine(c.state, f) + "."));
      card.append(status);

      const v = c.validator || null;
      if (v) {
        const rv = realViolations(v.violations);
        const ok = v.used_fallback || !rv.length;
        const t = el("p", "trust " + (ok ? "ok" : "bad"));
        t.append(icon(ok ? "check" : "x"), el("span", null, ok ? "Checked: every fact in the replies matches the account." : "A reply broke a rule. See the technical record."));
        card.append(t);
      }

      // what needs a person, in plain view
      const alerts = [];
      if (fl.privacy) alerts.push(["lock", "Privacy or data request. Handle it through your data-protection process."]);
      (fl.escalation_reasons || []).filter((r) => r !== "privacy_request" || !fl.privacy).forEach((r) => alerts.push(["person", "Needs a person: " + reasonText(r) + "."]));
      if (c.intent && c.intent.injection_suspected) alerts.push(["shield", "The message tried to give Case Desk orders. It was ignored."]);
      if (alerts.length) {
        const al = el("ul", "alerts");
        alerts.forEach(([ic, t]) => { const li = el("li"); li.append(icon(ic), el("span", null, t)); al.append(li); });
        card.append(al);
      }

      // the correspondence
      const convo = el("div", "convo");
      for (const m of d.messages) {
        const meta = m.meta || {};
        const pending = meta.status === "pending";
        const isNew = !fresh && !seenMsgs.has(m.id); seenMsgs.add(m.id);
        const t = el("div", `turn ${m.role}${pending ? " pending" : ""}${isNew ? " new" : ""}${meta.status === "error" ? " error" : ""}`);
        const whoRow = el("p", "who");
        whoRow.append(el("b", null, m.role === "user" ? (nameOf(c.customer_user_id) || "User") : m.role === "system" ? "Lumen Help" : "Case Desk"));
        const tm = el("time", null, stamp(m.created_at)); tm.dateTime = m.created_at; whoRow.append(tm);
        if (meta.abandoned) whoRow.append(el("span", "never", "never seen by the user"));
        const txt = auto(el("div", "txt"));
        if (m.role === "system") txt.append(icon(meta.event === "grant_denied" ? "x" : "check"));
        withBreaks(txt, pending ? "Writing the reply…" : m.text);
        t.append(whoRow, txt);
        if (m.role === "assistant" && !pending && m.meta) {
          const [ctone, cic, ctext] = replyCheck(meta);
          const ck = el("p", "checked " + ctone); ck.append(icon(cic), el("span", null, ctext)); t.append(ck);
        }
        convo.append(t);
      }
      if (!d.messages.length) convo.append(el("p", "soft", "No messages yet."));
      card.append(convo);

      // what Case Desk did, in short sentences
      const did = el("section", "did");
      did.append(el("h3", null, "What Case Desk did"));
      const acts = c.actions || [];
      if (acts.length) {
        const ul = el("ul");
        acts.forEach((a) => { const li = el("li", a.requires_approval ? "needs" : null); li.append(icon(KIND_ICON[a.kind] || "check"), el("span", null, actionText(a) + ".")); ul.append(li); });
        did.append(ul);
      } else did.append(el("p", "soft", c.validator ? "Answered the message. Nothing else was needed." : "Still working on it…"));
      card.append(did);

      for (const a of d.approvals) card.append(grantBox(a, c));

      // the technical record, folded; it unfolds in place
      const more = el("details", "more");
      const sum = el("summary");
      sum.append(icon("chev", "chev"), el("span", "when-closed", "Show the technical record"), el("span", "when-open", "Hide the technical record"),
        el("span", "sum-note", "facts, policy, checks, audit log"));
      // only a reader's click animates; console.js restoring an open record after a refresh stays instant
      sum.addEventListener("click", () => { more.classList.add("animate"); });
      more.append(sum, record(d, c, v));
      card.append(more);

      box.append(card);
      if (fresh && !narrow() && box.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
    }

    // ---------------------------------------------------------------- chrome
    function renderMeta(meta) {
      const m = $("#topMeta"); if (!m) return;
      m.textContent = "";
      if (meta.demo) m.append(el("p", "meta-line", "Demo mode"));
      const stubs = Object.values(S.modules).filter((x) => x === "stub").length;
      if (stubs) m.append(el("p", "meta-line warn", `${stubs} ${stubs === 1 ? "module runs" : "modules run"} on stubs`));
    }
    let lastLive = "";
    function live(text, tone) {
      const n = $("#live"); if (!n) return;
      const t = tone === "bad" ? cap(text) + "." : "Up to date, " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      if (t === lastLive) return; lastLive = t;
      n.textContent = ""; n.className = "live " + (tone || "ok");
      n.append(mark(tone === "bad" ? "bad" : "ok"), el("span", null, t));
    }
    function toast(text, ms = 3200) {
      document.querySelectorAll(".toast").forEach((x) => x.remove());
      const t = el("div", "toast"); t.setAttribute("role", "status");
      t.append(icon(/^(Gave|Denied)/.test(text) ? "check" : "x"), el("span", null, text));
      document.body.append(t);
      const life = Math.min(ms, 5600);
      setTimeout(() => t.classList.add("leaving"), life - 180);
      setTimeout(() => t.remove(), life);
    }

    // j / k move through the cases in the open folder, like a mail client
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "j" && e.key !== "k")) return;
      if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if ($("#app").hidden) return;
      const cur = FILTERS.find((x) => x[0] === S.filter) || FILTERS[0];
      const shown = S.cases.filter(cur[2]); if (!shown.length) return;
      e.preventDefault();
      const i = shown.findIndex((c) => c.id === S.selected);
      const j = i < 0 ? 0 : Math.max(0, Math.min(shown.length - 1, i + (e.key === "j" ? 1 : -1)));
      if (shown[j].id === S.selected) return;
      select(shown[j].id).then(() => {
        const cur2 = document.querySelector('#cases .c-item[aria-current="true"]');
        if (cur2) cur2.scrollIntoView({ block: "nearest" });
      });
    });

    return { renderList, renderDetail, renderMeta, live, toast, narrowQuery: "(max-width: 979px)" };
  };
})();
