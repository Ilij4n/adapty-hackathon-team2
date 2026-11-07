"""The deck's content: one dict per slide. html = stage markup (1920x1080 px), data-step="n" reveals on click n.
notes = what Subin says, word for word ([brackets] = actions). secs = target seconds for the spoken part.
bg: "live" = the video itself, paused on its first frame, behind the slide (so the hand-off into the video is seamless);
    "sN" = a blurred frame from the video (BGS in build.py).
The slides only say what the video does NOT: how we chose the idea, what's under the hood, what's real today, what's next."""

TEAM = "Mateja Subin <i>·</i> Andrija Milikić <i>·</i> Ilijan Kojović"

SLIDES = [
dict(id="title", bg="live", secs=18, html=f"""
<div class="kick">ADAPTY HACKATHON · BELGRADE 2026 · TEAM 2</div>
<h1 class="mega">Case <span class="amb">Desk</span></h1>
<p class="hook" data-step="1">Every subscription app has a support inbox<br><span class="amb">nobody talks about.</span></p>
<div class="team">{TEAM}</div>
""", notes="""Good evening. We're Team 2: I'm Mateja Subin, and with me are Andrija Milikić and Ilijan Kojović. This is Case Desk. [click]
Every subscription app has a support inbox nobody talks about: the messages that start with "you charged me". That inbox is what we built for."""),

dict(id="brief", bg="live", secs=22, html="""
<div class="kick">THE BRIEF, READ OUR WAY</div>
<blockquote class="brief">“Help subscription apps <b>earn more</b>, or make Adapty dramatically easier or smarter to use.”</blockquote>
<p class="reading" data-step="1">Earning more also means <span class="amb">not losing</span> the subscribers you already have.</p>
<div class="fork" data-step="2">
  <div class="fk q">A question about a charge</div>
  <div class="fk-arms">
    <div class="arm bad"><span>no answer, or a wrong one</span><i>→</i><b>a refund, a cancel</b></div>
    <div class="arm good"><span>a true answer, fast</span><i>→</i><b>a subscriber who stays</b></div>
  </div>
</div>
""", notes="""Adapty's brief was: help subscription apps earn more, or make Adapty easier or smarter to use. [click]
We read "earn more" as also: don't lose the subscribers you already have. [click]
A question about a charge that gets no answer, or a wrong one, turns into a refund or a cancel. A true answer, fast, keeps the subscriber."""),

dict(id="why", bg="live", secs=30, html="""
<div class="kick">HOW WE CHOSE IT</div>
<h2>We let agents argue first.</h2>
<div class="why">
  <div class="wrow" data-step="1"><span class="wn">~20</span><p>ideas researched against the brief,<br>then <b class="tea">debated</b> by our agents</p></div>
  <div class="wrow dead" data-step="2"><span class="wn">✕</span><p>First favourite: <s>an A/B-test “referee”</s><br><small>other teams were building it; Adapty partly does it already</small></p></div>
  <div class="wrow win" data-step="3"><span class="wn">✓</span><p><b class="amb">Ilijan's idea won</b><br>
    <span class="chips"><span>the pain is the subscriber's</span><span>the data is Adapty's</span><span>nobody here was answering the subscriber</span></span></p></div>
</div>
""", notes="""How did we pick it? We let agents argue first. [click]
Our agents researched about twenty ideas against that brief, then debated them. [click]
The early favourite, an A/B-test "referee", was being built by other teams, and Adapty already does part of it. So we dropped it. [click]
Ilijan's idea won: the pain is the subscriber's, the data is Adapty's, and nobody here was answering the subscriber. Even then, the final vote was a tie."""),

dict(id="primer", bg="live", secs=22, html="""
<div class="kick">WHAT YOU'LL SEE</div>
<p class="lumen"><b>Lumen</b> = Adapty's own hackathon test app</p>
<div class="views" data-step="1">
  <figure class="vw phone"><img alt="" src="{{img}}p_help.jpg"><figcaption><b>Lumen Help</b><span>what the subscriber sees</span></figcaption></figure>
  <figure class="vw cons"><img alt="" src="{{img}}p_console.jpg"><figcaption><b>The console</b><span>what the developer sees</span></figcaption></figure>
</div>
<div class="who" data-step="2"><span class="lbl">Watch for</span><span class="person">Marko <small>writes in Serbian</small></span><span class="person">Lucía</span><span class="person">Ava</span></div>
""", notes="""Three things help you read the video. Lumen is Adapty's own hackathon test app. [click]
Case Desk lives inside it twice: as "Lumen Help", the screen the subscriber sees, and as a console, which is what the developer sees. [click]
And watch for three users: Marko, who writes in Serbian, then Lucía and Ava."""),

dict(id="watch", bg="live", secs=5, html="""
<h1 class="mega sm">Watch it.</h1>
<p class="lead">Three minutes.</p>
""", notes="""That's all you need. Three minutes.
[→ starts the video right here: same frame, it pulls into focus]"""),

dict(id="video", bg=None, secs=0, video=True, html="", notes="""[The video plays by itself. Don't talk over it; it is narrated.]
[When it ends, the deck takes the keys back: press → for "Under the hood".]
[To leave early: Esc, then →. Inside the video: ←/→ seek 5 s, N/P next/previous scene, C captions, F fullscreen (whole deck).]"""),

dict(id="hood", bg="s5", secs=24, html="""
<div class="kick">UNDER THE HOOD</div>
<div class="arch">
  <div class="node app" data-step="1"><b>The app</b><small>“Lumen Help”</small></div>
  <div class="edge e1" data-step="1"><span>HMAC-signed<br>user id</span></div>
  <div class="node core" data-step="1"><b>Case Desk</b><small>FastAPI · sqlite · uv</small>
    <div class="pipe2" data-step="2"><span>13 states × intent</span><i>→</i><span>policy table</span><i>→</i><span>FactSheet</span><i>→</i><span class="amb">Claude</span><i>→</i><span class="tea">validator</span></div>
  </div>
  <div class="edge e2" data-step="3"><span>Api-Key<br>API v2</span></div>
  <div class="node adapty" data-step="3"><b>Adapty</b>
    <code>GET  …/profile/</code><code>POST …/grant/access-level/</code></div>
  <div class="node console" data-step="4"><b>Console</b><small>approve → re-check → grant</small></div>
  <div class="foot2" data-step="4">chat rate-limited per user · failed sign-ins per IP · grants never automatic</div>
</div>
""", notes="""Under the hood, for the engineers. [click]
The app signs each user id with HMAC, so you only ever see your own account. [click]
Code sorts the profile into one of thirteen states; a fixed table picks the actions; the FactSheet is all a reply may use. [click]
Two real Adapty calls: read the profile, grant an access level. [click]
And the grant only comes from the console, re-checked when you approve."""),

dict(id="real", bg="s8", secs=20, html="""
<div class="kick">WHAT'S REAL TODAY</div>
<div class="cols">
  <div class="col" data-step="1"><h3 class="tea">Real</h3><ul>
    <li>Live demo server: <code>/help</code> · <code>/console</code></li>
    <li>Real Claude writes the replies</li>
    <li><b>558</b> automated tests</li>
    <li>Adapty client built for the real API v2</li></ul></div>
  <div class="col" data-step="2"><h3 class="amb">Stand-in</h3><ul>
    <li>Mock Adapty server, seeded with Adapty's Lumen hackathon data</li>
    <li>Real API: a config change, not yet run against a live account</li>
    <li>Seeded console cases: scripted text through the real engine</li></ul></div>
</div>
""", notes="""And to be honest about what's real today. [click]
The live demo server runs real Claude, and there are 558 automated tests. [click]
The Adapty side is a mock server with Adapty's Lumen hackathon data; our client is built for the real API v2; switching is a config change, but we have not run it against a live Adapty account yet. The seeded console cases are scripted text through the real engine."""),

dict(id="next", bg="s3", secs=16, html=f"""
<div class="kick">NEXT</div>
<ul class="next">
  <li data-step="1">Plug into a real Adapty app: keys + webhooks</li>
  <li data-step="1">A Case Desk tab in the Adapty dashboard</li>
  <li data-step="1">Priced as an add-on, like Refund Saver <small>(Adapty's call)</small></li>
  <li data-step="1">The complaint signal for Adapty, across apps</li>
  <li data-step="1">More languages tested</li>
</ul>
<div class="qa" data-step="2">Questions?</div>
<div class="team foot">Team 2 · {TEAM}</div>
""", notes="""What's next? [click]
A real Adapty app, with keys and webhooks. A tab in the Adapty dashboard. An add-on like Refund Saver; the price is Adapty's call. The complaint signal across apps. And more languages tested. [click]
Thank you. We're happy to take your questions."""),
]
