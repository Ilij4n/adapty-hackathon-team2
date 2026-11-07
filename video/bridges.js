/* "Case Desk, the pitch": connected bridges between scene pairs (owned by the lead).
   Rects are logical 1280x720, read off the real end/start frames of the full --words build (2026-11-07).
   spec.json is not edited: rfBRIDGE maps the incoming scene's index (0-based) to its bridge; trPick reads it. */
/* 1 > 2  one stage (the Belgrade night): the camera leaves the wide shot of both rooms and settles on the founder's office */
TRANS['cd:night']=tr3Stage({stage:rfNight(),pose:(o,T)=>{rfNightPose(o,T,{litB:1,phone:1,mon:{n:1}});rfBag(o.bag,T,{})},
  a:{p:[7.3,2.0,1.5],at:[3.95,1.15,-1.9]},b:{p:[4.0,2.6,7.4],at:[4.2,1.0,-1.3]}});
/* 2 > 3  "233 tickets waiting to happen" lifts out and grows into the answer: scene 3's "Case Desk" title on the line */
TRANS['cd:tickets>desk']=tr3Grow({from:[300,112,680,60],to:[520,378,290,64],tilt:'down',c:rfDESK});
/* 3 > 4  the console's glow and the Approved button go soft and settle on Marko's floor lamp and his phone */
TRANS['cd:console>marko']=tr3Defocus({lights:[[520,300],[700,400]],to:[[388,210],[627,352]]});
/* 4 > 5  Proof one's Lumen Help chat lifts out and lands as Lucía's phone in the money room */
TRANS['cd:chat>phones']=tr3Grow({from:[88,106,416,290],to:[302,257,157,189],tilt:'up',c:rfLUM});
/* 5 > 6  nothing shared: clean cut */
/* 6 > 7  the board's "71 tickets" card grows into "The honest part · same 71 tickets, both sides" */
TRANS['cd:71']=tr3Grow({from:[403,189,214,101],to:[441,121,398,86],tilt:'down',c:rfGOLD});
/* 7 > 8  one camera move to the right, from the review room to the three podiums */
TRANS['cd:hall>podiums']=tr3Tilt({dir:'right'});
TRANS['cd:night'].len=2.6;  /* slower (Subin, 2026-11-07: 0:20-0:22 felt too fast); scene 2's audio now starts after a 1 s breath */
/* rev 3: scenes 1+2 are one continuous night with one camera (scene 2's first frame = scene 1's last), so 1>2 is a plain cut;
   TRANS['cd:night'] above is kept but unused */
const rfBRIDGE={1:'cut'};
trPick=(name,k)=>{const m=name||rfBRIDGE[k];return m&&TRANS[m]?m:'cut'};
/* Subin, 2026-11-07: no title or "3:00 · 8 scenes" on the poster; just the frame and the play button */
(function(){const h=()=>{for(const id of ['bigt','bigs']){const e=document.getElementById(id);if(e)e.style.display='none'}};h();if(document.readyState!=='complete')window.addEventListener('load',h)})();
/* no "02 / 08 · title" chapter flash over the frame: it gave away the invisible 1>2 cut, and a jury demo reads cleaner without it */
(function(){const s=document.createElement('style');s.textContent='#chap{display:none!important}';(document.head||document.documentElement).appendChild(s)})();
