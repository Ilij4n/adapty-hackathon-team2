"""SPEAKER-NOTES.md from slides.py (so the deck's N view and the file never disagree) + the Q&A crib."""
import re
from slides import SLIDES

WPS = 2.4   # calm presenting pace, words per second

QA = """## Likely jury questions (short, honest answers)

**How is this different from RevenueCat's Customer Center?**
RevenueCat ships support pieces: a Customer Center menu, helpdesk sidebars, and a team AI called Rico. But a human still reads every ticket and writes every answer. Case Desk answers the subscriber directly, in their language, from their real Adapty profile. The developer only steps in when money is involved.

**What if the AI is wrong?**
The AI never decides anything. Plain code reads the profile and decides the facts. Claude only writes the words, and a validator blocks any fact the code didn't supply. If something looks off, or someone tries to trick it, a human gets the case. And giving premium is only a request; a developer approves it with one click.

**Did you use real Adapty?**
The Adapty client is built for the real server-side API v2: GET /api/v2/server-side-api/profile/ to read, POST /api/v2/server-side-api/purchase/profile/grant/access-level/ to grant, with Api-Key auth. For the demo, it runs against a mock server seeded with Adapty's Lumen hackathon data. Pointing it at real Adapty means setting ADAPTY_API_BASE and ADAPTY_SECRET_KEY.

**Is the console data real?**
The 16 seeded console cases belong to real Lumen replay users. Their state, facts and actions come from the real engine. Only the user's message, the intent and the reply text are scripted, and those replies still pass the validator. Seeding never calls an LLM. The live cases you create on /help are fully real: real Claude, real engine.

**How do you stop prompt injection?**
User text is data, never instructions. Actions come from the code's policy table, from the state and the intent type only. In the live eval, 16 of 16 injection attempts were flagged, and none of them changed the actions.

**How would Adapty charge for it?**
Like its other add-ons. Refund Saver costs 0.2% of revenue and is free under 5,000 dollars a month. Case Desk fits right beside it. We haven't set a price; that's Adapty's call.

**Which languages?**
The reply comes back in whatever language the subscriber writes. We tested twelve languages live with real Claude, including Serbian in both Latin and Cyrillic; if it can't tell, it uses the app's language setting. In the video, Marko writes in Serbian.

**Can I try it?**
Yes: /help is the subscriber's side (it shows up as "Lumen Help"), /console is the developer's. Live demo server: http://192.168.1.32:8100 (on our network). The code is in a private GitHub repo, github.com/Ilij4n/adapty-hackathon-team2-private. We can give access.
"""


def write(path):
    out = ["# Case Desk — speaker notes (Subin speaks alone)\n",
           "Read the plain text. Lines in [brackets] are actions, not words. [click] = press → (or the clicker) once.\n",
           "The deck shows these notes with N (bottom panel + timer) or P (separate presenter window for a second screen).\n"]
    total = 0
    for i, s in enumerate(SLIDES, 1):
        spoken = re.sub(r"\[[^\]]*\]", "", s["notes"])
        w = len(spoken.split())
        est = round(w / WPS)
        total += est if not s.get("video") else 0
        head = f"## {i}. {s['id']}" + (" — VIDEO (≈3:04, narrated)" if s.get("video") else f" — ≈{max(est, 1)} s ({w} words)")
        out.append(head + "\n")
        out.append(s["notes"].strip() + "\n")
    vi = next(i for i, s in enumerate(SLIDES) if s.get("video"))
    sec = lambda ss: sum(round(len(re.sub(r"\[[^\]]*\]", "", s["notes"]).split()) / WPS) for s in ss)
    out.insert(3, f"Spoken before the video: ≈{sec(SLIDES[:vi])} s. After the video: ≈{sec(SLIDES[vi + 1:])} s. "
                  f"Video ≈3:04. Whole slot ≈5 min + Q&A.\n")
    out.append(QA)
    open(path, "w", encoding="utf-8").write("\n".join(out))
    print("notes:", path, f"spoken ≈{total} s incl. close")
