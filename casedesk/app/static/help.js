/* Lumen Help widget. Identity: ?uid=&sig= from the host app (signed by its backend); demo mode: profile picker.
   Design variants (/help?v=N) load static/vN/help.view.js first; it may set window.CaseDeskHelpView = (h) => ({...})
   to replace how the status card, typing row, reply actions and demo profiles are drawn (see V below). */
(() => {
  "use strict";
  const I = window.CD_I18N, SL = window.CD_STATE_LABELS;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const qs = new URLSearchParams(location.search);

  const S = {
    lang: "en", user: null, sig: null, locale: null, caseId: null, busy: false, gen: 0, inflight: null,
    approvals: {}, approvalTimer: null, demoUsers: [], lastStatus: null,
  };
  const t = () => I[S.lang] || I.en;
  const pickLang = (loc) => {
    const raw = String(loc || "en").toLowerCase().replace(/_/g, "-"), l = raw.split("-")[0];
    if (l === "sr" && /(^|-)cyrl(-|$)/.test(raw) && I["sr-Cyrl"]) return "sr-Cyrl";
    return I[l] ? l : "en";
  };
  const intlLocale = () => (S.lang === "sr" ? "sr-Latn" : S.lang);

  // ------------------------------------------------------------ chrome / language
  function applyLang(lang) {
    S.lang = pickLang(lang);
    document.documentElement.lang = S.lang === "sr" ? "sr-Latn" : S.lang;
    const tr = t();
    document.querySelectorAll("[data-i18n]").forEach((n) => { const k = n.dataset.i18n; if (typeof tr[k] === "string") n.textContent = tr[k]; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((n) => { n.placeholder = tr[n.dataset.i18nPlaceholder]; });
    $("#send").setAttribute("aria-label", tr.send);
    const chips = $("#chips"); chips.textContent = ""; chips.setAttribute("aria-label", tr.suggestions || "Suggestions");
    tr.chips.forEach((c) => { const b = el("button", "chip", c); b.type = "button"; b.onclick = () => send(c); chips.append(b); });
    if (S.lastStatus) renderStatus(S.lastStatus);
    if (V.onLang) V.onLang(S.lang, tr);
  }

  // ------------------------------------------------------------ status card
  const DATE_KEYS = new Set(["renews_on", "expires_on", "cancelled_on", "billing_issue_on", "refunded_on", "trial_ends_on", "granted_until", "grace_ends_on"]);
  function fmtDate(v) {
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T00:00:00Z" : v);
    if (isNaN(d)) return v;
    try { return new Intl.DateTimeFormat(intlLocale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d); }
    catch { return v; }
  }
  function cardRows(f) {
    const L = t().facts, rows = [];
    const add = (label, key, val) => { if (f[key]) rows.push([label, val ?? f[key]]); };
    add(L.product_name, "product_name");
    if (f.product_name && !f.granted_until && f.state !== "NO_PURCHASE") add(L.store_name, "store_name");
    add(L.price, "price");
    if (f.granted_until) add(L.granted_until, "granted_until", fmtDate(f.granted_until));
    else if (f.trial_ends_on) add(L.trial_ends_on, "trial_ends_on", fmtDate(f.trial_ends_on));
    else if (f.renews_on) add(L.renews_on, "renews_on", fmtDate(f.renews_on));
    else if (f.grace_ends_on) add(L.grace_until, "grace_ends_on", fmtDate(f.grace_ends_on));
    else if (f.expires_on) add(f.days_since_expired != null ? L.expired_on : L.expires_on, "expires_on", fmtDate(f.expires_on));
    if (f.days_left && (!f.renews_on || f.trial_ends_on)) add(L.days_left, "days_left", t().days(f.days_left));
    add(L.cancelled_on, "cancelled_on", f.cancelled_on && fmtDate(f.cancelled_on));
    add(L.billing_issue_on, "billing_issue_on", f.billing_issue_on && fmtDate(f.billing_issue_on));
    add(L.refunded_on, "refunded_on", f.refunded_on && fmtDate(f.refunded_on));
    return rows;
  }
  function renderStatus(st) {
    S.lastStatus = st;
    const card = $("#statusCard"); card.classList.remove("loading");
    const key = JSON.stringify([S.lang, st.state_badge, st.facts]);
    if (!card.hidden && card.dataset.key === key) return;
    card.dataset.key = key; card.hidden = false;
    V.paintStatus(st, card);
  }
  function paintStatus(st) {
    const b = $("#stateBadge"); const code = st.state_badge.code;
    b.className = "badge " + (st.state_badge.tone || "info");
    b.textContent = (SL[S.lang] && SL[S.lang][code]) || st.state_badge.label;
    const dl = $("#facts"); dl.textContent = "";
    cardRows(st.facts || {}).forEach(([k, v]) => { const d = el("div"); d.append(el("dt", null, k), el("dd", null, v)); dl.append(d); });
  }
  function statusLoading() { const c = $("#statusCard"); if (!c.hidden) c.classList.add("loading"); }

  // ------------------------------------------------------------ messages
  const log = $("#log"), scroller = $("#scroller");
  const scrollDown = () => requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
  function addMsg(kind, text) {
    const li = el("li", "msg " + kind); const b = el("div", "bubble", text); b.dir = "auto"; li.append(b); log.append(li); scrollDown(); return li;
  }
  function addTyping() {
    const li = el("li", "msg bot"); const b = el("div", "bubble typing");
    const dots = el("span", "dots"); dots.setAttribute("aria-hidden", "true"); dots.append(el("i"), el("i"), el("i"));
    const txt = el("span", "stage-text", t().progress[0]); b.append(dots, txt); li.append(b); log.append(li); scrollDown();
    let i = 0; const started = Date.now();
    const timer = setInterval(() => {
      const steps = t().progress; i = Math.min(i + 1, steps.length - 1);
      txt.textContent = Date.now() - started > 25000 ? t().slow : steps[i];
    }, 2600);
    return { li, stop() { clearInterval(timer); } };
  }
  const safeUrl = (u) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : null);
  const ICON_OUT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function linkBtn(label, url) {
    const a = el("a", "act"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label; a.insertAdjacentHTML("beforeend", ICON_OUT); return a;
  }
  function stepsBtn(label, steps, wrap) {
    const b = el("button", "act", label); b.type = "button";
    const ol = el("ol", "steps"); ol.hidden = true; steps.forEach((s) => ol.append(el("li", null, s)));
    const id = "s" + Math.random().toString(36).slice(2, 8); ol.id = id; b.setAttribute("aria-controls", id); b.setAttribute("aria-expanded", "false");
    b.onclick = () => { ol.hidden = !ol.hidden; b.setAttribute("aria-expanded", String(!ol.hidden)); if (!ol.hidden) scrollDown(); };
    wrap.after(ol); return b;
  }
  function renderActions(li, actions, facts, pendingApproval) {
    const tr = t(), A = tr.act; const store = (facts && facts.store) || "";
    const row = el("div", "actions"); li.append(row);
    const notes = [];
    for (const a of actions || []) {
      const p = a.params || {};
      switch (a.kind) {
        case "MANAGE_SUBSCRIPTION_LINK": { const u = safeUrl(p.url) || safeUrl(facts.manage_url); if (u) row.append(linkBtn(A.MANAGE_SUBSCRIPTION_LINK, u)); break; }
        case "UPDATE_PAYMENT_METHOD": { const u = safeUrl(p.url) || safeUrl(facts.payment_url) || safeUrl(facts.manage_url); if (u) row.append(linkBtn(A.UPDATE_PAYMENT_METHOD, u)); break; }
        case "REFUND_PATH_APPLE": { const u = safeUrl(p.url) || safeUrl(facts.refund_url) || "https://reportaproblem.apple.com"; row.append(linkBtn(A.REFUND_PATH_APPLE, u)); notes.push(["note", tr.refundAppleNote]); break; }
        case "REFUND_PATH_GOOGLE": { const u = safeUrl(p.url) || safeUrl(facts.refund_url); if (u) row.append(linkBtn(A.REFUND_PATH_GOOGLE, u)); notes.push(["note", tr.refundGoogleNote]); break; }
        case "CANCEL_STEPS": row.append(stepsBtn(A.CANCEL_STEPS, (p.store || store) === "play_store" ? tr.cancelAndroid : tr.cancelIos, row)); break;
        case "RESTORE_PURCHASES_STEPS": row.append(stepsBtn(A.RESTORE_PURCHASES_STEPS, (p.store || store) === "play_store" ? tr.restoreAndroid : tr.restoreIos, row)); break;
        case "PROPOSE_GRANT": notes.push(["note grant", tr.grantNote]); break;
        case "ESCALATE_TO_HUMAN": notes.push(["note", tr.escalate]); break;
        default: break;
      }
    }
    // Asked again while an earlier request is still under review: no new PROPOSE_GRANT, but say it's pending.
    if (pendingApproval && !(actions || []).some((a) => a.kind === "PROPOSE_GRANT")) notes.push(["note grant", tr.grantNote]);
    if (!row.children.length) row.remove();
    for (const [cls, text] of notes) li.append(el("div", cls, text));
  }
  function renderReply(li, r, facts) {
    li.textContent = "";
    if (r.reply_status === "error") li.classList.add("error");
    const b = el("div", "bubble", r.reply || t().errGeneric); b.dir = "auto"; li.append(b);
    V.renderActions(li, r.actions, facts || {}, r.pending_approval);
    scrollDown();
  }

  // ------------------------------------------------------------ API
  async function api(path, opts) {
    const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
    let body = null; try { body = await r.json(); } catch { /* empty */ }
    if (!r.ok) { const e = new Error((body && body.detail) || r.statusText); e.status = r.status; throw e; }
    return body;
  }
  const authQ = () => `customer_user_id=${encodeURIComponent(S.user)}&signature=${encodeURIComponent(S.sig || "")}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function send(text) {
    text = String(text || "").trim();
    if (!text || S.busy || !S.user) return;
    // Everything below belongs to this user's conversation; if the user is switched mid-request, drop the result.
    const gen = S.gen, user = S.user, sig = S.sig, q = authQ();
    const stale = () => S.gen !== gen;
    S.busy = true; $("#send").disabled = true; $("#msg").value = ""; autosize();
    $("#intro").hidden = true;
    addMsg("user", text);
    const typing = V.addTyping(); statusLoading();
    try {
      const d = await api("/api/chat", { method: "POST", body: JSON.stringify({ customer_user_id: user, signature: sig, message: text, locale: S.locale || navigator.language, case_id: S.caseId }) });
      if (stale()) { // switched users while this POST was in flight
        if (d.reply_status === "pending") fetch(`/api/chat/${d.message_id}/abandon?${q}`, { method: "POST" }).catch(() => {});
        return typing.stop();
      }
      S.caseId = d.case_id;
      renderStatus(d);
      noteApprovals(d.approvals, true);
      let r = d, misses = 0;
      if (d.reply_status === "pending") S.inflight = { id: d.message_id, q };
      const deadline = Date.now() + 120000;
      while (r.reply_status === "pending" && Date.now() < deadline) {
        await sleep(1000);
        if (stale()) return typing.stop();
        try { r = await api(`/api/chat/${d.message_id}?${q}`); misses = 0; }
        catch (e) { if (e.status || ++misses > 5) throw e; } // a network blip mid-poll: keep waiting for the reply
      }
      if (stale()) return typing.stop();
      S.inflight = null;
      typing.stop();
      if (r.language) applyLang(r.language);
      if (r.reply_status === "pending") { typing.li.remove(); addMsg("bot error", t().errGeneric); }
      else renderReply(typing.li, r, d.facts);
      if (r.pending_approval) {
        if (r.approval_id && !S.approvals[r.approval_id]) S.approvals[r.approval_id] = "pending";
        watchApprovals();
      }
    } catch (e) {
      typing.stop();
      if (stale()) return;
      typing.li.remove();
      const c = $("#statusCard"); c.classList.remove("loading");
      addMsg("bot error", e.status === 429 ? t().errRate : e.status === 401 ? t().errAuth : t().errGeneric);
      if (!e.status && !$("#msg").value) { $("#msg").value = text; autosize(); } // offline: keep what they wrote
    } finally {
      if (!stale()) { S.busy = false; $("#send").disabled = false; }
    }
  }

  // ------------------------------------------------------------ approvals: the user's next status check shows the grant
  function noteApprovals(list, silent) {
    let changed = false;
    for (const a of list || []) {
      const prev = S.approvals[a.id];
      S.approvals[a.id] = a.status;
      if (silent || !prev || prev === a.status) continue;
      changed = true;
      if (a.status === "approved") {
        const f = (S.lastStatus && S.lastStatus.facts) || {};
        const until = f.granted_until || f.expires_on;
        addMsg("system", t().grantApproved(until ? fmtDate(until).replace(/\.$/, "") : ""));
      } else if (a.status === "denied") addMsg("system denied", t().grantDenied);
    }
    return changed;
  }
  function watchApprovals() {
    if (S.approvalTimer) return;
    const gen = S.gen, q = authQ();
    S.approvalTimer = setInterval(async () => {
      if (S.gen !== gen) return;
      try {
        const st = await api(`/api/status?${q}`);
        if (S.gen !== gen) return; // switched users while this was in flight
        renderStatus(st);
        noteApprovals(st.approvals, false);
        if (!Object.values(S.approvals).includes("pending")) stopWatch();
      } catch { /* keep trying quietly */ }
    }, 4000);
  }
  function stopWatch() { clearInterval(S.approvalTimer); S.approvalTimer = null; }

  // ------------------------------------------------------------ identity
  async function selectUser(u) {
    stopWatch();
    if (S.inflight) { // tell the server the old conversation was left before its reply arrived
      const { id, q } = S.inflight; S.inflight = null;
      fetch(`/api/chat/${id}/abandon?${q}`, { method: "POST" }).catch(() => {});
    }
    S.user = u.customer_user_id; S.sig = u.signature; S.locale = (u.locale || "en").replace("_", "-");
    S.caseId = null; S.approvals = {}; S.lastStatus = null; S.gen++;
    S.busy = false; $("#send").disabled = false;
    log.textContent = ""; $("#intro").hidden = false; $("#statusCard").hidden = true;
    document.querySelectorAll(".profile").forEach((p) => { const on = p.dataset.uid === S.user; p.setAttribute("aria-checked", String(on)); p.tabIndex = on ? 0 : -1; });
    $("#demoSelect").value = S.user;
    applyLang(S.locale);
    if (V.onUser) V.onUser(u);
    const gen = S.gen;
    try {
      const st = await api(`/api/status?${authQ()}`);
      if (S.gen !== gen) return;
      renderStatus(st); noteApprovals(st.approvals, true);
      if (Object.values(S.approvals).includes("pending")) watchApprovals();
    } catch (e) { if (S.gen === gen) addMsg("bot error", e.status === 401 ? t().errAuth : t().errGeneric); }
  }
  function fillProfile(b, u) {
    const av = el("span", "av", initials(u.display_name)); av.setAttribute("aria-hidden", "true");
    const shown = String(u.display_name).replace(/[-_]/g, "").toLowerCase().includes(String(u.locale).replace(/[-_]/g, "").toLowerCase());
    b.append(av, el("b", null, shown ? u.display_name : `${u.display_name} · ${u.locale}`), el("small", null, u.scenario));
  }
  function initials(name) { return (String(name).replace(/\(.*?\)/g, "").match(/\p{L}/gu) || ["?"])[0].toUpperCase(); }

  async function init() {
    applyLang(qs.get("locale") || navigator.language);
    let meta = { demo: false };
    try { meta = await api("/api/meta"); } catch { /* offline? */ }
    if (qs.get("uid")) {
      return selectUser({ customer_user_id: qs.get("uid"), signature: qs.get("sig"), locale: qs.get("locale") || navigator.language });
    }
    if (!meta.demo) { addMsg("bot error", t().errAuth); return; }
    const { users } = await api("/api/demo/users");
    S.demoUsers = users;
    $("#demoSide").hidden = false; $("#demoSelectWrap").hidden = false;
    const box = $("#profiles"), sel = $("#demoSelect");
    users.forEach((u) => {
      const b = el("button", "profile"); b.type = "button"; b.dataset.uid = u.customer_user_id; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
      V.fillProfile(b, u);
      b.tabIndex = -1; b.onclick = () => selectUser(u); box.append(b);
      // the narrow-screen select: short first name + id, so the five "Jake"s stay tell-apart-able when truncated
      const short = String(u.display_name).replace(/\s*\(.*?\)\s*/g, "") || u.customer_user_id;
      const o = el("option", null, `${short} (${String(u.customer_user_id).replace(/^.*_/, "")})`); o.value = u.customer_user_id; o.title = u.scenario; sel.append(o);
    });
    // radiogroup keyboard pattern: one tab stop, arrow keys move and select
    box.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
      const all = [...box.querySelectorAll(".profile")], i = all.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const j = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + keys[e.key] + all.length) % all.length;
      all[j].focus(); all[j].click();
    });
    sel.onchange = () => { const u = users.find((x) => x.customer_user_id === sel.value); if (u) selectUser(u); };
    const want = qs.get("demo_user");
    selectUser(users.find((u) => u.customer_user_id === want) || users[0]);
  }

  // ------------------------------------------------------------ design variants
  const H = { S, t, SL, $, el, fmtDate, cardRows, initials, linkBtn, stepsBtn, safeUrl, scrollDown, ICON_OUT,
    defaults: { paintStatus, addTyping, renderActions, fillProfile } };
  const V = Object.assign({ paintStatus, addTyping, renderActions, fillProfile },
    typeof window.CaseDeskHelpView === "function" ? window.CaseDeskHelpView(H) : {});

  // ------------------------------------------------------------ composer
  const ta = $("#msg");
  function autosize() { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  ta.addEventListener("input", autosize);
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(ta.value); } });
  $("#composer").addEventListener("submit", (e) => { e.preventDefault(); send(ta.value); });

  init();
})();
