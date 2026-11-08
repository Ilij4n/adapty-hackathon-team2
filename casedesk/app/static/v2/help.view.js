/* Lumen Help, iteration 2 "Night Shift". Same behaviour as the stock widget (static/help.js); this view only changes
   how the status band and the demo profiles are drawn.
   - When the status band scrolls away, a one-line state bar stays under the header (no strip of the band is left).
   - When the status changes for the same subscriber (the team approved a grant), the state label and each changed fact
     value flash once as a label-sized reverse-video chip. */
window.CaseDeskHelpView = (h) => {
  "use strict";
  const { el } = h;
  const TONE_C = { ok: "var(--teal)", warn: "var(--amber)", bad: "var(--coral)", info: "var(--ink)" };
  function flash(n, tone) {
    if (!n) return;
    n.style.setProperty("--fc", TONE_C[tone] || "var(--ink)");
    n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash");
    n.addEventListener("animationend", (e) => { if (e.target === n) n.classList.remove("flash"); }, { once: true });
  }

  // the compact state bar: shown while the band's bottom edge sits above the top 48px of the conversation
  const scroller = document.getElementById("scroller");
  const card = document.getElementById("statusCard");
  const mini = document.getElementById("statusMini");
  const miniBadge = mini && mini.querySelector(".sm-badge");
  const end = card && card.querySelector(".status-end");
  let bandGone = false;
  const setGone = (on) => { bandGone = !!on && !card.hidden; scroller.classList.toggle("band-gone", bandGone); };
  if (scroller && end && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      const top = (e.rootBounds || scroller.getBoundingClientRect()).top;
      setGone(!e.isIntersecting && e.boundingClientRect.bottom <= top + 1 && e.boundingClientRect.height >= 0);
    }, { root: scroller, rootMargin: "-48px 0px 0px 0px", threshold: 0 }).observe(end);
  }

  // the conversation takes the whole view only once it overflows (see .fill in help.css)
  const log = document.getElementById("log");
  const fit = () => { if (scroller && !scroller.classList.contains("fill") && log.children.length && scroller.scrollHeight > scroller.clientHeight + 1) scroller.classList.add("fill"); };
  if (log && "MutationObserver" in window) new MutationObserver(fit).observe(log, { childList: true, subtree: true, characterData: true });
  addEventListener("resize", fit);

  let prev = null;
  const factRows = (c) => [...c.querySelectorAll("#facts > div")].map((d) => [d.querySelector("dt"), d.querySelector("dd")]);

  return {
    paintStatus(st, c) {
      h.defaults.paintStatus(st, c);
      const badge = st.state_badge || {};
      const tone = badge.tone || "info";
      c.dataset.tone = tone;
      if (miniBadge) { miniBadge.className = "sm-badge " + tone; miniBadge.textContent = document.getElementById("stateBadge").textContent; }
      const rows = new Map();
      for (const [dt, dd] of factRows(c)) rows.set(dt.textContent, dd.textContent);
      if (prev && prev.user === h.S.user && prev.lang === h.S.lang) {
        if (prev.code !== badge.code) { flash(c.querySelector(".readout"), tone); if (bandGone) flash(miniBadge, tone); }
        for (const [dt, dd] of factRows(c)) if (prev.rows.get(dt.textContent) !== dd.textContent) flash(dd, tone);
      }
      prev = { user: h.S.user, lang: h.S.lang, code: badge.code, rows };
    },
    fillProfile(b, u) {
      const name = String(u.display_name).replace(/\s*\(.*?\)\s*/g, "").trim() || u.customer_user_id;
      const av = el("span", "av", h.initials(u.display_name)); av.setAttribute("aria-hidden", "true");
      const top = el("span", "p-top");
      const loc = el("span", "p-meta", String(u.locale || "").replace(/_/g, "-"));
      const id = el("span", "p-meta", String(u.customer_user_id).replace(/^.*_/, ""));
      loc.translate = false; id.translate = false;
      top.append(el("b", null, name), loc, id);
      b.append(av, top, el("small", null, u.scenario));
    },
    onUser() { prev = null; if (scroller && card) { setGone(false); scroller.classList.remove("fill"); } },
  };
};
