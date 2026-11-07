# shared.js — helpers for every scene (prefix `rf`, owned by the lead)

Palette (rgb triplets like CY): `rfGO` SHIP green, `rfAMB` RE-RUN amber, `rfKEEP` KEEP RUNNING lavender, `rfGRY` KILL grey,
`rfRED` BLOCKED/false red, `rfGOLD` scoreboard gold. `rfCol(label)` maps SHIP / RE-RUN / KEEP RUNNING / KILL / BLOCKED / FALSE / WRONG to its colour.

## 2D (draw over the 3D stage in `b[j]` or `base`; keep content in y 110–570)
- `rfPill(g,x,y,label,{c,a,pop,fs,s,r,hot,k,w})` verdict pill, centred; colour from rfCol(label). `k` 0..1 strikes it. Returns width.
- `rfStat(g,x,y,big,label,{c,a,pop,w,h,fs,lfs,sub,hot,glow,type,k,s})` big-number card, centred (default 220×126, 150 with `sub`).
- `rfVs(g,x,y,[big,label,col,sub],[big,label,col,sub],{gap,pop,popB,a,w,hotA,hotB,kA,kB})` two stat cards with "vs".
- `rfChip(g,x,y,text,{c,a,pop,fs,s,hot,k,mk:'v'|'x'})` small pill with a coloured dot (promise chips, tags). Returns width.
- `rfStamp(g,x,y,text,{p,c,fs,r,s,a})` rubber stamp slamming in as p goes 0→1 (e.g. `rfStamp(g,x,y,'RE-RUN',{p:P(p,W('re'),.35)})`).
- `rfCard(g,x,y,w,h,{title,c,a,pop,tfs,body:(g,x,y,w,h)=>{}})` panel with coloured header; x,y = top-left.
- `rfBar(g,x,y,w,label,v,val,{c,a,p,lw,fs})` labelled bar row (v 0..1, p reveal).

## 3D
- `rfOverlay(key,{name:[text,labelOpts]},extra(K,cam,o))` → camera-space stage with Bagley (`o.bag`, lower right) and labels (`o.lab.name`). Draw it after your backdrop:
  `X3.draw(g,OV,o=>{rfReset(o);rfLab(o.lab.name,x,y,alpha,size);rfBag(o,T,{rings:1})},t)`.
- `rfLab(m,x,y,a,s=1,d=6)`, `rfReset(o)`, `rfBag(objOrBag,T,{rings,sq,tilt,dx,dy,tool,lamp})` (voice-level pulse built in).
- `rfBagIn(K,cam,{x,y,z,r})` adds Bagley to your own stage's camera (camera space).
- `rfTex(K,w,h)` + `rfPaint(tex,key,(ctx,w,h)=>{})` a canvas texture that repaints only when `key` changes (seek-safe screens).
- `rfScoreboard(K,P,{w,h})` the "1 in 3" board on legs (face at `userData.tex`, ~6 m tall); `rfBoardFace(tex,n,sub)` paints it (n 0..1 brightness).
- `rfStadium(K,scene,P,{night,crowd,board})` low-poly stadium: pitch at origin (x ±16, z ±24), stands with an instanced crowd, 4 floodlights, the scoreboard at z −30.5 (`o.board`). Pose with `rfStadiumPose(o,T,cheer 0..1)`. Used in 1 (night); fits 9 (day) and 11.
- `rfWhistle(K,P,{s,c,ring})` referee whistle (~.5 long at s 1).
- `rfLumenPhone(K,P,{s,sub})` phone with the Lumen app on screen; `rfLumenPaint(ctx,w,h,{sub})` the same face for your own screens.
- `rfRun(D,n)` = RUN with the 2D presenter hidden and `b` padded to n beats.

## Scene-file pattern
A board is ONE expression, so wrap scene-local stages/helpers in an IIFE:
`(()=>{ const S7=X3.stage('s7-lab',K=>{...}); const s7_pose=(o,t,c,i,T)=>{...}; return rfRun({bg:(g,t,c,T,i)=>X3.draw(g,S7,o=>s7_pose(o,t,c,i,T),t), b:[...]},5) })()`
Scenes 1 and 2 (scenes/1.js, scenes/2.js) are worked examples: own stage, Bagley via rfBagIn in camera space, camera shots per beat.

## NEW for "Two Finalists" — the two sides (use these in every scene)
LEFT = Verdict-Accuracy Harness, teal. RIGHT = Case Desk, warm amber. Never swap sides or colours.
- Colours: `rfHAR` (teal '86,214,206') and `rfDESK` (amber '255,168,76') for 2D; `rfHAR3`/`rfDESK3` (bright) and
  `rfHAR3d`/`rfDESK3d` (dark) hex for 3D. `rfSIDE.L` / `rfSIDE.R` = `{c, c3, d3, name, short, icon}`.
  (`rfAMB` is still the old RE-RUN amber; for Case Desk use `rfDESK`.)
- 2D icons: `rfIconHarness(g,x,y,R,{c,a,pop,v,T})` gauge (needle at v 0..1, animates from T if v omitted) over a replay
  timeline with a moving playhead; `rfIconDesk(g,x,y,R,{c,a,pop,T,n})` inbox tray + bobbing support ticket + phone with a
  red badge (n, 0 hides). Both fit radius R. Also `ic(g,'rfHarness',x,y,r)` / `ic(g,'rfDesk',x,y,r)`.
- `rfSideTag(g,x,y,'L'|'R',{a,pop,fs,s,hot,short,T,label})` pill with the side's icon + name ("Verdict-Accuracy Harness" /
  "Case Desk"; `short:1` → "Harness"), centred, returns width. fs 20 → ~360 px wide for the long name.
- `rfSplit(g,{a,pop,top,bot,gap,margin,tags,short,T,hotL,hotR,fs})` the split frame: teal-tinted left panel, amber right
  panel, a centre seam, a side tag at the top of each (tags:0 hides them). Returns column bounds
  `{L:[x0,x1,cx], R:[x0,x1,cx]}` (defaults: L 60–622, R 658–1220, band y 110–570; tags sit at y top+30). Put your cards
  below y ≈ 175 when tags are on.
- 3D: `rfSplitStage(K,scene,P,{d,podium,icons,iconS,seamLen,seamZ})` builds two hexagonal podiums at x=∓d (default 3),
  teal left / amber right, glowing rims, a soft spotlight cone + halo each, a 3D icon standing on each (icons:0 leaves
  them bare), and a glowing seam on the floor along x=0. Returns `{grp, L, R, seam}`; `L/R = {grp, top, rim, cone, halo,
  icon}` (`top` = podium-top y, ~.92). Pose every frame: `rfSplitPose(o,T,{l,r})` (l/r 0..1 = how lit each side is).
- 3D icons: `rfHarness3(K,P,{s})` (standing gauge + replay rail with sliding playhead, ~1.6 tall) and `rfDesk3(K,P,{s})`
  (inbox tray with tickets + standing phone with a pulsing screen, ~1.1 tall); base at y 0, facing +z; animate with
  `obj.userData.pose(T,lv)`.
- Scene 1 (scenes/1.js) shows the split stage in use: a studio with both podiums, Bagley as the host in the middle, 4 : 4 board.

## Bridges
Bridges are registered by the lead in bridges.js and attached by scene index there (spec.json is not edited).
Tell the lead in done-N.md what your first and last frames show (what could carry over).

## Tip: keying the 3D camera/lights to words
`bg` gets no word times, but `base` does: `base:(g,t,c,T,i,A2)=>{const w=(j,s)=>A2(j,s)-c(j); X3.draw(g,ST,o=>pose(o,t,c,i,T,{r:w(2,'right')}),t)}`
— A2(beat, word) is the word's absolute time, so `w(j,word)` is its offset inside beat j. Draw the 3D there instead of in
`bg` (scenes 1 and 2 do this). Never stash W() values from a beat function into a variable for the bg (not seek-safe).

## NEW for "Case Desk, the pitch" (lead, 2026-11-07) — use these instead of drawing your own
The finalists' Harness/split helpers still exist but this video is about Case Desk alone (amber `rfDESK` / `rfDESK3`).
Lumen Help = Case Desk inside the Lumen app. Colours: `rfLUM` violet (the user's own bubbles), `rfLUMG` Lumen gold,
`rfDESK` amber (Lumen Help's replies, the console). Green `rfGO` = approved / true, red `rfRED` = blocked / slip.
- `rfBub(ctx,x0,y,colW,text,{me,sub,fs,a,pop,maxW,c,measure})` one chat bubble, top-left of its column (user `me:1` right,
  violet; Lumen Help left, navy with amber edge). `sub` = small italic gloss under the text (the English subtitle for
  Serbian/Spanish). Returns its height + gap. Works in 2D overlays too (e.g. S7's example "slip" bubbles, `c:rfRED`).
- `rfHelpPaint(ctx,W,H,{msgs:[{me,text,sub,a,pop}],card:{title,rows:[[k,v]],tag,c,a},typing,T,lang,fs})` the Lumen Help
  screen (header, bubbles that scroll so the newest shows, an optional "…" typing bubble, and a status card at the bottom,
  e.g. `{title:'Your plan',tag:'ACTIVE',rows:[['Lumen Pro Annual','66.99 EUR'],['Access until','13 Jul 2027']]}`).
  Designed at 360 x 740, scales with W.
- `rfHelpPhone2(g,cx,cy,h,{...rfHelpPaint opts,a,pop,r,glow})` a 2D phone (width h*.49) with that screen. Returns the
  screen rect. `zoom` (default 1.4) enlarges the whole screen layout (bubble text ≈ 11 px at h 440); for a reply the viewer must READ, draw big `rfBub`s over the scene instead.
- `rfHelpPhone(K,P,{s})` a 3D phone (~1.24 tall at s 1, faces +z); `rfHelpShow(phone,key,opts)` repaints its screen only
  when `key` changes, so build the key from quantised reveal values (`'m'+Math.round(a*6)`), never from T.
  (The 3D screen is small on a wide shot; for reading a reply, draw `rfHelpPhone2` over the 3D or push the camera in.)
- `rfApprove(g,cx,cy,{w,h,who,what,why,click,cur,denied,done,a,pop,T})` the developer's console request card, centred
  (440 x 236): "CASE DESK · CONSOLE", who / what / why, Approve + Deny. `click` 0..1 drives a cursor to Approve (0–.8)
  and the press (.8–1); at 1 it reads "Approved" with a green footer "Approved · Premium given by the team".
  Defaults are Ava's (`'Ava · u00239'`, `'3-day courtesy grant'`). Returns the Approve button rect.
- `rfStamp` (already above) for "real Claude, live", "no grant: never paid" etc.: pass `c` (it defaults to grey for unknown words).
- `rfTicketStack(g,x,yBottom,{n,f,num,label,c,a,pop,T,w,fs,lfs})` 2D pile of support tickets dropping in as f 0→1, a
  big number above, a label below. Returns the pile's top y.
- `rfTickets3(K,P,{n,s,c})` 3D ticket pile (slabs .9 x .035 x .5 at s 1, base y 0); pose every frame with
  `pile.userData.pose(T,f)` (f 0..1 = how many have landed; the newest drops in); `pile.userData.topY(f)` for a label.
- `rfWrap(ctx,text,maxW)` line wrapping with the context's current font.
- **`rfNight()` — the Belgrade night stage (scenes 1, 2; scene 8's closer should reuse it).** One stage (key `cd-night`):
  Marko's living room on the left (centre x −4.2: sofa with Marko, his glowing phone, window, floor lamp, coffee table, a
  sleeping cat) and the founder's office on the right (centre x 4.4, z −1.2: desk, founder, monitor, desk lamp, clock at
  eleven, bookshelf), night skyline and houses between. Bagley is `o.bag` in its camera space (lower right).
  Pose every frame: `X3.draw(g,ST,o=>{rfNightPose(o,T,{litB:1,phone:1,marko:{pose,face,look},founder:{...},help:{...rfHelpPaint opts,key}});K3.look(o.camera,...);rfBag(o.bag,T,{...})},t)`.
  `help` repaints Marko's phone (keep `key` stable). Points for `X3.at`: `o.pt.phone()`, `o.pt.monitor()`, `o.pt.markoHead()`,
  `o.pt.founderHead()`. Shots used: Marko close `[-3.0,1.45,3.0 → -4.3,.85,-1.0]`, wide both rooms `[0,2.7,10.2 → 0,1.15,-1.2]`
  (pos → target, for `K3.look`). Scene 1 ends on that wide shot with the "Case Desk" title.
