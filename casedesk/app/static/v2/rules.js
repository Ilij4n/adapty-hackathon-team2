/* Case Desk console (Night Shift): the Rules drawer. The owner chooses what Case Desk may do on its own.
   GET/PUT /api/rules (console token from sessionStorage, or the demo console cookie). Only courtesy premium is a
   choice; escalations and normal answers are shown locked. Every value is set with textContent.
   window.CaseDeskRules is used by console.view.js to label grants a rule gave and to offer "Switch rule to Ask me". */
(() => {
  "use strict";
  const SVG = "http://www.w3.org/2000/svg";
  const R = { rules: { courtesy_grants: "ask", max_days: 3 }, limits: { min_days: 1, max_days: 7 }, locked: [], loaded: false };
  const listeners = [];

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function lockIcon() {
    const s = document.createElementNS(SVG, "svg"); s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "ic ic-lock");
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", "M4.5 7.5h7v6h-7zM6 7.5V5.5a2 2 0 0 1 4 0v2");
    p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "1.6");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.append(p); return s;
  }

  async function api(method, body) {
    const headers = { "Content-Type": "application/json" };
    const tok = sessionStorage.getItem("casedesk_console");
    if (tok) headers["X-Console-Token"] = tok;
    const r = await fetch("/api/rules", { method, headers, credentials: "same-origin", body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const e = new Error("rules " + r.status); e.status = r.status; throw e; }
    const d = await r.json();
    R.rules = d.rules; R.limits = d.limits || R.limits; R.locked = d.locked || []; R.loaded = true;
    listeners.forEach((f) => { try { f(R.rules); } catch { /* a listener never breaks saving */ } });
    return d;
  }

  const modeWords = (r) => r.courtesy_grants === "auto" ? `Automatic up to ${r.max_days} ${r.max_days === 1 ? "day" : "days"}`
    : r.courtesy_grants === "off" ? "Never" : "Ask me";

  function explain(r) {
    if (r.courtesy_grants === "auto") {
      return `Case Desk gives up to ${r.max_days} ${r.max_days === 1 ? "day" : "days"} of premium on its own and tells the user it is active. ` +
        "The code only allows it for someone who paid, was never refunded and lost premium to a failed payment in the last 14 days, " +
        "at most once per person in 90 days. Anything longer or outside that still waits for your OK.";
    }
    if (r.courtesy_grants === "off") return "Case Desk never offers courtesy premium. Replies don't mention it and nothing waits for you.";
    return "Case Desk asks you first. Each courtesy extension waits here for your OK, and the user is told it is only requested.";
  }

  function toast(text, bad) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = el("div", "toast" + (bad ? " bad" : "")); t.setAttribute("role", bad ? "alert" : "status");
    t.append(el("span", "lamp " + (bad ? "bad" : "ok")), el("span", null, text));
    document.body.append(t); setTimeout(() => t.remove(), bad ? 5200 : 3200);
  }

  async function set(patch) {
    try {
      await api("PUT", patch);
      toast("Courtesy premium: " + modeWords(R.rules));
      return true;
    } catch (e) {
      toast(e.status === 401 ? "The console token was not accepted." : "Couldn't save the rule. Try again.", true);
      return false;
    }
  }

  // ------------------------------------------------------------ the drawer
  let drawer, backdrop, lastFocus;
  function build() {
    backdrop = el("div", "rules-backdrop"); backdrop.hidden = true; backdrop.onclick = close;
    drawer = el("aside", "rules-drawer"); drawer.id = "rulesDrawer"; drawer.hidden = true;
    drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-modal", "true"); drawer.setAttribute("aria-labelledby", "rulesH");
    document.body.append(backdrop, drawer);
    drawer.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } });
  }

  function render() {
    if (!drawer) return;
    const r = R.rules;
    drawer.textContent = "";
    const head = el("div", "rules-head");
    const h = el("h2", null, "Rules"); h.id = "rulesH";
    const x = el("button", "btn rules-close", "Close"); x.type = "button"; x.onclick = close;
    head.append(h, x);
    drawer.append(head, el("p", "rules-lead", "You choose what Case Desk does on its own. Everything it does is in the audit log."));

    const list = el("ol", "rules-list");
    // 1. courtesy premium: the one real choice
    const g = el("li", "rule rule-grants"); g.dataset.mode = r.courtesy_grants;
    const gh = el("div", "rule-head"); gh.append(el("h3", null, "Courtesy premium"));
    const seg = el("div", "seg"); seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", "Courtesy premium");
    const sel = el("select", "seg-days"); sel.setAttribute("aria-label", "Most days Case Desk may give on its own");
    for (let d = R.limits.min_days || 1; d <= (R.limits.max_days || 7); d++) {
      const o = el("option", null, String(d)); o.value = String(d); if (d === r.max_days) o.selected = true; sel.append(o);
    }
    const opt = (mode, text, tag = "button") => { // "auto" is a span: it holds the days <select>, which a <button> may not
      const b = el(tag, "seg-b", text); b.dataset.mode = mode;
      if (tag === "button") b.type = "button"; else b.tabIndex = 0;
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(r.courtesy_grants === mode));
      const pick = () => { if (r.courtesy_grants !== mode) set({ courtesy_grants: mode, ...(mode === "auto" ? { max_days: Number(sel.value) } : {}) }); };
      b.onclick = (e) => { if (e.target.tagName !== "SELECT" && e.target.tagName !== "OPTION") pick(); };
      if (tag !== "button") b.onkeydown = (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === b) { e.preventDefault(); pick(); } };
      return b;
    };
    const auto = opt("auto", "Automatic up to ", "span");
    sel.onchange = () => set({ courtesy_grants: "auto", max_days: Number(sel.value) });
    auto.append(sel, document.createTextNode(" days"));
    seg.append(opt("ask", "Ask me"), auto, opt("off", "Never"));
    const p = el("p", "rule-say", explain(r)); p.id = "rulesSay"; p.setAttribute("aria-live", "polite");
    g.append(gh, seg, p);
    list.append(g);

    // 2 + 3: shown, not configurable
    const locked = R.locked.length ? R.locked : [
      { key: "escalations", label: "Privacy, attacks and 'I want a person'", value: "Always a person", why: "always a person, by design" },
      { key: "answers", label: "Answers about status, charges, cancelling, restore", value: "Automatic, every reply checked", why: "" }];
    for (const l of locked) {
      const li = el("li", "rule locked rule-" + l.key);
      const hh = el("div", "rule-head"); hh.append(el("h3", null, l.label));
      const v = el("p", "rule-fixed"); v.append(lockIcon(), el("span", "rf-v", l.value));
      li.append(hh, v, el("p", "rule-say", l.key === "escalations" ? "Always a person, by design. Case Desk hands these over and never decides them."
        : "Answered straight away. A validator checks every reply against the account's facts before the user sees it."));
      list.append(li);
    }
    drawer.append(list);
    const btn = document.getElementById("rulesBtn");
    if (btn) btn.querySelector(".rb-mode").textContent = modeWords(r);
  }

  async function open() {
    if (!drawer) build();
    lastFocus = document.activeElement;
    try { await api("GET"); } catch (e) { if (e.status === 401) { toast("Open the console with its token first.", true); return; } }
    render();
    drawer.hidden = false; backdrop.hidden = false;
    document.getElementById("rulesBtn").setAttribute("aria-expanded", "true");
    const cur = drawer.querySelector('.seg-b[aria-checked="true"]') || drawer.querySelector(".seg-b");
    if (cur) cur.focus();
  }
  function close() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true; backdrop.hidden = true;
    const b = document.getElementById("rulesBtn"); if (b) b.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ------------------------------------------------------------ header button
  function mount() {
    const top = document.querySelector(".top"); if (!top || document.getElementById("rulesBtn")) return;
    const b = el("button", "btn rules-btn"); b.type = "button"; b.id = "rulesBtn";
    b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "rulesDrawer");
    b.title = "Rules: what Case Desk may do on its own";
    b.append(el("span", "rb-l", "Rules"), el("span", "rb-mode", "Ask me"));
    b.onclick = () => (drawer && !drawer.hidden ? close() : open());
    const live = document.getElementById("live");
    top.insertBefore(b, live || null);
    api("GET").then(render).catch(() => { /* gate still closed: the console shows its token form */ });
  }
  listeners.push(() => { if (drawer && !drawer.hidden) {
    const had = drawer.contains(document.activeElement) && document.activeElement.classList.contains("seg-days") ? "days" : drawer.contains(document.activeElement);
    render();
    const f = had === "days" ? drawer.querySelector(".seg-days") : had ? drawer.querySelector('.seg-b[aria-checked="true"]') : null;
    if (f) f.focus();
  } else { const m = document.querySelector("#rulesBtn .rb-mode"); if (m) m.textContent = modeWords(R.rules); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  // ------------------------------------------------------------ for console.view.js
  const byRule = (a) => !!(a && a.status === "approved" && a.result && String(a.result.approved_by || "").startsWith("rule:"));
  const ruleDays = (a) => { const m = /up to (\d+)/.exec(String((a && a.result && a.result.approved_by) || "")); return m ? Number(m[1]) : null; };
  function switchLink(after) {
    const b = el("button", "linkish rule-switch", "Switch rule to Ask me"); b.type = "button";
    b.onclick = async (e) => { e.stopPropagation(); if (await set({ courtesy_grants: "ask" })) { b.disabled = true; b.textContent = "Rule is now Ask me"; if (after) after(); } };
    return b;
  }
  window.CaseDeskRules = { get rules() { return R.rules; }, open, close, set, byRule, ruleDays, switchLink, modeWords, onChange: (f) => listeners.push(f) };
})();
