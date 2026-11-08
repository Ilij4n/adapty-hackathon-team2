# Case Desk — speaker notes (Subin speaks alone)

Read the plain text. Lines in [brackets] are actions, not words. [click] = press → (or the clicker) once.

The deck shows these notes with N (bottom panel + timer) or P (separate presenter window for a second screen).

Spoken before the video: ≈92 s. After the video: ≈108 s. Video ≈3:04. Whole slot ≈5 min + Q&A.

## 1. title — ≈19 s (46 words)

Good afternoon. We're Team 2: I'm Mateja Subin, and with me are Andrija Milikić and Ilijan Kojović. This is Case Desk. [click]
Every subscription app has a support inbox nobody talks about: the messages that start with "you charged me". That inbox is what we built for.

## 2. brief — ≈23 s (56 words)

Adapty's brief was: help subscription apps earn more, or make Adapty easier or smarter to use. [click]
We read "earn more" as also: don't lose the subscribers you already have. [click]
A question about a charge that gets no answer, or a wrong one, turns into a refund or a cancel. A true answer, fast, keeps the subscriber.

## 3. primer — ≈42 s (100 words)

Here's what we built, and the three things that make it different. [click]
One: every reply is checked against the subscriber's real account before they ever see it, in their own language. [click]
Two: free premium only goes out with your OK, or under a rule you set. Privacy requests and attacks always go to a person. [click]
Three: the whole support desk works from inside Claude. You can approve a grant, answer a subscriber or close a case, over MCP.
In the video, the app is Lumen, Adapty's own test app. Watch for Marko, who writes in Serbian, then Lucía and Ava.

## 4. watch — ≈8 s (20 words)

And now you'll see something special. Our demo, told by our own AI: Bagley built this video, start to finish.
[→ starts the video right here: same frame, it pulls into focus]

## 5. video — VIDEO (≈3:04, narrated)

[The video plays by itself. Don't talk over it; it is narrated.]
[When it ends, the deck takes the keys back: press → for "Under the hood".]
[To leave early: Esc, then →. Inside the video: ←/→ seek 5 s, N/P next/previous scene, C captions, F fullscreen (whole deck).]

## 6. hood — ≈46 s (111 words)

Under the hood, for the engineers. [click]
Three lanes. Claude writes the words: it reads what the user wants and phrases the reply, and that's all it does.
Plain code decides the facts: it reads the Adapty profile through the server-side API, sorts it into one of thirteen states, builds the FactSheet and picks the actions from a fixed policy table. Then the validator blocks any number or date that isn't in the FactSheet.
And you approve the money: a grant waits for your click, or follows a rule you set, and it's re-checked when it's approved. On the right, the console and the MCP server both use the same approve path.

## 7. real — ≈41 s (99 words)

And to be honest about what's real today. [click]
The live demo runs real Claude and checks every reply. You choose the rules for what it does alone, you can run it from Claude through our MCP server, your team gets suggested replies, and there are over seven hundred automated tests. [click]
The Adapty side is a mock server with Adapty's Lumen hackathon data; our client is built for the real API v2; switching is a config change, but we have not run it against a live Adapty account yet. The seeded console cases are scripted text through the real engine.

## 8. next — ≈21 s (50 words)

What's next? [click]
A real Adapty app, with keys and webhooks. A tab in the Adapty dashboard. An add-on like Refund Saver; the price is Adapty's call. The complaint signal across apps. Search, paging and assignment for bigger teams. And more languages tested. [click]
Thank you. We're happy to take your questions.

## Likely jury questions (short, honest answers)

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
