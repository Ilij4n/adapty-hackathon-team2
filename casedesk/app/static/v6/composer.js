/* Case Desk console, v6 "Night Shift, strips": the team composer. A normal chat box at the foot of the conversation,
   in place of v2's "Write to" link (which opened a large box) and the large reply box inside "A person needs to answer
   this". One composer per case, in every case.
   Placement: the decision card stays the bottom-most element (the dock) and the composer is the last thing in the
   conversation, right under the newest turn: the Give button keeps one fixed home, and the developer's words read as
   the next turn instead of a second bar fighting the decision card for the bottom of the screen.
   Sending is v2's flow (console.view.js, "the team reply"): the advisory fact-check (POST /api/cases/{id}/fact-check;
   warnings show and the button turns into "Send anyway"), then POST /api/cases/{id}/reply { text, resolve: false },
   role "team", shown to the user as "<app> team". Enter sends, Shift+Enter is a new line, Ctrl/Cmd+Enter also sends.
   Bagley's suggested reply (case.suggested_reply.text, escalated cases) is not a box above the conversation here: it is
   ghost text inside the empty composer. Tab (box empty) puts it in the box to edit; typing hides it and clearing the box
   brings it back; Esc hides it for that case; on touch screens tapping it puts it in the box. Enter never sends it
   unless it was taken. Screen readers get it through aria-describedby. Once a team reply exists it is not offered.
   The detail pane is rebuilt on every change, so the draft, its state and the focus live here, per case. */
(() => {
  "use strict";
  const base = window.CaseDeskConsoleView;
  window.CaseDeskConsoleView = (h) => {
    const v = base ? base(h) : {};
    const { S, el, cap } = h;
    const toast = (...a) => (v.toast || h.toast)(...a);
    const LINES = 5;
    const drafts = new Map();   // case id -> { text, fc: { text, warnings }, armedFor, busy, err, sugOff }
    const draftOf = (id) => { if (!drafts.has(id)) drafts.set(id, { text: "", fc: null, armedFor: null, busy: false, err: "", sugOff: false }); return drafts.get(id); };
    const touch = () => matchMedia("(hover: none), (pointer: coarse)").matches;
    const safeId = (id) => String(id).replace(/[^\w-]/g, "_");
    const current = (id) => document.getElementById("tc-" + safeId(id));

    // one line grows to five, then the box scrolls
    function grow(ta) {
      if (!ta || !ta.isConnected) return;
      const sec = ta.closest(".tc"), ghost = sec && sec.querySelector(".tc-ghost");
      if (ghost && sec.classList.contains("ghosting")) {   // the suggestion shows in full; the box is its height
        ta.style.height = ghost.offsetHeight + "px"; ta.style.overflowY = "hidden"; return;
      }
      const cs = getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 21;
      const max = Math.round(LINES * lh + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom));
      ta.style.height = "auto";
      const want = ta.scrollHeight;
      ta.style.height = Math.min(want, max) + "px";
      ta.style.overflowY = want > max ? "auto" : "hidden";
    }

    function paint(sec, dr) {
      if (!sec) return;
      const ta = sec.querySelector("textarea"), send = sec.querySelector(".tc-send");
      const warn = sec.querySelector(".tc-warn"), err = sec.querySelector(".tc-err");
      const text = ta.value.trim();
      const w = dr.fc && dr.fc.text === text ? dr.fc.warnings : [];
      warn.textContent = "";
      warn.hidden = !w.length;
      if (w.length) {
        const p = el("p", "fc-h");
        const lamp = el("span", "lamp warn"); lamp.setAttribute("aria-hidden", "true");
        p.append(lamp, el("span", null, "Heads-up: not in the account facts. You can still send it."));
        const ul = el("ul"); w.forEach((x) => ul.append(el("li", null, x.message)));
        warn.append(p, ul);
      }
      const armed = w.length > 0 && dr.armedFor === text;
      send.textContent = dr.busy ? "Sending…" : armed ? "Send anyway" : "Send";
      send.disabled = !text || dr.busy;
      send.classList.toggle("ready", !!text);
      ta.readOnly = dr.busy;
      sec.classList.toggle("busy", dr.busy);
      sec.setAttribute("aria-busy", String(dr.busy));
      sec.classList.toggle("has-err", !!dr.err);
      err.hidden = !dr.err;
      err.textContent = dr.err;
      ta.setAttribute("aria-invalid", String(!!dr.err));
      // the suggestion: ghost text while the box is empty
      const sug = sec.tcSug, on = !!sug && !dr.sugOff && !dr.busy && ta.value === "";
      sec.classList.toggle("ghosting", on);
      const ghost = sec.querySelector(".tc-ghost"); if (ghost) ghost.hidden = !on;
      ta.placeholder = on ? "" : sec.tcPlaceholder;
      const sid = sec.id.slice(3);
      ta.setAttribute("aria-describedby", `tc-hint-${sid}${on ? ` tc-sugd-${sid}` : ""} tc-warn-${sid} tc-err-${sid}`);
      grow(ta);
    }

    // after a send: the same refresh console.js runs, without select()'s jump to the top of the case on phones
    async function reload(id) {
      const d = await h.api("/api/cases/" + encodeURIComponent(id));
      if (S.selected !== id) return;
      S.sig.detail = JSON.stringify(d); S.sig.detailId = id;
      v.renderDetail(d);
      h.rerenderList();
    }

    function composer(c, sug) {
      const dr = draftOf(c.id);
      const nm = cap(h.nameOf(c.customer_user_id) || "the user");
      const app = (S.meta && S.meta.app_name) || "Lumen";
      const sid = safeId(c.id);
      const sec = el("section", "tc"); sec.id = "tc-" + sid; sec.setAttribute("aria-label", `Write to ${nm}`);
      sec.tcSug = sug; sec.tcPlaceholder = `Write to ${nm}`;

      const hint = el("p", "tc-hint"); hint.id = "tc-hint-" + sid;
      const to = el("span", "tc-to");
      to.append(document.createTextNode(`Goes to ${nm}’s help chat as `), el("b", null, `${app} team`), document.createTextNode(", exactly as written."));
      const keys = el("span", "tc-keys"); keys.setAttribute("aria-hidden", "true");
      const kSend = el("span", "tc-k-send");
      kSend.append(el("kbd", null, "Enter"), document.createTextNode(" sends, "), el("kbd", null, "Shift"), document.createTextNode("+"),
        el("kbd", null, "Enter"), document.createTextNode(" new line"));
      keys.append(kSend);
      hint.append(to);
      if (sug) {   // while the suggestion shows, the hint names the key that takes it (the tap on touch screens)
        const kSug = el("span", "tc-k-sug");
        kSug.append(el("kbd", null, "Tab"), document.createTextNode(" uses the suggested reply, "), el("kbd", null, "Esc"), document.createTextNode(" hides it"));
        keys.append(kSug);
        const tap = el("span", "tc-tap", touch() ? "Tap the suggestion to use it." : "Tab uses the suggested reply.");
        tap.setAttribute("aria-hidden", "true");
        hint.append(tap);
      }
      hint.append(keys);

      const box = el("div", "tc-box");
      const lb = el("label", "sr-only", `Message to ${nm}`); lb.htmlFor = "tc-text-" + sid;
      const ta = el("textarea", "tc-text"); ta.id = "tc-text-" + sid; ta.rows = 1; ta.maxLength = 2000; ta.dir = "auto";
      ta.placeholder = `Write to ${nm}`; ta.value = dr.text; ta.dataset.case = c.id;
      ta.setAttribute("enterkeyhint", "send");
      ta.setAttribute("aria-describedby", `tc-hint-${sid} tc-warn-${sid} tc-err-${sid}`);
      const send = el("button", "btn tc-send", "Send"); send.type = "button";
      const field = el("div", "tc-field"); field.append(ta);
      let sugd = null;
      if (sug) {
        const ghost = el("div", "tc-ghost", sug.text); ghost.id = "tc-ghost-" + sid; ghost.dir = "auto"; ghost.hidden = true;
        ghost.setAttribute("aria-hidden", "true");
        if (sug.language) ghost.lang = sug.language;
        ghost.addEventListener("click", () => take());   // touch screens (no Tab key): tapping the suggestion takes it
        field.append(ghost);
        const how = sug.source === "llm" || sug.source === "llm_retry" ? "written by Case Desk from the account facts and checked"
          : sug.source === "seed" ? "drafted from the account facts and checked" : "built from the account facts";
        sugd = el("p", "sr-only", `Suggested reply, ${how}: ${sug.text} Tab puts it in the box to edit, Escape hides it.`);
        sugd.id = "tc-sugd-" + sid;
        if (sug.language) sugd.lang = sug.language;
      }
      box.append(lb, field, send);
      box.addEventListener("mousedown", (e) => { if (e.target === box) { e.preventDefault(); ta.focus(); } });   // the box past the text measure

      const warn = el("div", "fc-warn tc-warn"); warn.id = "tc-warn-" + sid; warn.setAttribute("role", "status"); warn.setAttribute("aria-live", "polite"); warn.hidden = true;
      const err = el("p", "tc-err"); err.id = "tc-err-" + sid; err.setAttribute("role", "alert"); err.hidden = true;
      sec.append(hint, box, warn, err);
      if (sugd) sec.append(sugd);

      // the suggestion goes in the box as the developer's own draft: edited, fact-checked and sent like anything typed
      function take() {
        const t = current(c.id) ? current(c.id).querySelector("textarea") : ta;
        if (!sug || t.value !== "" || dr.busy) return;
        t.value = sug.text;
        t.dispatchEvent(new Event("input"));
        t.focus({ preventScroll: true });
        try { t.setSelectionRange(t.value.length, t.value.length); } catch { /* */ }
      }

      let tmr = null;
      const check = (text) => h.api(`/api/cases/${encodeURIComponent(c.id)}/fact-check`, { method: "POST", body: JSON.stringify({ text }) })
        .then((r) => { dr.fc = { text, warnings: r.fact_check || [] }; paint(current(c.id), dr); return dr.fc.warnings; });
      ta.addEventListener("input", () => {
        dr.text = ta.value;
        dr.err = "";
        paint(sec, dr);
        clearTimeout(tmr);
        const val = ta.value.trim();
        if (val) tmr = setTimeout(() => { if (ta.value.trim() === val) check(val).catch(() => {}); }, 700);
      });

      async function go() {
        const text = ta.value.trim();
        if (!text) { ta.focus(); return; }
        if (dr.busy) return;
        const force = !!dr.armedFor && dr.armedFor === text;
        const hadFocus = sec.contains(document.activeElement);
        const reveal = () => { const t = current(c.id); if (t) t.scrollIntoView({ block: "nearest" }); };   // the heads-up or the error under the box
        const refocus = () => { const t = current(c.id); if (hadFocus && t) t.querySelector("textarea").focus({ preventScroll: true }); };
        dr.busy = true; dr.err = ""; paint(sec, dr);
        try {
          const w = dr.fc && dr.fc.text === text ? dr.fc.warnings : await check(text).catch(() => []);
          if (w.length && !force) { // one confirm click: the warnings show, the button now says "Send anyway"
            dr.armedFor = text; dr.busy = false; paint(current(c.id), dr); refocus(); reveal(); return;
          }
          const r = await h.api(`/api/cases/${encodeURIComponent(c.id)}/reply`, { method: "POST", body: JSON.stringify({ text, resolve: false }) });
          Object.assign(dr, { text: "", fc: null, armedFor: null, busy: false, err: "", sugOff: true });   // answered: the suggestion does not come back
          const lc = S.cases.find((x) => x.id === c.id); if (lc && r && r.status) lc.status = r.status;
          const was = current(c.id);
          if (was) { const t = was.querySelector("textarea"); t.value = ""; grow(t); paint(was, dr); }
          toast(`Sent to ${nm}.`);
          await reload(c.id).catch(() => {});
          refocus();
          const now = current(c.id); if (now) now.scrollIntoView({ block: "nearest" });
        } catch (e) {
          dr.busy = false;
          const why = String((e && e.message) || "").replace(/[.\s]+$/, "");
          dr.err = `Not sent${why ? ": " + why : ""}. Your message is still here; press Enter to try again.`;
          paint(current(c.id), dr); refocus(); reveal();
        }
      }
      send.onclick = go;
      ta.addEventListener("keydown", (e) => {
        if (e.isComposing || e.keyCode === 229) return;
        const ghosting = sec.classList.contains("ghosting") && ta.value === "";
        if (e.key === "Tab") {   // Tab takes the suggestion only from an empty box; otherwise focus moves on as usual
          if (!ghosting || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
          e.preventDefault(); take(); return;
        }
        if (e.key === "Escape") {
          if (!ghosting) return;
          e.preventDefault(); e.stopPropagation();
          dr.sugOff = true; paint(sec, dr); return;
        }
        if (e.key !== "Enter") return;
        if (e.shiftKey || e.altKey) return;            // Shift+Enter: a new line
        e.preventDefault();
        if (!send.disabled) go();
      });

      paint(sec, dr);
      requestAnimationFrame(() => grow(ta));
      return sec;
    }

    const detail = v.renderDetail || h.defaults.renderDetail;
    let lastId = null;
    v.renderDetail = (d) => {
      const box = document.getElementById("detail");
      const same = lastId === d.case.id;
      const ae = document.activeElement;
      const focus = ae && ae.classList && ae.classList.contains("tc-text") ? { id: ae.id, a: ae.selectionStart, b: ae.selectionEnd } : null;
      const keep = same && box ? [box.scrollTop, ...[...box.querySelectorAll(".scroll")].map((n) => n.scrollTop)] : null;
      const wy = window.scrollY;
      detail(d);
      lastId = d.case.id;
      const c = d.case;
      // v2's two reply boxes and its suggested-reply box leave; one composer takes their place at the foot of the
      // conversation, with the suggestion as ghost text inside it
      const pn = document.querySelector("#detail .person-note");
      document.querySelectorAll("#detail .write-to, #detail .person-note .composer, #detail .person-note .suggest").forEach((n) => n.remove());
      const s0 = c.suggested_reply;
      const answered = (d.messages || []).some((m) => m.role === "team");
      const sug = pn && !answered && s0 && typeof s0.text === "string" && s0.text.trim() ? { ...s0, text: s0.text.trim() } : null;
      const turns = document.querySelector("#detail .transcript .turns");
      if (turns) turns.after(composer(c, sug));
      // the "A person needs to answer this" box leaves too (Ilijan: the hint is enough); its reasons become one short
      // line above the composer's hint, the injection warning in coral
      if (pn) {
        const why = [...pn.querySelectorAll(".alerts li")].map((li) => ({ bad: li.classList.contains("bad"), text: li.textContent.trim() })).filter((x) => x.text);
        const tc = document.querySelector("#detail .tc");
        if (why.length && tc) { const w = h.el("p", "tc-why"); why.forEach((x) => w.append(h.el("span", x.bad ? "bad" : null, x.text))); tc.prepend(w); }
        pn.remove();
      }
      if (focus) { const n = document.getElementById(focus.id); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(focus.a, focus.b); } catch { /* */ } } }
      if (keep && box) { box.scrollTop = keep[0]; box.querySelectorAll(".scroll").forEach((n, i) => { n.scrollTop = keep[i + 1] || 0; }); }
      if (same && Math.abs(window.scrollY - wy) > 1) window.scrollTo(0, wy);
    };
    return v;
  };
})();
