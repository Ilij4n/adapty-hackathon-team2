/* Lumen Help, v6 "Night Shift, strips": a thin layer over v2's help view (static/v2/help.view.js, loaded first).
   The conversation is drawn as the console's strips (v6/chat.css, "one chat spec"). help.js still makes
   li.msg.<kind> > .bubble; this wrapper gives each turn its head (t().you or t().helper, and the time) and the
   direction of its own text, so an Arabic turn puts its rule on the right. Everything else is v2's view unchanged. */
(() => {
  "use strict";
  const base = window.CaseDeskHelpView;
  window.CaseDeskHelpView = (h) => {
    const v = base ? base(h) : {};
    const { el } = h;
    const log = document.getElementById("log");

    // Times use Case Desk's clock when the server says it runs a demo clock (as the console does); else the browser's.
    let clockOff = 0;
    fetch("/api/meta").then((r) => r.json()).then((m) => {
      if (!m || !m.server_now || !m.clock || m.clock === "real") return;
      const off = new Date(m.server_now).getTime() - Date.now();
      if (!isNaN(off) && Math.abs(off) > 2000) clockOff = off;
    }).catch(() => { /* the browser's clock, then */ });

    const pad = (n) => String(n).padStart(2, "0");
    // the direction of a text is the direction of its first strong letter (as dir="auto" decides it)
    const RTL_CH = /[֐-ࣿיִ-﷿ﹰ-﻿]/, LETTER = /\p{L}/u;
    function rtlText(s) { for (const ch of String(s || "")) { if (RTL_CH.test(ch)) return true; if (LETTER.test(ch)) return false; } return false; }
    const kindOf = (li) => li.classList.contains("system") ? "system" : li.classList.contains("user") ? "user" : "bot";
    const whoText = (kind) => (kind === "user" ? h.t().you : h.t().helper);
    function timeEl(ms) {
      const d = new Date(ms); const t = el("time", "mono t", pad(d.getHours()) + ":" + pad(d.getMinutes()));
      t.dateTime = d.toISOString(); t.translate = false; return t;
    }

    // idempotent: the observer calls it for every new turn, renderActions again when a reply replaces the typing row
    function decorate(li, fresh) {
      if (!li || !li.classList || !li.classList.contains("msg")) return;
      const b = li.querySelector(":scope > .bubble"); if (!b) return;
      if (fresh || !li.dataset.t) li.dataset.t = String(Date.now() + clockOff);
      const dir = !b.classList.contains("typing") && rtlText(b.textContent) ? "rtl" : "";
      if ((li.getAttribute("dir") || "") !== dir) { if (dir) li.dir = dir; else li.removeAttribute("dir"); }
      const kind = kindOf(li);
      if (kind === "system") { // an event, not a speaker: the time at the end of its one line
        if (!li.querySelector(":scope > .t")) li.append(timeEl(+li.dataset.t));
        return;
      }
      let head = li.querySelector(":scope > .turn-head");
      if (head && !fresh) return;
      if (head) head.remove();
      head = el("div", "turn-head");
      head.append(el("span", "turn-who", whoText(kind)), timeEl(+li.dataset.t));
      li.prepend(head);
    }
    if (log && "MutationObserver" in window) {
      new MutationObserver((recs) => { for (const r of recs) r.addedNodes.forEach((n) => decorate(n)); }).observe(log, { childList: true });
    }

    const actions = v.renderActions || h.defaults.renderActions;
    v.renderActions = (li, acts, facts, pendingApproval) => {
      decorate(li, true); // the reply replaced the typing row: its head again, stamped when the reply arrived
      actions(li, acts, facts, pendingApproval);
    };
    const onLang = v.onLang;
    v.onLang = (lang, strings) => { // the reply may switch the widget's language: the names follow
      if (log) log.querySelectorAll(":scope > .msg").forEach((li) => { const w = li.querySelector(":scope > .turn-head > .turn-who"); if (w) w.textContent = whoText(kindOf(li)); });
      if (onLang) onLang(lang, strings);
    };
    return v;
  };
})();
