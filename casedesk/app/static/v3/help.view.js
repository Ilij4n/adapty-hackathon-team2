/* Iteration 3, Correspondence: Lumen Help.
   The status is folded into one sentence under the header and unfolds in place to every fact; step lists unfold
   the same way; the demo picker is a column of correspondents. Behaviour stays help.js's. */
(() => {
  "use strict";
  window.CaseDeskHelpView = (h) => {
    const { S, t, SL, $, el, cardRows, safeUrl, scrollDown } = h;
    const SVG = "http://www.w3.org/2000/svg";
    function icon(name, cls) {
      const s = document.createElementNS(SVG, "svg"); s.setAttribute("class", "ic" + (cls ? " " + cls : ""));
      s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
      const u = document.createElementNS(SVG, "use"); u.setAttribute("href", "#i-" + name); s.append(u); return s;
    }
    // one unfold mechanism for everything that opens in place (height 0fr to 1fr, then the content fades in)
    function setOpen(btn, panel, open) {
      btn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("open", open);
      panel.inert = !open;
    }

    // ---------------------------------------------------------------- the folded status
    const card = $("#statusCard"), tog = $("#stToggle"), more = $("#stMore");
    more.inert = true;
    tog.addEventListener("click", () => {
      const open = tog.getAttribute("aria-expanded") !== "true";
      setOpen(tog, more, open); card.classList.toggle("open", open);
    });

    function paintStatus(st) {
      const b = $("#stateBadge"); const code = st.state_badge.code;
      b.className = "badge " + (st.state_badge.tone || "info");
      b.textContent = (SL[S.lang] && SL[S.lang][code]) || st.state_badge.label;
      const L = t().facts; const rows = cardRows(st.facts || {});
      // the one date that answers "until when" goes into the folded sentence; the rest waits in the fold
      const DATES = [L.granted_until, L.trial_ends_on, L.renews_on, L.grace_until, L.expires_on, L.expired_on, L.refunded_on, L.billing_issue_on];
      const key = rows.find(([k]) => DATES.includes(k));
      const sub = $("#stSub"); sub.textContent = "";
      if (key) sub.append(el("span", "st-date", `${key[0]} ${key[1]}`));
      sub.hidden = !sub.children.length;
      const dl = $("#facts"); dl.textContent = "";
      rows.forEach(([k, v]) => { const d = el("div"); d.append(el("dt", null, k), el("dd", null, v)); dl.append(d); });
      tog.disabled = !rows.length;
      card.classList.toggle("no-facts", !rows.length);
      if (!rows.length) { setOpen(tog, more, false); card.classList.remove("open"); }
    }

    // ---------------------------------------------------------------- reply actions
    function linkAct(label, url) {
      const a = el("a", "act"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.append(el("span", null, label), icon("out")); return a;
    }
    function stepsAct(label, steps, row) {
      const b = el("button", "act steps-btn"); b.type = "button";
      b.append(el("span", null, label), icon("chev", "chev"));
      const wrap = el("div", "unfold steps-wrap"); const inner = el("div", "unfold-in");
      const ol = el("ol", "steps"); steps.forEach((s) => ol.append(el("li", null, s)));
      const id = "s" + Math.random().toString(36).slice(2, 8); ol.id = id;
      b.setAttribute("aria-controls", id); b.setAttribute("aria-expanded", "false");
      inner.append(ol); wrap.append(inner); wrap.inert = true;
      b.onclick = () => {
        const open = b.getAttribute("aria-expanded") !== "true";
        setOpen(b, wrap, open);
        if (open) setTimeout(scrollDown, 240);
      };
      row.after(wrap); return b;
    }
    function note(cls, ic, text) { const n = el("div", cls); n.append(icon(ic), el("span", null, text)); return n; }
    function renderActions(li, actions, facts, pendingApproval) {
      const tr = t(), A = tr.act; const store = (facts && facts.store) || "";
      const row = el("div", "actions"); li.append(row);
      const notes = [];
      for (const a of actions || []) {
        const p = a.params || {};
        switch (a.kind) {
          case "MANAGE_SUBSCRIPTION_LINK": { const u = safeUrl(p.url) || safeUrl(facts.manage_url); if (u) row.append(linkAct(A.MANAGE_SUBSCRIPTION_LINK, u)); break; }
          case "UPDATE_PAYMENT_METHOD": { const u = safeUrl(p.url) || safeUrl(facts.payment_url) || safeUrl(facts.manage_url); if (u) row.append(linkAct(A.UPDATE_PAYMENT_METHOD, u)); break; }
          case "REFUND_PATH_APPLE": { const u = safeUrl(p.url) || safeUrl(facts.refund_url) || "https://reportaproblem.apple.com"; row.append(linkAct(A.REFUND_PATH_APPLE, u)); notes.push(["note", "info", tr.refundAppleNote]); break; }
          case "REFUND_PATH_GOOGLE": { const u = safeUrl(p.url) || safeUrl(facts.refund_url); if (u) row.append(linkAct(A.REFUND_PATH_GOOGLE, u)); notes.push(["note", "info", tr.refundGoogleNote]); break; }
          case "CANCEL_STEPS": row.append(stepsAct(A.CANCEL_STEPS, (p.store || store) === "play_store" ? tr.cancelAndroid : tr.cancelIos, row)); break;
          case "RESTORE_PURCHASES_STEPS": row.append(stepsAct(A.RESTORE_PURCHASES_STEPS, (p.store || store) === "play_store" ? tr.restoreAndroid : tr.restoreIos, row)); break;
          case "PROPOSE_GRANT": notes.push(["note grant", "clock", tr.grantNote]); break;
          case "ESCALATE_TO_HUMAN": notes.push(["note", "person", tr.escalate]); break;
          default: break;
        }
      }
      // asked again while an earlier request is still under review: say it's pending
      if (pendingApproval && !(actions || []).some((a) => a.kind === "PROPOSE_GRANT")) notes.push(["note grant", "clock", tr.grantNote]);
      if (!row.children.length) row.remove();
      for (const [cls, ic, text] of notes) li.append(note(cls, ic, text));
    }

    // ---------------------------------------------------------------- the correspondents (demo picker)
    const langOf = (loc) => { try { return new Intl.DisplayNames(["en"], { type: "language" }).of(String(loc).replace(/_/g, "-")) || loc; } catch { return loc; } };
    function fillProfile(b, u) {
      const name = String(u.display_name).replace(/\s*\(.*?\)\s*/g, "").trim() || u.customer_user_id;
      const av = el("span", "av", h.initials(u.display_name)); av.setAttribute("aria-hidden", "true");
      const id = el("span", "p-id", String(u.customer_user_id).replace(/^.*_/, "")); id.translate = false;
      b.append(av, el("b", "p-name", name), id, el("span", "p-lang", langOf(u.locale)), el("small", "p-story", u.scenario));
    }

    // long links in replies get break hints after / . ? & = (text nodes only), so they wrap at a sensible point
    function withBreaks(node, text) {
      node.textContent = "";
      String(text).split(/(https?:\/\/[^\s]+)/g).forEach((p, i) => {
        if (!p) return;
        if (i % 2 === 0) { node.append(document.createTextNode(p)); return; }
        const m = p.match(/^(https?:\/\/)(.*)$/);
        node.append(document.createTextNode(m[1]));
        m[2].split(/(?<=[/.?&=_-])/).forEach((seg, j) => { if (j) node.append(el("wbr")); node.append(document.createTextNode(seg)); });
      });
    }
    new MutationObserver((recs) => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (!(n instanceof Element)) continue;
        const bubbles = n.matches(".bubble") ? [n] : [...n.querySelectorAll(".bubble")];
        for (const b of bubbles) {
          if (b.classList.contains("typing") || b.dataset.wrapped || !/https?:\/\//.test(b.textContent)) continue;
          b.dataset.wrapped = "1"; withBreaks(b, b.textContent);
        }
      }
    }).observe($("#log"), { childList: true, subtree: true });

    // the narrow-screen picker: "Ava 00239", laid out without a middle dot
    function onUser() {
      document.querySelectorAll("#demoSelect option").forEach((o) => { if (o.textContent.includes(" \u00b7 ")) o.textContent = o.textContent.replace(" \u00b7 ", "\u2002"); });
    }

    return { paintStatus, renderActions, fillProfile, onUser };
  };
})();
