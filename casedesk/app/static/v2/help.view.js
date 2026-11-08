/* Lumen Help, iteration 2 "Night Shift". Same behaviour as the stock widget (static/help.js); this view only changes
   how the status instrument and the demo profiles are drawn. When the status changes for the same subscriber (the team
   approved a grant), the state and every changed fact flash once in reverse video. */
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

  // the narrow-screen picker reads "Ava 00239": layout and a space instead of a middle dot
  const sel = document.getElementById("demoSelect");
  if (sel && "MutationObserver" in window) {
    new MutationObserver(() => {
      for (const o of sel.options) if (o.textContent.includes(" · ")) o.textContent = o.textContent.replace(" · ", " ");
    }).observe(sel, { childList: true });
  }

  let prev = null;
  const factRows = (card) => [...card.querySelectorAll("#facts > div")].map((d) => [d.querySelector("dt"), d.querySelector("dd"), d]);

  return {
    paintStatus(st, card) {
      h.defaults.paintStatus(st, card);
      const badge = st.state_badge || {};
      const tone = badge.tone || "info";
      card.dataset.tone = tone;
      const rows = new Map();
      for (const [dt, dd] of factRows(card)) rows.set(dt.textContent, dd.textContent);
      if (prev && prev.user === h.S.user && prev.lang === h.S.lang) {
        if (prev.code !== badge.code) flash(card.querySelector(".readout"), tone);
        for (const [dt, dd, d] of factRows(card)) if (prev.rows.get(dt.textContent) !== dd.textContent) flash(d, tone);
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
    onUser() { prev = null; },
  };
};
