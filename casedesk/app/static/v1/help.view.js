/* Lumen Help, iteration 1 "Statement". The status card is a printed receipt (item and price, the dates on a
   mini spine, the status as the bottom line); the grant note is a slip that gets stamped when the team
   approves. Behaviour stays in /static/help.js; this file only draws. */
window.CaseDeskHelpView = (h) => {
  "use strict";
  const { S, t, $, el } = h;
  const NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    chev: ["M6 4.5 9.5 8 6 11.5"],
    clock: ["c8,8,5.75", "M8 5v3.2l2.2 1.4"],
    check: ["M3.5 8.4 6.6 11.5 12.5 4.5"],
    info: ["c8,8,5.75", "M8 7.4v3.8", "M8 5.2v.1"],
    person: ["c8,5.4,2.4", "M3.4 13.6c.7-2.4 2.4-3.6 4.6-3.6s3.9 1.2 4.6 3.6"],
  };
  function icon(name) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("class", "i i-" + name); s.setAttribute("aria-hidden", "true");
    for (const d of ICONS[name]) {
      let n;
      if (d[0] === "c") {
        const [cx, cy, r] = d.slice(1).split(",");
        n = document.createElementNS(NS, "circle"); n.setAttribute("cx", cx); n.setAttribute("cy", cy); n.setAttribute("r", r);
      } else { n = document.createElementNS(NS, "path"); n.setAttribute("d", d); }
      s.append(n);
    }
    return s;
  }
  const auto = (n) => { n.dir = "auto"; return n; };

  // ------------------------------------------------------------ the receipt
  function paintStatus(st) {
    const badge = $("#stateBadge"); const code = st.state_badge.code;
    badge.className = "badge " + (st.state_badge.tone || "info");
    badge.textContent = (h.SL[S.lang] && h.SL[S.lang][code]) || st.state_badge.label;

    const f = st.facts || {}, L = t().facts;
    const item = $("#rcItem"); item.textContent = "";
    if (f.product_name) {
      item.append(auto(el("span", "rc-plan", f.product_name)));
      if (f.price) item.append(el("span", "rc-price", f.price));
      if (!f.granted_until && f.state !== "NO_PURCHASE" && f.store_name) item.append(el("span", "rc-store", `${L.store_name} ${f.store_name}`));
    }
    item.hidden = !item.childElementCount;

    // the key dates in time order on a small spine: past dates filled, dates still ahead hollow
    const asOf = f.as_of || new Date().toISOString().slice(0, 10);
    const rows = [];
    const add = (key, label, iso, tone) => { if (iso && label) rows.push({ key, label, iso, tone }); };
    if (f.cancelled_on && f.cancelled_on !== f.billing_issue_on) add("cancelled_on", L.cancelled_on, f.cancelled_on);
    add("billing_issue_on", L.billing_issue_on, f.billing_issue_on, "bad");
    add("refunded_on", L.refunded_on, f.refunded_on);
    if (f.granted_until) add("granted_until", L.granted_until, f.granted_until, "ok");
    else if (f.trial_ends_on) add("trial_ends_on", L.trial_ends_on, f.trial_ends_on);
    else if (f.renews_on) add("renews_on", L.renews_on, f.renews_on);
    else if (f.grace_ends_on) add("grace_ends_on", L.grace_until, f.grace_ends_on);
    else if (f.expires_on) add("expires_on", f.days_since_expired != null ? L.expired_on : L.expires_on, f.expires_on);
    rows.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
    const dl = $("#facts"); dl.textContent = "";
    rows.forEach((r, i) => {
      // a date already printed on the row above is set quietly, like a ledger's repeated entry
      const again = i > 0 && rows[i - 1].iso === r.iso;
      const d = el("div", "rc-row " + (r.iso > asOf ? "fut" : "past") + (r.tone ? " " + r.tone : "") + (again ? " again" : ""));
      d.dataset.key = r.key;
      const dd = el("dd"); const tm = el("time", null, h.fmtDate(r.iso)); tm.dateTime = r.iso; dd.append(tm);
      d.append(el("dt", null, r.label), dd); dl.append(d);
    });
    if (f.days_left && (!f.renews_on || f.trial_ends_on)) {
      const d = el("div", "rc-row left"); d.append(el("dt", null, L.days_left), el("dd", null, t().days(f.days_left))); dl.append(d);
    }
    dl.hidden = !dl.childElementCount;
  }

  // ------------------------------------------------------------ reply actions: statement rows, notes, the grant slip
  function renderActions(li, actions, facts, pendingApproval) {
    h.defaults.renderActions(li, actions, facts, pendingApproval);
    li.querySelectorAll("button.act").forEach((b) => b.append(icon("chev")));
    li.querySelectorAll(".note").forEach((n) => {
      const grant = n.classList.contains("grant");
      const txt = el("span", "note-t"); while (n.firstChild) txt.append(n.firstChild);
      n.append(icon(grant ? "clock" : txt.textContent === t().escalate ? "person" : "info"), auto(txt));
    });
  }

  // when the team approves, every open grant slip in this conversation receives a dated stamp
  function stampSlips(denied) {
    const f = (S.lastStatus && S.lastStatus.facts) || {};
    document.querySelectorAll("#log .note.grant:not(.stamped):not(.declined)").forEach((n) => {
      if (denied) { n.classList.add("declined"); return; }
      n.classList.add("stamped");
      const s = el("span", "stamp"); s.setAttribute("aria-hidden", "true");
      s.append(icon("check"));
      const tx = el("span", "stamp-t");
      tx.append(el("span", null, t().facts.granted_until || ""));
      if (f.granted_until) tx.append(el("b", null, h.fmtDate(f.granted_until)));
      s.append(tx);
      n.append(s);
    });
  }
  new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) {
      if (n.nodeType === 1 && n.matches("li.msg.system")) stampSlips(n.classList.contains("denied"));
    }
  }).observe($("#log"), { childList: true });

  // ------------------------------------------------------------ the demo index of accounts
  function fillProfile(b, u) {
    const name = String(u.display_name).replace(/\s*\(.*?\)\s*/g, "").trim() || u.customer_user_id;
    const top = el("span", "p-top");
    top.append(el("b", null, name), el("span", "p-loc", String(u.locale || "")), el("span", "p-id", String(u.customer_user_id).replace(/^.*_/, "")));
    b.append(top, el("small", null, u.scenario));
  }

  return { paintStatus, renderActions, fillProfile };
};
