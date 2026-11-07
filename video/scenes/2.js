/* Scene 2 — A real problem (demo, rev 3). The SAME night, the same camera: scene 2's first frame is scene 1's last
   (camera E1 on the sleeping founder, dark room, monitor glow, unread stack, Zzz); the 1>2 bridge is a plain cut.
   The founder sleeps through the whole scene; the room stays dark, only the monitor glow slowly brightens.
   beats: 0 the unread stack fades; the camera eases toward the monitor and an Apple Developer Forums thread card grows out of it
            ("Developers: in-app purchases breaking", thread 31363), views rolling up to 97k, 45 replies
          · 1 camera eases back; the RevenueCat card (real logo + ginger cat) + "PROOF THE PROBLEM IS REAL"; then the card dims and
            "a human still reads every ticket" — an inbox pile beside the sleeping founder, "…and writes every answer"
          · 2 camera rises over the office; 3D piles 125 / 58 / 50 on the floor, labelled; "Lumen's own data · 5,000 users"; calm end */
(()=>{
const S2=rfNight();let O=null;
const s2_cam=(K,t)=>{const n=K.length;if(t<=K[0][0])return K[0][1].slice();if(t>=K[n-1][0])return K[n-1][1].slice();let k=0;while(t>K[k+1][0])k++;
  const[t0,a]=K[k],[t1,b]=K[k+1],h=t1-t0,u=(t-t0)/h,tan=j=>j<=0||j>=n-1?K[j][1].map(()=>0):K[j][1].map((v,q)=>(K[j+1][1][q]-K[j-1][1][q])/(K[j+1][0]-K[j-1][0])),ma=tan(k),mb=tan(k+1);
  const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;return a.map((v,q)=>h00*v+h10*h*ma[q]+h01*b[q]+h11*h*mb[q])};
const s2_sleep=(o,T)=>{const f=o.founder,b=f.userData.bones||{};f.userData.pose(T,{pose:'type',w:1,blink:1,look:0,face:'neutral',hand:1});
  const br=Math.sin(T*1.3)*.02;if(b.spine)b.spine.rotateX(-.16+br);if(b.chest)b.chest.rotateX(-.1+br);if(b.head){b.head.rotateX(-.12);b.head.rotateZ(.5)}
  PLACE3.atDesk(f,o.desk,o.chair)};
/* lights off in the founder's room: only the monitor's own glow (m). The desk lamp stays off for the whole opening. */
const s2_lamp=(o,on)=>o.dl.traverse(m=>{if(m===o.dl)return;if(m.isLight){m.userData.i0??=m.intensity;m.intensity=on?m.userData.i0:0}
  else if(m.material&&(m.material.transparent||m.material.isMeshBasicMaterial))m.visible=!!on});
const s2_dark=(o,m)=>{o.lightB.intensity=.35*m;o.lampHalo.material.opacity=0;o.monHalo.material.opacity=.38*m;s2_lamp(o,0)};
const s2_clock2=o=>{o.hHand.rotation.z=-(2/12)*Math.PI*2;o.mHand.rotation.z=0};
const NB2=['Naplatili ste mi nakon što sam otkazao!','¿Por qué perdí Premium?','Warum wurde ich belastet?','I cancelled, why was I charged?'];
/* the persistent night overlay of the end of scene 1 (scene 2 draws the identical s2_hold): 02:00 chip, "the founder · asleep",
   Zzz off his head, the unread stack beside the monitor, "unanswered until morning". q values 0..1. */
const s2_hold=(g,o,T,q)=>{const[hx,hy]=X3.at(S2,o.pt.founderHead()),[mx,my]=X3.at(S2,o.pt.monitor()),A=q.a??1;if(A<=0)return;g.save();g.globalAlpha*=A;
  rfChip(g,1180,140,'02:00',{c:rfLUMG,fs:20,pop:q.clk});
  const F=q.f??1;g.save();g.globalAlpha*=F;rfChip(g,Math.min(1080,hx+215),hy+12,'the founder · asleep',{c:rfDESK,fs:17,pop:q.asl});g.restore();
  if(q.za>0)for(let k=0;k<3;k++){const ph=((T*.45+k/3)%1),zx=hx+60+ph*50+Math.sin(T*1.5+k)*6,zy=hy-20-ph*76;
    txt(g,zx,zy,'Z',{fs:20+ph*18,w:800,d:1,c:'190,205,255',a:q.za*Math.sin(ph*Math.PI)})}
  g.save();g.globalAlpha*=F;let y=Math.max(196,my-150);NB2.forEach((s,k)=>{const pp=q.nb[k];if(pp<=0)return;y+=rfBub(g,Math.max(40,mx-560),y,480,s,{me:1,fs:18,pop:pp,maxW:1})+2});
  rfChip(g,Math.max(150,mx-330),y+28,'unanswered until morning',{c:rfRED,fs:18,pop:q.un,hot:q.uh||0});g.restore();g.restore()};
const E1=[6.9,1.9,2.3, 3.95,1.13,-1.85];   /* = scene 1's end frame */
const band=0;
const RC=[['chat','Customer Center','an in-app support menu · its form emails your inbox'],
  ['users','Zendesk / Intercom sidebars','subscription info next to each ticket'],
  ['robot','Rico','AI that helps the team']];
/* the Apple Developer Forums thread card, centred at cx,cy */
const s2_forum=(g,cx,cy,o={})=>{const pop=o.pop??1;if(pop<=0)return;const w=560,h=262;g.save();g.translate(cx,cy);const sc=bk(cl(pop));g.scale(sc,sc);g.translate(-w/2,-h/2);
  g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=24;g.shadowOffsetY=8;g.beginPath();g.roundRect(0,0,w,h,14);g.fillStyle='rgba(16,26,48,.97)';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.8;g.strokeStyle='rgba(160,180,220,.6)';g.stroke();
  logo(g,'apple',34,32,30);txt(g,58,26,'Apple Developer Forums',{fs:17,w:700,al:'left'});
  txt(g,58,46,'developer.apple.com/forums · thread 31363',{fs:12.5,m:1,c:'150,165,195',al:'left'});
  g.fillStyle='rgba(160,180,220,.2)';g.fillRect(18,64,w-36,1);
  txt(g,22,92,'Developers: in-app purchases breaking',{fs:25,w:800,al:'left'});
  g.font=F({fs:16.5,i:1});const ql=rfWrap(g,'“IAP has been working up until 3 days ago and all of a sudden this error keeps popping up”',w-44);
  ql.forEach((l,k)=>txt(g,22,126+k*23,l,{fs:16.5,i:1,c:'214,222,240',al:'left'}));
  const vy=h-40,vn=o.views||0;g.globalAlpha*=o.va??1;txt(g,22,vy,vn+'k',{fs:46,w:800,m:1,c:rfDESK,al:'left',glow:o.hot?14*o.hot:0});
  g.font=F({fs:46,w:800,m:1});const nw=g.measureText(vn+'k').width;txt(g,30+nw,vy+8,'views',{fs:20,w:700,c:rfDESK,al:'left'});
  if(o.rep>0)rfChip(g,w-80,vy+4,'45 replies',{c:'160,172,198',fs:15,pop:o.rep});g.restore()};
return rfRun({base:(g,t,c,T,i,A2)=>{
  const KEYS=[[0,E1],[A2(0,'forum'),[6.25,1.8,1.85, 3.8,1.15,-1.92]],[A2(0,'views')+.6,[6.05,1.8,1.6, 3.8,1.15,-1.95]],
    [A2(1,'built'),[5.5,2.3,5.0, 2.95,1.0,-1.5]],[A2(1,'answer')+.3,[5.35,2.35,5.3, 3.0,1.0,-1.45]],
    [A2(2,'hundred'),[4.2,3.1,5.4, 4.2,.45,-.9]],[A2(2,'error')+.8,[4.25,3.15,5.65, 4.2,.45,-.95]]];
  const k=s2_cam(KEYS,t),wake=.5*P(t,A2(0,'forum'),2.5)+.3*P(t,A2(2,'data'),2.5);
  const n=8+Math.round(4*P(t,A2(1,'every'),1.6));
  const piles=[P(t,A2(2,'hundred')-.3,1.2),P(t,A2(2,'refunded')-.7,1),P(t,A2(2,'billing')-.7,1)];
  X3.draw(g,S2,o=>{O=o;K3.look(o.camera,k[0]+Math.sin(T*.2)*.06,k[1]+Math.sin(T*.17)*.025,k[2],k[3],k[4],k[5]);
    rfNightPose(o,T,{litB:1,litA:.62,fillA:1.1,fillB:.9,phone:1,marko:{face:'neutral',look:-.1},founder:{pose:'type'},mon:{n,hot:0},piles});
    s2_sleep(o,T);s2_dark(o,1+wake);s2_clock2(o);
    rfBag(o.bag,T,{rings:i==2&&t>A2(2,'billing')&&t<A2(2,'billing')+1.3?1:0,sq:i==0?.1*P(t,A2(0,'thousand'),.25)*(1-P(t,A2(0,'thousand')+.6,.3)):0,
      tilt:i==1?.16*P(t,A2(1,'human'),.3)*(1-P(t,A2(1,'human')+1.4,.4)):0})},t);
  if(!O)return;
  s2_hold(g,O,T,{clk:1,asl:1,za:1,nb:[1,1,1,1],un:1,uh:0,f:1-P(t,.25,.9)})},
 b:[
  (g,p,d,T,W)=>{if(!O)return;const[mx,my]=X3.at(S2,O.pt.monitor()),pp=P(p,W('forum')-.25,.5),cx=360,cy=300;
    if(pp>0){g.save();g.globalAlpha*=pp;g.setLineDash([5,7]);g.lineWidth=2;g.strokeStyle='rgba(150,170,255,.8)';g.beginPath();g.moveTo(mx,my);g.lineTo(cx+280*bk(cl(pp)),cy);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(150,170,255,1)';g.beginPath();g.arc(mx,my,5,0,6.283);g.fill();g.restore()}
    const v0=W('ninetyseven')-.25,v1=W('views')+.1;
    s2_forum(g,L(mx,cx,sm(pp)),L(my,cy,sm(pp)),{pop:pp,views:Math.round(97*sm(P(p,v0,v1-v0))),hot:P(p,v1,.3)*(1-P(p,v1+1,.4)),rep:P(p,v1+.15,.35),va:P(p,v0-.3,.3)});
    rfChip(g,360,476,'developers feel it too',{c:rfDESK,fs:16,pop:P(p,W('developers')-.1,.35)})},
  (g,p,d,T,W)=>{const a=P(p,W('revenuecat')-.25,.45),dim=1-.45*P(p,W('human')-.1,.5);
    g.save();g.globalAlpha*=dim;
    rfCard(g,48,136,500,330,{title:'REVENUECAT ALREADY SHIPS',c:'242,92,98',pop:a,body:(g,x,y,w,h)=>{
      RC.forEach(([icn,t1,t2],k)=>{const yy=y+46+k*86,ra=P(p,W('support')-.2+k*.3,.35);if(ra<=0)return;g.save();g.globalAlpha*=ra;
        g.beginPath();g.arc(48,yy,24,0,6.283);g.fillStyle='rgba(242,92,98,.18)';g.fill();ic(g,icn,48,yy,14,'242,120,124');
        txt(g,88,yy-12,t1,{fs:22,w:700,al:'left'});txt(g,88,yy+16,t2,{fs:15,c:'176,188,214',al:'left'});g.restore()})}});
    rfRCLogo(g,48+500-56,136+6,46,a);rfCat(g,170,138,86,T,a,{c:'#d98a4a',hi:'#f0a868',eye:'#2a1c10'});
    rfStamp(g,420,470,'PROOF THE PROBLEM IS REAL',{p:P(p,W('this')-.05,.35),c:rfGO,fs:26,r:-.08});g.restore();
    if(!O)return;const[hx,hy]=X3.at(S2,O.pt.founderHead()),ph=P(p,W('human')-.2,.4);
    rfChip(g,Math.min(1000,hx+40),Math.max(150,hy-150),'a human still reads every ticket',{c:rfDESK,fs:19,pop:ph,hot:P(p,W('reads'),.3)*(1-P(p,W('reads')+.9,.4))});
    rfChip(g,Math.min(1000,hx+40),Math.max(150,hy-150)+48,'…and writes every answer',{c:rfLUMG,fs:17,pop:P(p,W('writes')-.15,.35)});
    rfTicketStack(g,Math.min(1030,hx+215),452,{n:8,f:P(p,W('human')-.4,1.6),num:'inbox',label:'read by hand, one by one',c:rfDESK,T,w:112,fs:26,lfs:14,pop:P(p,W('human')-.5,.3)})},
  (g,p,d,T,W)=>{if(!O)return;const L3=[['125','cancelled, still paid up',rfDESK,'hundred'],['58','refunded',rfRED,'refunded'],['50','lost premium to a billing error',rfKEEP,'billing']];
    L3.forEach(([n,l,c,wd],k)=>{const[x,y]=X3.at(S2,O.pt.pile(k)),pp=P(p,W(wd)-(k?.6:.3),.4);rfStat(g,x,Math.max(180,y-85),n,l,{c,w:k==2?250:210,h:110,fs:42,lfs:k==2?14:15,pop:pp})});
    rfChip(g,330,150,"Lumen's own data · 5,000 users",{c:rfLUMG,fs:17,pop:P(p,W('data')-.15,.35)})}
 ]},3)})()
