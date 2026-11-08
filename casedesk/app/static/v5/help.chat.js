/* Lumen Help, v5 "Night Shift, bubbles": a thin layer over v2's help view (static/v2/help.view.js, loaded first).
   It adds the shared chat caption (static/v5/chat.css, point 3) under every subscriber and helper turn: who said it,
   in the subscriber's language (t().you, t().helper). Help has no clock, so the caption carries no time.
   Not on the typing row (the caption arrives with the reply) and not on system lines. Text only, never innerHTML. */
(() => {
  "use strict";
  const base = window.CaseDeskHelpView;
  window.CaseDeskHelpView = (h) => {
    const v = typeof base === "function" ? base(h) || {} : {};
    const log = document.getElementById("log");
    const who = (li) => (li.classList.contains("user") ? h.t().you : h.t().helper);
    function caption(li) {
      if (!li || li.nodeType !== 1 || !li.classList.contains("msg") || li.classList.contains("system")) return;
      if (li.querySelector(":scope > .bubble.typing, :scope > .msg-cap")) return;
      const c = h.el("div", "msg-cap"); c.append(h.el("span", "who", who(li))); li.append(c);
    }
    // the subscriber's own messages and error lines are added straight to the log by help.js
    if (log && "MutationObserver" in window) {
      new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(caption))).observe(log, { childList: true });
    }
    const renderActions = v.renderActions || h.defaults.renderActions;
    return Object.assign({}, v, {
      // a reply lands in the typing row: its caption goes last, under the actions and notes
      renderActions(li, actions, facts, pendingApproval) { renderActions(li, actions, facts, pendingApproval); caption(li); },
      onLang(lang, strings) {
        if (v.onLang) v.onLang(lang, strings);
        if (log) log.querySelectorAll(".msg > .msg-cap .who").forEach((w) => { w.textContent = who(w.closest(".msg")); });
      },
    });
  };
})();
