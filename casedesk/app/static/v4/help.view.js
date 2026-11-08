/* Iteration 4 "Board": Lumen Help. The state of the account is the headline; a grant request is drawn as a 3-step
   tracker (Requested, The team reviews, Given) that completes when the team's answer arrives in the conversation.
   help.js keeps all behaviour; this file only draws the status card's tone, the tracker, step icons and the picker. */
window.CaseDeskHelpView = (h) => {
  "use strict";
  const { S, el } = h;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // tracker step labels per widget language: requested, under review, given, not added
  const STEPS = {
    en: ["Requested", "The team reviews", "Given", "Not added"],
    sr: ["Poslato", "Tim razmatra", "Dodato", "Nije dodato"],
    "sr-Cyrl": ["Послато", "Тим разматра", "Додато", "Није додато"],
    es: ["Solicitado", "El equipo revisa", "Añadido", "No añadido"],
    de: ["Angefragt", "Das Team prüft", "Hinzugefügt", "Nicht hinzugefügt"],
    pt: ["Solicitado", "A equipe analisa", "Adicionado", "Não adicionado"],
    ru: ["Запрошено", "Команда проверяет", "Добавлено", "Не добавлено"],
  };
  const steps = () => STEPS[S.lang] || STEPS.en;
  // the sentence under a resolved tracker: given, not given
  const RESOLVED = {
    en: ["Premium is active now.", "The team decided not to add access this time."],
    sr: ["Premium je sada aktivan.", "Tim je odlučio da ovog puta ne doda pristup."],
    "sr-Cyrl": ["Premium је сада активан.", "Тим је одлучио да овог пута не дода приступ."],
    es: ["Premium ya está activo.", "El equipo decidió no añadir acceso esta vez."],
    de: ["Premium ist jetzt aktiv.", "Das Team hat diesmal entschieden, keinen Zugang hinzuzufügen."],
    pt: ["O Premium já está ativo.", "A equipe decidiu não adicionar acesso desta vez."],
    ru: ["Premium уже активен.", "Команда решила в этот раз не добавлять доступ."],
  };
  // real apostrophes at display size ("didn’t"), in any script
  const curl = (x) => String(x).replace(/(\p{L})'(\p{L})/gu, "$1\u2019$2");

  const NS = "http://www.w3.org/2000/svg";
  function icon(d) {
    const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 16 16"); s.setAttribute("class", "i"); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); return s;
  }

  // the status card: help.js sets the badge (class "badge <tone>") and the facts; the card carries the tone too
  function paintStatus(st, card) {
    h.defaults.paintStatus(st, card);
    card.dataset.tone = (st.state_badge && st.state_badge.tone) || "info";
    const b = document.getElementById("stateBadge"); b.textContent = curl(b.textContent); // class stays "badge <tone>"
  }

  // ------------------------------------------------------------ grant tracker
  function labelTracker(note) {
    const L = steps(); const b = note.querySelectorAll(".step b"); const st = note.dataset.state;
    if (b.length !== 3) return;
    b[0].textContent = L[0]; b[1].textContent = L[1]; b[2].textContent = st === "denied" ? L[3] : L[2];
    // the sentence follows the tracker: "nothing changes until they decide" only while it is still open
    const R = RESOLVED[S.lang] || RESOLVED.en; const p = note.querySelector(".note-text");
    if (p) p.textContent = curl(st === "approved" ? R[0] : st === "denied" ? R[1] : h.t().grantNote);
  }
  function makeTracker(note) {
    if (note.querySelector(".tracker")) return;
    const msg = note.textContent; note.textContent = "";
    note.dataset.state = "pending";
    const tr = el("div", "tracker"); tr.setAttribute("aria-hidden", "true"); // the sentence below says it in words
    const track = el("span", "track"); track.append(el("span", "fill")); tr.append(track);
    for (let i = 1; i <= 3; i++) { const s = el("span", "step s" + i); s.append(el("i"), el("b")); tr.append(s); }
    note.append(tr, el("p", "note-text", curl(msg)));
    labelTracker(note);
  }
  function resolveTrackers(state) {
    const open = [...document.querySelectorAll('#log .note.grant[data-state="pending"]')];
    open.forEach((n, i) => {
      // only the latest request animates; earlier notes about the same request settle at once
      if (i < open.length - 1 || reduced()) n.classList.add("still");
      n.dataset.state = state; labelTracker(n);
    });
  }
  // help.js announces the team's decision as li.msg.system (".denied" when it was a no)
  const log = document.getElementById("log");
  if (log) new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) {
      if (n.nodeType === 1 && n.matches("li.msg.system")) resolveTrackers(n.classList.contains("denied") ? "denied" : "approved");
    }
  }).observe(log, { childList: true });

  function renderActions(li, actions, facts, pendingApproval) {
    h.defaults.renderActions(li, actions, facts, pendingApproval);
    li.querySelectorAll("button.act").forEach((b) => b.append(icon("M4 6l4 4 4-4")));
    li.querySelectorAll("a.act svg path").forEach((p) => p.setAttribute("stroke-width", "1.5"));
    li.querySelectorAll(".note.grant").forEach(makeTracker);
  }

  // ------------------------------------------------------------ demo picker: a typographic list
  function fillProfile(b, u) {
    const name = String(u.display_name).replace(/\s*\(.*?\)\s*/g, "").trim() || u.customer_user_id;
    const top = el("span", "p-top");
    const id = el("span", "p-id", String(u.customer_user_id).replace(/^.*_/, "")); id.translate = false;
    top.append(el("b", "p-name", name), el("span", "p-loc", String(u.locale || "").replace("_", "-")), id);
    b.append(top, el("span", "p-scn", u.scenario));
  }

  function onLang() {
    document.querySelectorAll("[data-i18n], .chip").forEach((n) => { if (n.children.length === 0) n.textContent = curl(n.textContent); });
    document.querySelectorAll("#log .note.grant").forEach(labelTracker);
  }

  return { paintStatus, renderActions, fillProfile, onLang };
};
