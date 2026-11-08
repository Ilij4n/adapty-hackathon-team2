/* Case Desk console, v6 "Night Shift, strips": a thin layer over v2's console view (static/v2/console.view.js, loaded
   first). v2 draws the transcript as strips already; after each render this wrapper only brings the turns in line with
   the one chat spec the help chat follows (v6/chat.css): a turn takes the direction of its own text (an Arabic turn
   puts its rule on the right), a failed reply is marked as an error turn, and a reply still being written shows the
   same three amber squares as help's typing row. Links to help keep ?v=6. */
(() => {
  "use strict";
  const base = window.CaseDeskConsoleView;
  window.CaseDeskConsoleView = (h) => {
    const v = base ? base(h) : {};
    const RTL_CH = /[֐-ࣿיִ-﷿ﹰ-﻿]/, LETTER = /\p{L}/u;
    function rtlText(s) { for (const ch of String(s || "")) { if (RTL_CH.test(ch)) return true; if (LETTER.test(ch)) return false; } return false; }

    function strips() {
      document.querySelectorAll("#detail .turns > .turn").forEach((li) => {
        const txt = li.querySelector(":scope > .txt");
        if (!txt) return;
        if (li.classList.contains("pending")) {
          if (!txt.querySelector(".dots")) {
            const words = h.el("span", null, txt.textContent);
            const dots = h.el("span", "dots"); dots.setAttribute("aria-hidden", "true"); dots.append(h.el("i"), h.el("i"), h.el("i"));
            txt.textContent = ""; txt.classList.add("typing"); txt.append(dots, words);
          }
          return;
        }
        if (li.querySelector(":scope > .turn-head > .turn-flag.bad")) li.classList.add("error");
        if (rtlText(txt.textContent)) li.dir = "rtl";
      });
    }
    const detail = v.renderDetail || h.defaults.renderDetail;
    v.renderDetail = (d) => { detail(d); strips(); };

    const list = v.renderList || h.defaults.renderList;
    v.renderList = () => {
      list();
      document.querySelectorAll('#cEmpty a[href*="v=2"]').forEach((a) => { a.href = a.getAttribute("href").replace("v=2", "v=6"); });
    };
    return v;
  };
})();
