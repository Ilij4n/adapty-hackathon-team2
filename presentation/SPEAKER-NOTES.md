# Case Desk — speaker notes (Subin speaks alone)

Read the plain text. Lines in [brackets] are actions, not words. [click] = press → (or the clicker) once.

The deck shows these notes with N (bottom panel + timer) or P (separate presenter window for a second screen).

Spoken before the video: ≈96 s. After the video: ≈90 s. Video ≈3:04. Whole slot ≈5 min + Q&A.

## 1. title — ≈19 s (46 words)

Good afternoon. We're Team 2: I'm Mateja Subin, and with me are Andrija Milikić and Ilijan Kojović. This is Case Desk. [click]
Every subscription app has a support inbox nobody talks about: the messages that start with "you charged me". That inbox is what we built for.

## 2. brief — ≈23 s (56 words)

Adapty's brief was: help subscription apps earn more, or make Adapty easier or smarter to use. [click]
We read "earn more" as also: don't lose the subscribers you already have. [click]
A question about a charge that gets no answer, or a wrong one, turns into a refund or a cancel. A true answer, fast, keeps the subscriber.

## 3. why — ≈30 s (72 words)

How did we pick it? We let agents argue first. [click]
Our agents researched about twenty ideas against that brief, then debated them. [click]
The early favourite, an A/B-test "referee", was being built by other teams, and Adapty already does part of it. So we dropped it. [click]
Ilijan's idea won: the pain is the subscriber's, the data is Adapty's, and nobody here was answering the subscriber. Even then, the final vote was a tie.

## 4. primer — ≈22 s (52 words)

Three things help you read the video. Lumen is Adapty's own hackathon test app. [click]
Case Desk lives inside it twice: as "Lumen Help", the screen the subscriber sees, and as a console, which is what the developer sees. [click]
And watch for three users: Marko, who writes in Serbian, then Lucía and Ava.

## 5. watch — ≈2 s (6 words)

That's all you need. Three minutes.
[→ starts the video right here: same frame, it pulls into focus]

## 6. video — VIDEO (≈3:04, narrated)

[The video plays by itself. Don't talk over it; it is narrated.]
[When it ends, the deck takes the keys back: press → for "Under the hood".]
[To leave early: Esc, then →. Inside the video: ←/→ seek 5 s, N/P next/previous scene, C captions, F fullscreen (whole deck).]

## 7. hood — ≈28 s (68 words)

Under the hood, for the engineers. [click]
The app signs each user id with HMAC, so you only ever see your own account. [click]
Code sorts the profile into one of thirteen states; a fixed table picks the actions; the FactSheet is all a reply may use. [click]
Two real Adapty calls: read the profile, grant an access level. [click]
And the grant only comes from the console, re-checked when you approve.

## 8. real — ≈41 s (99 words)

And to be honest about what's real today. [click]
The live demo runs real Claude and checks every reply. You choose the rules for what it does alone, you can run it from Claude through our MCP server, your team gets suggested replies, and there are over seven hundred automated tests. [click]
The Adapty side is a mock server with Adapty's Lumen hackathon data; our client is built for the real API v2; switching is a config change, but we have not run it against a live Adapty account yet. The seeded console cases are scripted text through the real engine.

## 9. next — ≈21 s (50 words)

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
