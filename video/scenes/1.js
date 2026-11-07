/* Scene 1 — The reviews (demo, rev 3: ONE continuous night, one camera, no cuts).
   One camera glides along keyframes keyed to word times (Hermite spline, seek-safe, built in `base` from A2):
     establishing shot of Marko's 2 a.m. room → push in on him typing → the published review → the card lifts off,
     drifts out past his window, across the street (Apple / Google signposts on the way) and lands on the founder's
     dark monitor; the other reviews follow it → slow dolly in on the founder, asleep, unread messages piling up.
   beats: 0 2 a.m.; the App Store "Write a Review" phone, one star, the title types in
          · 1 the real Noom review types word by word, Send lights up
          · 2 the phone gives way to the published 1-star Noom card; "from this week"; Calm / Flo / Calm fan out + source
          · 3 the cards fly to the founder's monitor along the camera path; Apple / Google "contact the app developer" signposts
          · 4 the founder ASLEEP in the dark (monitor glow only), Zzz, unread messages stack beside the monitor, "unanswered until morning"
   LAST FRAME = scene 2's FIRST FRAME (same camera E1, same lights, same overlays drawn in `base` by s1_hold / s2_hold). */
(()=>{
const S1=rfNight();let O=null;
/* camera spline: keys [[time,[px,py,pz,tx,ty,tz]],...]; Hermite with Catmull-Rom tangents (zero at both ends) */
const s1_cam=(K,t)=>{const n=K.length;if(t<=K[0][0])return K[0][1].slice();if(t>=K[n-1][0])return K[n-1][1].slice();let k=0;while(t>K[k+1][0])k++;
  const[t0,a]=K[k],[t1,b]=K[k+1],h=t1-t0,u=(t-t0)/h,tan=j=>j<=0||j>=n-1?K[j][1].map(()=>0):K[j][1].map((v,q)=>(K[j+1][1][q]-K[j-1][1][q])/(K[j+1][0]-K[j-1][0])),ma=tan(k),mb=tan(k+1);
  const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;return a.map((v,q)=>h00*v+h10*h*ma[q]+h01*b[q]+h11*h*mb[q])};
const E1=[6.9,1.9,2.3, 3.95,1.13,-1.85];   /* the end frame (scene 2 starts here) */
/* the founder asleep at his desk: eyes shut, slumped back, head dropped to one side, slow breathing */
const s1_sleep=(o,T)=>{const f=o.founder,b=f.userData.bones||{};f.userData.pose(T,{pose:'type',w:1,blink:1,look:0,face:'neutral',hand:1});
  const br=Math.sin(T*1.3)*.02;if(b.spine)b.spine.rotateX(-.16+br);if(b.chest)b.chest.rotateX(-.1+br);if(b.head){b.head.rotateX(-.12);b.head.rotateZ(.5)}
  PLACE3.atDesk(f,o.desk,o.chair)};
/* lights off in the founder's room: only the monitor's own glow (m). The desk lamp stays off for the whole opening. */
const s1_lamp=(o,on)=>o.dl.traverse(m=>{if(m===o.dl)return;if(m.isLight){m.userData.i0??=m.intensity;m.intensity=on?m.userData.i0:0}
  else if(m.material&&(m.material.transparent||m.material.isMeshBasicMaterial))m.visible=!!on});
const s1_dark=(o,m)=>{o.lightB.intensity=.35*m;o.lampHalo.material.opacity=0;o.monHalo.material.opacity=.38*m;s1_lamp(o,0)};
const s1_clock2=o=>{o.hHand.rotation.z=-(2/12)*Math.PI*2;o.mHand.rotation.z=0};
/* the real reviews (App Store, US). [app, date, quote, badge colour, badge letter, title] */
const RV=[['Noom','4 Nov 2026','I cancelled on the app, and confirmed it, but it still tried to charge me after.','255,140,66','n','Still Got Charged After Canceling Subscription'],
  ['Calm','7 Oct 2026','Paid for premium subscription, did not receive premium content.','92,150,255','C'],
  ['Flo','26 Oct 2026','I canceled account months ago and am still receiving charges.','255,110,160','F'],
  ['Calm','16 Oct 2026','I reached out to customer service and no reply email for 2.5 weeks.','92,150,255','C']];
/* one review card, top-left x,y (rotation r about its centre); returns its height */
const s1_rev=(g,x,y,w,r,o={})=>{const a=(o.a??1),pop=o.pop??1;if(a<=0||pop<=0)return 0;const fs=o.fs||15,hot=o.hot||0,[app,date,q,bc,bl,title]=r;
  g.save();g.font=F({fs,i:1});const lines=rfWrap(g,'“'+q+'”',w-fs*2);g.font=F({fs:fs*1.02,w:700});const tl=title?rfWrap(g,title,w-fs*2):[];
  const ty=fs*2.95,qy=ty+tl.length*fs*1.3+(tl.length?fs*.25:0),hh=qy+lines.length*fs*1.34+fs*.55;
  g.globalAlpha*=a;g.translate(x+w/2,y+hh/2);g.rotate(o.r||0);const sc=bk(cl(pop))*(o.s||1);g.scale(sc,sc);g.translate(-w/2,-hh/2);
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=20;g.shadowOffsetY=6;g.beginPath();g.roundRect(0,0,w,hh,12);g.fillStyle='rgba(16,26,48,.97)';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.6+hot*1.4;g.strokeStyle=`rgba(${rfRED},${.55+.45*hot})`;if(hot){g.shadowColor=`rgba(${rfRED},.9)`;g.shadowBlur=18*hot}g.stroke();g.shadowColor='transparent';
  const by=fs*1.35,bs=fs*1.5;g.beginPath();g.roundRect(fs*.8,by-bs/2,bs,bs,bs*.26);g.fillStyle=`rgba(${bc},1)`;g.fill();
  txt(g,fs*.8+bs/2,by+1,bl,{fs:fs*1.05,w:800,c:'255,255,255'});
  txt(g,fs*.8+bs+fs*.55,by,app,{fs:fs*1.1,w:800,al:'left'});g.font=F({fs:fs*1.1,w:800});const aw=g.measureText(app).width;
  txt(g,fs*.8+bs+fs*1.1+aw,by+1,'★☆☆☆☆',{fs:fs*1.02,w:700,c:rfGOLD,al:'left'});
  txt(g,w-fs*.8,by,date,{fs:fs*.86,c:'160,172,198',al:'right'});
  tl.forEach((l,k)=>txt(g,fs*.8,ty+k*fs*1.3,l,{fs:fs*1.02,w:700,al:'left'}));
  lines.forEach((l,k)=>txt(g,fs*.8,qy+k*fs*1.34,l,{fs,i:1,al:'left',c:'232,236,248'}));
  g.restore();return hh};
/* the App Store "Write a Review" sheet on a phone (dark mode, 2:00 in the status bar). cx,cy = centre.
   o = {a,pop,stars 0..1,title (typed text),body (typed text),caret ('t'|'b'|''),send 0..1 (Send lit),press 0..1,T} */
const s1_FN=(w,fs)=>`${w} ${fs}px "IBM Plex Sans",sans-serif`;
const s1_asPhone=(g,cx,cy,o={})=>{const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const W=280,H=486;
  g.save();g.globalAlpha*=a;g.translate(cx,cy);const sc=bk(cl(pop))*(o.s||1);g.scale(sc,sc);g.translate(-W/2,-H/2);
  g.shadowColor='rgba(120,150,255,.35)';g.shadowBlur=34;g.beginPath();g.roundRect(0,0,W,H,40);g.fillStyle='#0b0c10';g.fill();g.shadowColor='transparent';
  g.lineWidth=3;g.strokeStyle='#3a3d46';g.stroke();
  const sx=10,sy=10,sw=W-20,sh=H-20;g.save();g.beginPath();g.roundRect(sx,sy,sw,sh,32);g.clip();g.translate(sx,sy);
  g.fillStyle='#1c1c1e';g.fillRect(0,0,sw,sh);g.textBaseline='middle';
  /* status bar + island */
  g.fillStyle='#000';g.beginPath();g.roundRect(sw/2-42,8,84,22,11);g.fill();
  g.fillStyle='#fff';g.font=s1_FN(700,14);g.textAlign='left';g.fillText('2:00',26,20);
  g.strokeStyle='#fff';g.lineWidth=1.3;g.beginPath();g.roundRect(sw-48,14,22,11,3);g.stroke();g.fillStyle='#fff';g.fillRect(sw-46,16,8,7);
  /* nav */
  const ny=50;g.font=s1_FN(400,14);g.fillStyle='#0a84ff';g.fillText('Cancel',14,ny);
  g.textAlign='center';g.fillStyle='#fff';g.font=s1_FN(700,14.5);g.fillText('Write a Review',sw/2,ny);
  g.textAlign='right';const sd=o.send||0,pr=o.press||0;g.font=s1_FN(700,14);g.fillStyle=sd>.5?'#0a84ff':'#5a5a60';
  if(pr>0){g.save();g.globalAlpha*=pr*(1-pr*.4);g.fillStyle='rgba(10,132,255,.25)';g.beginPath();g.roundRect(sw-60,ny-14,52,28,10);g.fill();g.restore()}
  g.fillText('Send',sw-14,ny);g.fillStyle='#38383a';g.fillRect(0,ny+18,sw,1);
  /* app row */
  const ay=ny+44;g.beginPath();g.roundRect(14,ay-16,32,32,8);g.fillStyle='rgb(255,140,66)';g.fill();g.fillStyle='#fff';g.textAlign='center';g.font=s1_FN(800,19);g.fillText('n',30,ay+1);
  g.textAlign='left';g.fillStyle='#fff';g.font=s1_FN(700,15);g.fillText('Noom',56,ay-6);g.fillStyle='#8e8e93';g.font=s1_FN(400,11.5);g.fillText('Health & Fitness',56,ay+10);
  /* stars */
  const st=o.stars||0,sy2=ay+44;for(let k=0;k<5;k++){const x=sw/2+(k-2)*38,on=k==0&&st>0;const bs=on?1+.35*Math.sin(cl(st)*Math.PI):1;
    g.save();g.translate(x,sy2);g.scale(bs,bs);g.font=s1_FN(400,30);g.textAlign='center';g.fillStyle=on?'#ff9f0a':'#48484a';g.fillText(on?'★':'☆',0,1);g.restore()}
  g.textAlign='center';g.fillStyle='#8e8e93';g.font=s1_FN(400,11);g.fillText(st>0?'1 star':'Tap to Rate',sw/2,sy2+24);
  /* title field */
  let y=sy2+46;g.fillStyle='#38383a';g.fillRect(14,y-8,sw-28,1);g.textAlign='left';const cBlink=((o.T||0)*2|0)%2==0;
  g.font=s1_FN(700,15);if(o.title){const tl=rfWrap(g,o.title,sw-30);tl.forEach((l,k)=>{g.fillStyle='#fff';g.fillText(l,14,y+10+k*19)});
    if(o.caret=='t'&&cBlink){const lw=g.measureText(tl[tl.length-1]).width;g.fillStyle='#0a84ff';g.fillRect(16+lw,y+10+(tl.length-1)*19-9,2,18)}y+=Math.max(1,tl.length)*19+12}
  else{g.fillStyle='#636366';g.fillText('Title',14,y+10);y+=31}
  g.fillStyle='#38383a';g.fillRect(14,y,sw-28,1);y+=16;
  /* review body */
  g.font=s1_FN(400,16);if(o.body){const bl=rfWrap(g,o.body,sw-30);bl.forEach((l,k)=>{g.fillStyle='#f2f2f7';g.fillText(l,14,y+k*21)});
    if(o.caret=='b'&&cBlink){const lw=g.measureText(bl[bl.length-1]).width;g.fillStyle='#0a84ff';g.fillRect(16+lw,y+(bl.length-1)*21-10,2,20)}}
  else{g.fillStyle='#636366';g.fillText('Review (Optional)',14,y);if(o.caret=='b'&&cBlink){g.fillStyle='#0a84ff';g.fillRect(14,y-10,2,20)}}
  /* keyboard */
  const ky=sh-138;g.fillStyle='#2c2c2e';g.fillRect(0,ky,sw,138);const rows=['qwertyuiop','asdfghjkl','zxcvbnm'],kw=(sw-12)/10;
  const hit=Math.floor((o.T||0)*9)%26,typing=o.caret&&o.keys;
  rows.forEach((r,j)=>{const x0=6+(10-r.length)*kw/2;for(let k=0;k<r.length;k++){const on=typing&&((j*10+k)*7)%26==hit;g.beginPath();g.roundRect(x0+k*kw+2,ky+8+j*32,kw-4,27,5);g.fillStyle=on?'#8e8e93':'#545458';g.fill();
    g.fillStyle='#fff';g.font=s1_FN(400,12.5);g.textAlign='center';g.fillText(r[k],x0+k*kw+kw/2,ky+22+j*32)}});
  g.beginPath();g.roundRect(sw/2-70,ky+104,140,24,5);g.fillStyle='#545458';g.fill();g.fillStyle='#fff';g.font=s1_FN(400,11);g.fillText('space',sw/2,ky+116);
  g.restore();g.restore()};
/* the body typed word by word, each word landing as it is spoken */
const BODY=RV[0][2],BW=BODY.split(' ');
const s1_typed=(p,W)=>{const seen={};let n=0;BW.forEach(wd=>{const q=wd.toLowerCase().replace(/[^a-z]/g,''),k=seen[q]||0;seen[q]=k+1;if(p>=W(q,k)-.08)n++});return n};
/* Apple / Google support line card, top-left x,y */
const s1_store=(g,x,y,w,name,lg,q,o={})=>{const pop=o.pop??1,a=o.a??1;if(pop<=0||a<=0)return;g.save();g.globalAlpha*=a;g.font=F({fs:18,i:1});const lines=rfWrap(g,q,w-96);const hh=Math.max(92,50+lines.length*24);
  g.translate(x+w/2,y+hh/2);g.scale(bk(cl(pop)),bk(cl(pop)));g.translate(-w/2,-hh/2);
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=18;g.shadowOffsetY=6;g.beginPath();g.roundRect(0,0,w,hh,14);g.fillStyle='rgba(16,26,48,.96)';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.8;g.strokeStyle=`rgba(${rfDESK},.85)`;g.stroke();logo(g,lg,42,hh/2,40);
  txt(g,80,22,name,{fs:13,w:700,m:1,c:'160,172,198',al:'left'});
  lines.forEach((l,k)=>txt(g,80,48+k*24,l,{fs:18,i:1,al:'left'}));
  if(o.hl){const ly=48+(lines.length-1)*24+13;g.font=F({fs:18,i:1});const lw=g.measureText(lines[lines.length-1]).width;
    g.strokeStyle=`rgba(${rfDESK},1)`;g.lineWidth=3;g.beginPath();g.moveTo(80,ly);g.lineTo(80+lw*cl(o.hl),ly);g.stroke()}
  g.restore();return hh};
const arrow=(g,x0,y0,x1,y1,c,q,bend=-120)=>{if(q<=0)return;const mx=(x0+x1)/2,my=Math.min(y0,y1)+bend,N=40;g.save();g.lineWidth=5;g.strokeStyle=`rgba(${c},.95)`;g.lineCap='round';
  g.shadowColor=`rgba(${c},.7)`;g.shadowBlur=10;g.beginPath();let px=x0,py=y0,lx=x0,ly=y0;for(let k=0;k<=N*q;k++){const u=k/N;lx=px;ly=py;px=(1-u)*(1-u)*x0+2*u*(1-u)*mx+u*u*x1;py=(1-u)*(1-u)*y0+2*u*(1-u)*my+u*u*y1;k?g.lineTo(px,py):g.moveTo(px,py)}g.stroke();
  const an=Math.atan2(py-ly,px-lx);g.translate(px,py);g.rotate(an);g.fillStyle=`rgba(${c},1)`;g.beginPath();g.moveTo(11,0);g.lineTo(-10,-10);g.lineTo(-10,10);g.closePath();g.fill();g.restore()};
/* a thin glowing leader from the 3D phone in his hand to the 2D phone */
const s1_lead=(g,x0,y0,x1,y1,a)=>{if(a<=0)return;g.save();g.globalAlpha*=a;g.setLineDash([5,7]);g.lineWidth=2;g.strokeStyle='rgba(150,170,255,.8)';g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
  g.setLineDash([]);g.fillStyle='rgba(150,170,255,1)';g.beginPath();g.arc(x0,y0,5,0,6.283);g.fill();g.restore()};
const PX=290,PY=352;
const src=(g,a=1)=>txt(g,60,560,'App Store reviews, US · 1 star',{fs:14,c:'160,172,198',a,al:'left'});
const HX=110,HY=300,HW=640,FAN=[[60,140,-.05],[420,128,.0],[790,146,.05]];
/* the review's flight: phone → out past Marko's window → over the street → the founder's monitor (cubic Bézier in world space) */
const s1_fly=(o,f)=>{const a=o.pt.phone(),d=o.pt.monitor(),b=[-2.5,2.3,-1.4],c=[1.6,3.0,-1.2],u=1-f;
  return a.map((v,k)=>u*u*u*v+3*u*u*f*b[k]+3*u*f*f*c[k]+f*f*f*d[k])};
/* unread messages that land beside the founder's monitor while he sleeps */
const NB=['Naplatili ste mi nakon što sam otkazao!','¿Por qué perdí Premium?','Warum wurde ich belastet?','I cancelled, why was I charged?'];
/* the persistent night overlay of the end of scene 1 (scene 2 draws the identical s2_hold): 02:00 chip, "the founder · asleep",
   Zzz off his head, the unread stack beside the monitor, "unanswered until morning". q values 0..1. */
const s1_hold=(g,o,T,q)=>{const[hx,hy]=X3.at(S1,o.pt.founderHead()),[mx,my]=X3.at(S1,o.pt.monitor()),A=q.a??1;if(A<=0)return;g.save();g.globalAlpha*=A;
  rfChip(g,1180,140,'02:00',{c:rfLUMG,fs:20,pop:q.clk});
  rfChip(g,Math.min(1080,hx+215),hy+12,'the founder · asleep',{c:rfDESK,fs:17,pop:q.asl});
  if(q.za>0)for(let k=0;k<3;k++){const ph=((T*.45+k/3)%1),zx=hx+60+ph*50+Math.sin(T*1.5+k)*6,zy=hy-20-ph*76;
    txt(g,zx,zy,'Z',{fs:20+ph*18,w:800,d:1,c:'190,205,255',a:q.za*Math.sin(ph*Math.PI)})}
  let y=Math.max(196,my-150);NB.forEach((s,k)=>{const pp=q.nb[k];if(pp<=0)return;y+=rfBub(g,Math.max(40,mx-560),y,480,s,{me:1,fs:18,pop:pp,maxW:1})+2});
  rfChip(g,Math.max(150,mx-330),y+28,'unanswered until morning',{c:rfRED,fs:18,pop:q.un,hot:q.uh||0});g.restore()};
return rfRun({base:(g,t,c,T,i,A2)=>{
  const KEYS=[[0,[-1.0,2.35,8.6, -4.4,1.15,-1.0]],[A2(0,'typing'),[-2.0,2.05,6.9, -5.15,1.0,-1.0]],[A2(1,'after'),[-2.3,1.75,5.3, -5.35,.95,-1.1]],
    [A2(2,'only'),[-2.35,1.7,5.0, -5.4,.95,-1.1]],[A2(3,'apple'),[-1.7,2.05,6.3, -3.4,1.25,-1.4]],[A2(3,'people'),[0.6,2.5,8.4, 0.8,1.4,-1.4]],
    [A2(3,'developer')+.6,[5.5,2.1,4.4, 4.0,1.15,-1.7]],[A2(4,'asleep'),[6.5,1.95,2.9, 3.95,1.13,-1.82]],[A2(4,'morning')+.2,E1]];
  const k=s1_cam(KEYS,t),wb=1-P(t,A2(4,'morning')-1.5,1.5)*0;
  const f0=A2(3,'apple')+.45,f1=A2(3,'developer')+.3,fl=P(t,f0,f1-f0),land=k2=>P(t,f0+k2*.22,f1-f0);
  const nLand=[fl,land(1),land(2),land(3)].filter(v=>v>=1).length;
  const nb=NB.map((s,j)=>P(t,A2(4,'small')-.2+j*.32,.35)),nUn=nb.filter(v=>v>=.5).length;
  const mon=P(t,A2(3,'apple'),1.2);
  X3.draw(g,S1,o=>{O=o;K3.look(o.camera,k[0]+Math.sin(T*.2)*.06,k[1]+Math.sin(T*.17)*.025,k[2],k[3],k[4],k[5]);
    rfNightPose(o,T,{litB:Math.max(.06,mon),litA:.62,fillA:1.1,fillB:.9*mon,phone:1,marko:{face:i==1&&t>A2(1,'charge')?'surprised':'neutral',look:-.1},
      founder:{pose:'type'},mon:{n:nLand+nUn,hot:0}});
    s1_sleep(o,T);s1_dark(o,mon);s1_clock2(o);
    const wa=A2(4,'asleep');
    rfBag(o.bag,T,{rings:i==3&&t>A2(3,'developer')&&t<A2(3,'developer')+1.3?1:0,
      sq:i==0?.1*P(t,A2(0,'onestar'),.25)*(1-P(t,A2(0,'onestar')+.6,.3)):0,
      tilt:i==2?.16*P(t,A2(2,'far'),.3)*(1-P(t,A2(2,'far')+1.4,.4)):i==4?-.16*P(t,wa,.3)*(1-P(t,wa+1.4,.4)):0,
      sleep:i==4&&t>wa+.2&&t<wa+1.6?1:0})},t);
  if(!O)return;const o=O;
  /* 02:00 chip: top-left from "two" on, for the whole opening */
  const clk=P(t,A2(0,'two')-.15,.35);
  /* beats 2-3: the published review (hero) and the fan live in `base` so they never double up in a beat cross-fade.
     beat 3: the fan tucks in behind the hero, then the stack lifts off and flies along the 3D path, shrinking, onto the monitor */
  if(i>=2&&i<=4){const hh0=s1_rev(g,0,-999,HW,RV[0],{fs:24,a:1e-6})||170,hcx=HX+HW/2,hcy=HY+hh0/2,wf=A2(2,'far'),col=i>=3?sm(P(t,c(3)-.1,.6)):0;
    const draw=(k,f,cx,cy,r,a,hot,pop)=>{if(f>=1||a<=0)return;let x=cx,y=cy,sc=1;
      const s0=L(1,.62,col);sc=s0;x=L(cx,hcx+(cx-hcx)*.62,col);y=L(cy,hcy-40+(cy-hcy)*.62,col);
      if(f>0){const[px,py]=X3.at(S1,s1_fly(o,f)),e=sm(cl(f/.3)),bx=x,by=y;x=L(bx,px,e);y=L(by,py,e);sc=L(s0,k?.22:.3,sm(cl(f/.4)))*(1-.6*P(f,.86,.14));r*=1-e;a*=1-P(f,.9,.1)}
      const w=k?330:HW;g.save();g.translate(x,y);g.rotate(r);g.scale(sc,sc);g.globalAlpha*=a;s1_rev(g,-w/2,k?-55:-hh0/2,w,RV[k],{fs:k?14:24,hot,pop});g.restore()};
    for(let k2=3;k2>=1;k2--){const q=P(t,wf-.15+(k2-1)*.18,.55);if(q<=0)continue;const e=sm(q),[fx,fy,fr]=FAN[k2-1];
      const sx=L(hcx-150+165,fx+165,e),sy=L(hcy-60+55,fy+55,e),tx=hcx+(k2-2)*26,ty=hcy-hh0/2-6-k2*9+55;
      draw(k2,land(k2),L(sx,tx,col),L(sy,ty,col),fr*e*(1-col)+(k2-2)*.03*col,Math.min(1,q*2)*.96,0,1)}
    draw(0,fl,hcx,hcy,0,1,P(t,A2(2,'real'),.3)*(1-P(t,A2(2,'review')+.7,.4)),P(t,A2(2,'real')-.25,.45))}
  if(i>=3&&i<=4){
    /* the signposts ride along the path, anchored in the world between the two rooms */
    const sg=(wp,name,lg,q,pp,hl)=>{if(pp<=0)return;const[sx,sy]=X3.at(S1,wp),[gx,gy]=X3.at(S1,[wp[0],-.3,wp[2]]);
      g.save();g.globalAlpha*=cl(pp*2);g.strokeStyle='rgba(120,135,170,.9)';g.lineWidth=4;g.beginPath();g.moveTo(sx,sy);g.lineTo(gx,L(sy,gy,cl(pp)));g.stroke();g.restore();
      g.save();g.translate(sx,sy);g.scale(.74,.74);s1_store(g,-230,-110,460,name,lg,q,{pop:pp,hl});g.restore()};
    const so=1-P(t,A2(4,'small'),.6);
    if(so>0){g.save();g.globalAlpha*=so;
      sg([-1.1,1.35,1.2],'APPLE SUPPORT','apple','“If you were charged for the purchase and you still can’t restore it, contact the app developer for support.”',P(t,A2(3,'apple')-.2,.45),P(t,A2(3,'send')-.1,.6));
      sg([1.5,1.35,1.0],'GOOGLE PLAY HELP','google','“You should contact the app developer if…”',P(t,A2(3,'google')-.1,.45),P(t,A2(3,'every'),.6));
      g.restore()}
    const[mx,my]=X3.at(S1,o.pt.monitor());
    rfChip(g,Math.max(160,mx-250),Math.max(150,my-30),'→ the app’s developer',{c:rfDESK,fs:18,a:1-P(t,A2(4,'small')-.1,.4),pop:P(t,A2(3,'developer')-.15,.35),hot:P(t,A2(3,'developer'),.3)*(1-P(t,A2(3,'developer')+.9,.4))})}
  s1_hold(g,o,T,{clk,asl:P(t,A2(4,'asleep')-.15,.35),za:P(t,A2(4,'asleep')-.1,.5),nb,un:P(t,A2(4,'answer')-.1,.35),uh:P(t,A2(4,'waits'),.3)*(1-P(t,A2(4,'morning')+.6,.4))})},
 b:[
  (g,p,d,T,W)=>{const pp=P(p,W('somebody')-.3,.45),t0=W('typing')-.1,t1=W('review')+.45,tq=cl((p-t0)/(t1-t0)),title=RV[0][5];
    if(O){const[x,y]=X3.at(S1,O.pt.phone());s1_lead(g,x,y,PX+140,PY,pp*.9)}
    s1_asPhone(g,PX,PY,{s:.93,pop:pp,stars:P(p,W('onestar')-.05,.35),title:title.slice(0,Math.round(tq*title.length)),caret:tq<1?'t':'b',keys:tq>0&&tq<1,T});
    txt(g,PX,PY+246,'App Store · writing a review',{fs:14,c:'176,188,214',a:pp})},
  (g,p,d,T,W)=>{const n=s1_typed(p,W),done=n>=BW.length,sendAt=W('after')+.55;
    if(O){const[x,y]=X3.at(S1,O.pt.phone());s1_lead(g,x,y,PX+140,PY,.9)}
    s1_asPhone(g,PX,PY,{s:.93,stars:1,title:RV[0][5],body:BW.slice(0,n).join(' '),caret:'b',keys:!done,send:n>0?1:0,press:P(p,sendAt,.3)*(1-P(p,sendAt+.5,.3)),T});
    txt(g,PX,PY+246,'App Store · writing a review',{fs:14,c:'176,188,214'});
    rfChip(g,560,470,'cancelled · still charged',{c:rfRED,fs:16,pop:P(p,W('charge')-.1,.35)})},
  (g,p,d,T,W)=>{const out=P(p,0,.35);
    s1_asPhone(g,PX,PY,{stars:1,title:RV[0][5],body:BODY,send:1,a:1-out,s:L(.93,.8,out),T});
    const hh=170;
    rfChip(g,HX+HW-88,HY-22,'from this week',{c:rfLUMG,fs:16,pop:P(p,W('week')-.12,.35)});
    rfChip(g,HX+HW-130,HY+(hh||170)+24,'and far from the only one',{c:rfRED,fs:15,pop:P(p,W('only')-.1,.35)});
    src(g,P(p,W('far')+.3,.5))},
  (g,p,d,T,W)=>{src(g,1-P(p,.2,.5))},
  (g,p,d,T,W)=>{}
 ]},5)})()
