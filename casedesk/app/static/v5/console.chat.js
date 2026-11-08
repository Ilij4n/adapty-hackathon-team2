/* Case Desk console, v5 "Night Shift, bubbles": a thin layer over v2's console view (static/v2/console.view.js,
   loaded first). The bubbles themselves are CSS (static/v5/chat.css); this only does what CSS cannot:
   - a reply still being written gets help's typing row (three amber squares before "Writing the reply…");
   - links that v2's view writes to /help?v=2 point to /help?v=5. */
(() => {
  "use strict";
  const base = window.CaseDeskConsoleView;
  window.CaseDeskConsoleView = (h) => {
    const v = typeof base === "function" ? base(h) || {} : {};
    const fixLinks = (root) => root && root.querySelectorAll('a[href="/help?v=2"]').forEach((a) => { a.href = "/help?v=5"; });
    const empty = document.getElementById("cEmpty");
    if (empty && "MutationObserver" in window) new MutationObserver(() => fixLinks(empty)).observe(empty, { childList: true });
    const renderDetail = v.renderDetail || h.defaults.renderDetail;
    return Object.assign({}, v, {
      renderDetail(d) {
        renderDetail(d);
        document.querySelectorAll("#detail .turn.pending > .txt").forEach((t) => {
          if (t.querySelector(".typing-dots")) return;
          const dots = h.el("span", "typing-dots"); dots.setAttribute("aria-hidden", "true");
          dots.append(h.el("i"), h.el("i"), h.el("i"));
          t.prepend(dots);
        });
      },
    });
  };
})();
