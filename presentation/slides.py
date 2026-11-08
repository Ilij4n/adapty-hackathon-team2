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
""", notes="""Good afternoon. We're Team 2: I'm Mateja Subin, and with me are Andrija Milikić and Ilijan Kojović. This is Case Desk. [click]
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

dict(id="primer", bg="live", secs=30, html="""
<div class="kick">WHAT YOU'LL SEE</div>
<h2>Three things no other team here has built.</h2>
<div class="see2"><div class="why">
  <div class="wrow" data-step="1"><span class="wn tea">✓</span><p><b>Every reply is checked</b> against the subscriber's account<br><small>before they see it, in their own language</small></p></div>
  <div class="wrow" data-step="2"><span class="wn amb">1</span><p><b class="amb">Free premium only with your OK</b>, or a rule you set<br><small>privacy requests and attacks always go to a person</small></p></div>
  <div class="wrow" data-step="3"><span class="wn tea">✦</span><p><b>Your support desk inside Claude</b><br><small>approve a grant, answer a subscriber, close a case, over MCP</small></p></div>
</div>
<div class="shots" data-step="1"><img class="sh-c" alt="The Case Desk console" src="{{img}}ui_console.jpg"><img class="sh-p" alt="Lumen Help on a phone" src="{{img}}ui_help.jpg"></div></div>
<p class="lumen" data-step="3"><small>In the video: <b>Lumen</b>, Adapty's own test app · watch for Marko (Serbian), Lucía and Ava</small></p>
""", notes="""Here is what you'll see, and as far as the other teams' public repos show, nobody else here has built it. [click]
One: every reply is checked against the subscriber's real account before they ever see it, in their own language. [click]
Two: free premium only goes out with your OK, or under a rule you set. Privacy requests and attacks always go to a person. [click]
Three: the whole support desk works from inside Claude. You can approve a grant, answer a subscriber or close a case, over MCP.
In the video, the app is Lumen, Adapty's own test app. Watch for Marko, who writes in Serbian, then Lucía and Ava."""),

dict(id="watch", bg="live", secs=5, html="""
<h1 class="mega sm">Watch it.</h1>
<p class="lead">Three minutes, twenty seconds.</p>
""", notes="""That's all you need. Three minutes.
[→ starts the video right here: same frame, it pulls into focus]"""),

dict(id="video", bg=None, secs=0, video=True, html="", notes="""[The video plays by itself. Don't talk over it; it is narrated.]
[When it ends, the deck takes the keys back: press → for "Under the hood".]
[To leave early: Esc, then →. Inside the video: ←/→ seek 5 s, N/P next/previous scene, C captions, F fullscreen (whole deck).]"""),

dict(id="hood", bg="s5", secs=30, html="""
<div class="kick">UNDER THE HOOD</div>
<div class="archimg" data-step="1"><img alt="Case Desk architecture: code decides the facts, Claude writes the words, you approve the money" src="{{img}}architecture.jpg"></div>
""", notes="""Under the hood, for the engineers. [click]
Three lanes. Claude writes the words: it reads what the user wants and phrases the reply, and that's all it does.
Plain code decides the facts: it reads the Adapty profile through the server-side API, sorts it into one of thirteen states, builds the FactSheet and picks the actions from a fixed policy table. Then the validator blocks any number or date that isn't in the FactSheet.
And you approve the money: a grant waits for your click, or follows a rule you set, and it's re-checked when it's approved. On the right, the console and the MCP server both use the same approve path."""),

dict(id="real", bg="s8", secs=20, html="""
<div class="kick">WHAT'S REAL TODAY</div>
<div class="cols">
  <div class="col" data-step="1"><h3 class="tea">Real</h3><ul>
    <li>Live demo server: <code>/help</code> · <code>/console</code></li>
    <li>Real Claude writes the replies; every reply checked</li>
    <li>Rules you choose: ask me · automatic up to N days · never</li>
    <li>Works from Claude: our MCP server, tested with Claude Code</li>
    <li>Suggested replies and a reply box for your team</li>
    <li><b>700+</b> automated tests · Adapty client built for the real API v2</li></ul></div>
  <div class="col" data-step="2"><h3 class="amb">Stand-in</h3><ul>
    <li>Mock Adapty server, seeded with Adapty's Lumen hackathon data</li>
    <li>Real API: a config change, not yet run against a live account</li>
    <li>Seeded console cases: scripted text through the real engine</li></ul></div>
</div>
""", notes="""And to be honest about what's real today. [click]
The live demo runs real Claude and checks every reply. You choose the rules for what it does alone, you can run it from Claude through our MCP server, your team gets suggested replies, and there are over seven hundred automated tests. [click]
The Adapty side is a mock server with Adapty's Lumen hackathon data; our client is built for the real API v2; switching is a config change, but we have not run it against a live Adapty account yet. The seeded console cases are scripted text through the real engine."""),

dict(id="next", bg="s3", secs=16, html=f"""
<div class="kick">NEXT</div>
<ul class="next">
  <li data-step="1">Plug into a real Adapty app: keys + webhooks</li>
  <li data-step="1">A Case Desk tab in the Adapty dashboard</li>
  <li data-step="1">Priced as an add-on, like Refund Saver <small>(Adapty's call)</small></li>
  <li data-step="1">The complaint signal for Adapty, across apps</li>
  <li data-step="1">Search, paging and assignment for bigger support teams</li>
  <li data-step="1">More languages tested</li>
</ul>
<div class="qa" data-step="2">Questions?</div>
<div class="team foot">Team 2 · {TEAM}</div>
""", notes="""What's next? [click]
A real Adapty app, with keys and webhooks. A tab in the Adapty dashboard. An add-on like Refund Saver; the price is Adapty's call. The complaint signal across apps. Search, paging and assignment for bigger teams. And more languages tested. [click]
Thank you. We're happy to take your questions."""),
]
