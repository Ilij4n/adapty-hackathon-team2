/* v6: a compact decision dock (approval footer): wider than tall, fewer lines (agent E).
   v2's decision card stays the source of the DOM (li.q-item, one .btn.approve, one .btn.deny, button.q-open, .hint);
   dock.css lays it out as one row. This wrapper only adjusts words, never the buttons or their handlers:
   - the count reads "1 waiting" (the Give button and the hint already say it needs your OK);
   - the key hint keeps "a give, d deny" (j / k is on the case list's own header);
   - the card keeps its "why" even when its case is open: v2 drops it then ("the open case already says why"), but in
     one row the reason sits right before the button, so the developer decides without looking up. */
(() => {
  "use strict";
  const base = window.CaseDeskConsoleView;
  window.CaseDeskConsoleView = (h) => {
    const v = base ? base(h) : {};
    const { S, el } = h;
    const whyOf = new Map();   // case id -> the status sentence the open case shows

    const keys = document.querySelector("#dock .dock-head .keys");
    if (keys) {
      keys.textContent = "";
      const k = (c) => el("kbd", null, c);
      keys.append(k("a"), document.createTextNode(" give "), k("d"), document.createTextNode(" deny"));
    }

    function tidy() {
      const n = document.getElementById("qCount"), w = document.getElementById("qWord");
      if (n && w && !n.hidden && /waiting for your OK/.test(w.textContent)) w.textContent = "waiting";
      const big = document.querySelector("#queue .q-item.big");
      if (!big || big.querySelector(".q-why") || big.getAttribute("aria-current") !== "true") return;
      const s = whyOf.get(S.selected);
      const open = big.querySelector(".q-body > .q-open");
      if (s && open) { const p = el("p", "q-why", s); p.title = s; open.after(p); }
    }

    const detail = v.renderDetail || h.defaults.renderDetail;
    v.renderDetail = (d) => {
      detail(d);
      const box = document.getElementById("detail");
      const line = box && (box.querySelector(".ro-was") || box.querySelector(".ro-line"));
      if (d && d.case && line && line.textContent.trim()) whyOf.set(d.case.id, line.textContent.trim());
      tidy();
    };
    const list = v.renderList || h.defaults.renderList;
    v.renderList = () => { list(); tidy(); };
    return v;
  };
})();
