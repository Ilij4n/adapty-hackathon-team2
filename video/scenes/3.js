/* Scene 3 — "Case Desk" (demo). Builder: scenes 3–4. One LP3 stage (studio mood, amber Case Desk light), a line read
   left to right: the Lumen Help phone (drawn after the real app: light screen, "Lumen Help" header + profile pill, the
   "What we found on your account" card, blue user bubble, chips, "Describe the problem…" input) → the Adapty profile panel
   → the plain-code machine that stamps facts → the Claude booth (orange kiosk, Claude mark + "Claude" front panel) → the
   checker gate (a fact without a stamp bounces off, red) → the developer console (light, "WAITING FOR APPROVAL" card with
   Approve / Deny / Open case), which a "PREMIUM? → request" envelope flies to. Bagley presents from camera space.
   beats (rev 2): 0 title "Case Desk" (wide), then push in on the phone: the app's own help screen, user writes, any language ·
          1 profile → plain code → Claude writes the words · 2 checker bounces the unstamped fact; premium = request → Approve */
(()=>{
if(typeof LOGO3!=='undefined'&&LOGO3.warm)LOGO3.warm(['claude']);
const s3_E=(a,b,x)=>sm(cl((x-a)/(b-a)));
function s3_pop(o,a,s=1){o.visible=a>0.001;o.scale.setScalar(Math.max(1e-3,bk(cl(a))*s))}
function s3_lab(K,s,text,edge,fs=26){const m=K.label(text,{fs,bg:NV,edge,w:700});m.material.depthTest=false;m.renderOrder=9;s.add(m);return m}
const s3_BZ=.55,s3_BY=.62;
const s3_X0=-4.3,s3_X1=4.4;

/* ---- the Lumen Help screen, redrawn after the real app (docs/screens/help-start-390.png, 03-serbian-cyrillic-after.png).
   Paints a W x H box in design units dw wide (smaller dw = bigger layout). o = {dw, who, card (0..1 alpha), greet (0..1),
   msgs:[{me,text,a}], typing, input (typed text), focus, chips:[..], T} */
const s3_FNT=(w,fs)=>`${w} ${fs}px "IBM Plex Sans",sans-serif`;
function s3_lh(x,W,H,o={}){const dw=o.dw||300,u=W/dw,w=dw,h=H/u;x.save();x.scale(u,u);x.textBaseline='middle';
  x.fillStyle='#f3f4f7';x.fillRect(0,0,w,h);
  /* header */
  x.fillStyle='#ffffff';x.fillRect(0,0,w,50);x.fillStyle='#e2e5ea';x.fillRect(0,50,w,1);
  x.fillStyle='#1c2230';x.beginPath();x.roundRect(10,11,28,28,7);x.fill();x.lineWidth=2.6;
  x.strokeStyle='#f08a4b';x.beginPath();x.arc(24,25,7.5,-2.6,.6);x.stroke();x.strokeStyle='#5b86f2';x.beginPath();x.arc(24,25,7.5,.8,3.4);x.stroke();
  x.fillStyle='#ffffff';x.beginPath();x.arc(24,25,2.6,0,6.283);x.fill();
  x.textAlign='left';x.fillStyle='#121826';x.font=s3_FNT(700,15);x.fillText('Lumen Help',46,20);x.fillStyle='#6b7280';x.font=s3_FNT(400,11);x.fillText('Subscription',46,36);
  x.font=s3_FNT(600,11);const who=o.who||'Marko · 00009',pw=x.measureText(who).width+30;x.beginPath();x.roundRect(w-10-pw,13,pw,24,12);x.fillStyle='#eef0f4';x.fill();x.strokeStyle='#d5d9e1';x.lineWidth=1;x.stroke();
  x.fillStyle='#1f2430';x.fillText(who,w-pw,25.5);x.beginPath();x.moveTo(w-24,23);x.lineTo(w-17,23);x.lineTo(w-20.5,27.5);x.closePath();x.fill();
  /* status card */
  let top=60;const ca=o.card??1;if(ca>0){x.save();x.globalAlpha*=ca;const cw=w-20,cx=10,cy=60,col=(cw-24)/2;
    const rows=[[['Package','Lumen Pro Annual (AI Studio)'],['Bought on','App Store']],[['Price','66.99 EUR'],['Access until','13 Jul 2027']],[['Cancelled','23 Sep 2026'],null]];
    x.font=s3_FNT(600,12);const rh=rows.map(r=>Math.max(...r.filter(Boolean).map(([k,v])=>rfWrap(x,v,col-4).length))*15+16);const chh=58+rh.reduce((s,a)=>s+a,0)+4;
    x.shadowColor='rgba(20,30,60,.08)';x.shadowBlur=6;x.shadowOffsetY=1;x.beginPath();x.roundRect(cx,cy,cw,chh,10);x.fillStyle='#ffffff';x.fill();x.shadowColor='transparent';x.strokeStyle='#e2e5ea';x.stroke();
    x.fillStyle='#6b7280';x.font=s3_FNT(600,9);x.letterSpacing='1px';x.fillText('WHAT WE FOUND ON YOUR ACCOUNT',cx+12,cy+15);x.letterSpacing='0px';
    x.font=s3_FNT(600,10);const st='Cancelled — active until end of period',sw=x.measureText(st).width+24;x.beginPath();x.roundRect(cx+12,cy+26,sw,19,9.5);x.fillStyle='#e9ebf0';x.fill();
    x.fillStyle='#374151';x.beginPath();x.arc(cx+20,cy+35.5,2.2,0,6.283);x.fill();x.fillText(st,cx+27,cy+36);
    let yy=cy+56;rows.forEach((r,j)=>{r.forEach((c,k)=>{if(!c)return;const xx=cx+12+k*(col+4);x.fillStyle='#6b7280';x.font=s3_FNT(400,9.5);x.fillText(c[0],xx,yy+5);
      x.fillStyle='#111827';x.font=s3_FNT(600,12);rfWrap(x,c[1],col-4).forEach((l,n)=>x.fillText(l,xx,yy+19+n*15))});yy+=rh[j]});
    x.restore();top=cy+chh*ca+10}
  /* bottom: chips + input */
  const chipY=h-90,inY=h-50;x.fillStyle='#f6f7f9';x.fillRect(0,chipY-12,w,h-chipY+12);x.fillStyle='#e2e5ea';x.fillRect(0,chipY-12,w,1);
  let cxp=10;x.font=s3_FNT(500,10.5);for(const c of(o.chips||['Charged after cancelling','I paid but have no premium'])){const cw=x.measureText(c).width+22;x.beginPath();x.roundRect(cxp,chipY,cw,26,13);x.fillStyle='#eceef2';x.fill();x.strokeStyle='#d8dbe2';x.stroke();
    x.fillStyle='#1f2430';x.fillText(c,cxp+11,chipY+13.5);cxp+=cw+6}
  x.beginPath();x.roundRect(10,inY,w-60,36,18);x.fillStyle='#ffffff';x.fill();x.lineWidth=o.focus?1.6:1;x.strokeStyle=o.focus?'#2f5be7':'#d8dbe2';x.stroke();
  x.save();x.beginPath();x.rect(12,inY,w-66,36);x.clip();x.font=s3_FNT(400,12);
  if(o.input){const tw=x.measureText(o.input).width,ox=Math.min(0,w-82-tw);x.fillStyle='#1f2430';x.fillText(o.input,22+ox,inY+18.5);if(((o.T||0)*2|0)%2==0){x.fillStyle='#2f5be7';x.fillRect(23+ox+tw,inY+10,1.4,17)}}
  else{x.fillStyle='#9aa1ad';x.fillText('Describe the problem…',22,inY+18.5)}x.restore();
  x.fillStyle='#2f5be7';x.beginPath();x.arc(w-28,inY+18,17,0,6.283);x.fill();x.strokeStyle='#ffffff';x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(w-35,inY+18);x.lineTo(w-21,inY+18);x.moveTo(w-27,inY+12);x.lineTo(w-21,inY+18);x.lineTo(w-27,inY+24);x.stroke();
  /* chat area: greeting (empty chat) or bubbles, newest kept in view */
  const bot=chipY-18;x.save();x.beginPath();x.rect(0,top-4,w,bot-top+4);x.clip();
  const ga=o.greet??0;if(ga>0){x.globalAlpha=ga;x.fillStyle='#121826';x.font=s3_FNT(700,17);x.fillText('Hi! What’s going on',12,top+16);x.fillText('with your subscription?',12,top+37);
    x.fillStyle='#4b5563';x.font=s3_FNT(400,11);rfWrap(x,'I can see your Lumen purchases, so I can tell you exactly what’s true — and what the next step is. Write in any language.',w-30).forEach((l,n)=>x.fillText(l,12,top+60+n*16));x.globalAlpha=1}
  const fs=o.fs||12.5,lh=fs*1.32,ms=(o.msgs||[]).filter(m=>(m.a??1)>0),mw=(w-20)*.8;
  const lay=ms.map(m=>{x.font=s3_FNT(m.me?500:400,fs);const L1=rfWrap(x,m.text,mw-20);return{m,L1,bw:Math.min(mw,Math.max(...L1.map(l=>x.measureText(l).width))+20),bh:L1.length*lh+14}});
  const tot=lay.reduce((s,q)=>s+q.bh+8,0)+(o.typing?36:0);let y=top+4-Math.max(0,tot-(bot-top-4));
  for(const q of lay){x.save();x.globalAlpha*=q.m.a??1;const bx=q.m.me?w-10-q.bw:10;x.beginPath();x.roundRect(bx,y,q.bw,q.bh,12);x.fillStyle=q.m.me?'#2f5be7':'#ffffff';x.fill();if(!q.m.me){x.strokeStyle='#dfe2e8';x.lineWidth=1;x.stroke()}
    x.fillStyle=q.m.me?'#ffffff':'#1f2430';x.font=s3_FNT(q.m.me?500:400,fs);q.L1.forEach((l,n)=>x.fillText(l,bx+10,y+7+lh/2+n*lh));x.restore();y+=q.bh+8}
  if(o.typing){x.beginPath();x.roundRect(10,y,54,28,12);x.fillStyle='#ffffff';x.fill();x.strokeStyle='#dfe2e8';x.stroke();
    for(let k=0;k<3;k++){x.fillStyle=`rgba(107,114,128,${.35+.65*Math.max(0,Math.sin((o.T||0)*6-k*.9))})`;x.beginPath();x.arc(24+k*13,y+14,3.4,0,6.283);x.fill()}}
  x.restore();x.restore()}

/* ---- the Adapty profile panel (Marko's real profile, FACTS) */
function s3_profile(x,W,H){x.fillStyle='#0f1a34';x.fillRect(0,0,W,H);x.fillStyle='rgba(255,168,76,.22)';x.fillRect(0,0,W,H*.2);
  x.fillStyle='#ffa84c';x.textAlign='left';x.textBaseline='middle';x.font=`700 ${H*.09}px "IBM Plex Mono",monospace`;x.fillText('ADAPTY PROFILE',W*.05,H*.1);
  x.fillStyle='#c9d2ee';x.font=`600 ${H*.075}px "IBM Plex Mono",monospace`;x.textAlign='right';x.fillText('u00009',W*.95,H*.1);
  const rows=[['plan','Lumen Pro Annual'],['last charge','13 Jul 2026'],['renewal','off · 23 Sep 2026'],['access until','13 Jul 2027']];
  rows.forEach(([a,b],i)=>{const y=H*(.33+i*.17);x.fillStyle=i%2?'rgba(255,255,255,0)':'rgba(255,255,255,.05)';x.fillRect(W*.03,y-H*.075,W*.94,H*.15);
    x.textAlign='left';x.fillStyle='#8fa3c8';x.font=`500 ${H*.07}px "IBM Plex Sans",sans-serif`;x.fillText(a,W*.06,y);
    x.textAlign='right';x.fillStyle='#eef3fa';x.font=`700 ${H*.075}px "IBM Plex Sans",sans-serif`;x.fillText(b,W*.95,y)})}

/* ---- the code machine's front screen */
function s3_code(x,W,H){x.fillStyle='#0b1328';x.fillRect(0,0,W,H);x.fillStyle='#7ce3c6';x.textAlign='center';x.textBaseline='middle';x.font=`800 ${H*.2}px "IBM Plex Mono",monospace`;x.fillText('{ plain code }',W/2,H*.18);
  const cs=['#7ce3c6','#a9b6ff','#ffd678','#eef3fa'];for(let i=0;i<5;i++){let xx=W*(.1+(i%3)*.05);for(let j=0;j<3;j++){const w=W*(.08+LP3.hash(i*5+j)*.18);x.fillStyle=cs[(i+j)%4];x.globalAlpha=.75;x.fillRect(xx,H*(.38+i*.12),w,H*.05);xx+=w+W*.03}}x.globalAlpha=1}

/* ---- the Claude booth's front panel: the mark (a sunburst in Claude orange) + "Claude" + "writes the words" */
function s3_claudeFace(x,W,H){x.fillStyle='#f5ece4';x.fillRect(0,0,W,H);x.strokeStyle='#d97757';x.lineWidth=10;x.strokeRect(5,5,W-10,H-10);
  const cx=W*.22,cy=H*.5,r=H*.3;x.strokeStyle='#d97757';x.lineCap='round';x.lineWidth=H*.07;for(let k=0;k<12;k++){const a=k/12*6.283+.13,r0=r*(.25+.12*(k%2));x.beginPath();x.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke()}
  x.fillStyle='#2b2118';x.textAlign='left';x.textBaseline='middle';x.font=`700 ${H*.34}px "IBM Plex Serif",Georgia,serif`;x.fillText('Claude',W*.42,H*.42);
  x.fillStyle='#8a5a3f';x.font=`600 ${H*.15}px "IBM Plex Sans",sans-serif`;x.fillText('writes the words',W*.43,H*.75)}

/* ---- the developer console, light, after console-pending-1280.png. k: 0 waiting, 1 Approve hot */
function s3_console(x,W,H,k){x.fillStyle='#f3f4f7';x.fillRect(0,0,W,H);x.fillStyle='#ffffff';x.fillRect(0,0,W,H*.15);x.fillStyle='#e2e5ea';x.fillRect(0,H*.15,W,2);
  x.textAlign='left';x.textBaseline='middle';x.fillStyle='#121826';x.font=`700 ${H*.075}px "IBM Plex Sans",sans-serif`;x.fillText('Case Desk',W*.04,H*.075);
  x.fillStyle='#6b7280';x.font=`400 ${H*.055}px "IBM Plex Sans",sans-serif`;x.fillText('for Lumen',W*.27,H*.078);
  x.fillStyle='#374151';x.font=`700 ${H*.05}px "IBM Plex Sans",sans-serif`;x.fillText('WAITING FOR APPROVAL',W*.04,H*.25);
  x.fillStyle='#ffffff';x.beginPath();x.roundRect(W*.04,H*.32,W*.92,H*.56,H*.04);x.fill();x.lineWidth=4;x.strokeStyle='#b8862e';x.stroke();
  x.fillStyle='#111827';x.font=`700 ${H*.06}px "IBM Plex Mono",monospace`;x.fillText('premium request',W*.08,H*.42);
  x.fillStyle='#374151';x.font=`400 ${H*.058}px "IBM Plex Sans",sans-serif`;x.fillText('a person decides',W*.08,H*.54);
  x.fillStyle=k?'#14a36c':'#16784f';x.beginPath();x.roundRect(W*.08,H*.63,W*.27,H*.16,H*.08);x.fill();x.fillStyle='#ffffff';x.textAlign='center';x.font=`700 ${H*.065}px "IBM Plex Sans",sans-serif`;x.fillText('Approve',W*.215,H*.712);
  x.strokeStyle='#d8dbe2';x.lineWidth=3;x.fillStyle='#1f2430';x.beginPath();x.roundRect(W*.38,H*.63,W*.2,H*.16,H*.08);x.stroke();x.fillText('Deny',W*.48,H*.712);
  x.beginPath();x.roundRect(W*.61,H*.63,W*.3,H*.16,H*.08);x.stroke();x.fillText('Open case',W*.76,H*.712)}

const s3_cubeTex=(ok)=>PROPS3.tex(128,128,(x,W,H)=>{x.fillStyle=ok?'#e8fff6':'#ffe3e6';x.fillRect(0,0,W,H);x.strokeStyle=ok?'#3fae8c':'#d9465a';x.lineWidth=10;x.strokeRect(8,8,W-16,H-16);
  x.fillStyle=ok?'#3fae8c':'#d9465a';x.textAlign='center';x.textBaseline='middle';x.font='900 84px "IBM Plex Sans",sans-serif';x.fillText(ok?'✓':'?',W/2,H/2+4)});

const S3=X3.stage('s3-desk',K=>{const s=K.scene({fov:35}),lp=LP3.world(K,s,{mood:'studio',clouds:0,shadow:14}),C=lp.P,o={scene:s,lp,camera:s.userData.cam},M=LP3.mat,G=LP3.geo;
  const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const box=(w,h,d,c,x,y,z,glow)=>{const m=new THREE.Mesh(G.box(w,h,d),glow?LP3.glow(c):M(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=!glow;s.add(m);return m};
  const floor=box(36,.1,20,C.woodDk,0,-.05,0);floor.userData.pl_name='ground';
  box(36,8,.2,C.interior,0,4,-4.2);for(const y of[.3,5.4])box(30,.06,.04,rfDESK3,0,y,-4.08,1);
  for(const[x,w,h,c]of[[-6.6,1.2,.9,C.teal],[-5.0,.8,1.1,C.terra],[4.4,1.1,.8,C.sage]]){box(w+.12,h+.12,.05,C.trim,x,2.9,-4.08);box(w,h,.06,c,x,2.9,-4.05)}
  const sign=PROPS3.sign(K,C,{kind:'hanging',text:'CASE DESK',w:3.4,h:.9,c:rfDESK3d});sign.position.set(0,4.4,-3.9);s.add(sign);o.sign=sign;
  box(s3_X1-s3_X0,s3_BY-.06,.9,C.metal,(s3_X0+s3_X1)/2,(s3_BY-.06)/2,s3_BZ);box(s3_X1-s3_X0+.1,.04,.95,C.trim,(s3_X0+s3_X1)/2,s3_BY-.04,s3_BZ);
  o.slats=[];const smat=M(C.interior);for(let k=0;k<22;k++){const m=new THREE.Mesh(G.box(.06,.025,.8),smat);m.position.set(0,s3_BY,s3_BZ);m.userData.noAudit=1;s.add(m);o.slats.push(m)}
  /* station 1: the Lumen Help phone on a stand (black, like the real iPhone frame) */
  o.phone=rfHelpPhone(K,C,{s:1.5,c:0x16181d});s.add(o.phone);
  o.phone.position.set(-5.35,1.62,s3_BZ-.1);o.phone.rotation.set(-.04,.26,0);
  box(.08,.62,.08,C.metal,-5.35,.31,s3_BZ-.2);box(.6,.05,.5,C.metal,-5.35,.025,s3_BZ-.2);
  o.phHalo=K.halo('120,150,255',2.2,.0);o.phHalo.position.set(-5.35,1.6,s3_BZ-.3);s.add(o.phHalo);
  /* station 2: Adapty profile panel */
  o.profTx=rfTex(K,520,300);rfPaint(o.profTx,'p',s3_profile);o.prof=new THREE.Group();s.add(o.prof);
  {const fr=new THREE.Mesh(G.box(1.86,1.1,.08),M(C.metal));fr.castShadow=true;o.prof.add(fr);const sc=new THREE.Mesh(new THREE.PlaneGeometry(1.76,1.0),new THREE.MeshBasicMaterial({map:o.profTx,toneMapped:false}));sc.position.z=.045;o.prof.add(sc)}
  o.prof.position.set(-3.1,1.85,-.35);box(.08,1.3,.08,C.metal,-3.1,.65,-.4);box(.5,.05,.4,C.metal,-3.1,.025,-.4);
  /* station 3: plain-code machine */
  const mx=-1.15;box(1.5,.9,1.15,C.tealLt,mx,s3_BY+.45+.02,s3_BZ);box(1.56,.08,1.2,C.trim,mx,s3_BY+.95,s3_BZ);
  o.codeTx=rfTex(K,420,220);rfPaint(o.codeTx,'c',s3_code);const cs=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.6),new THREE.MeshBasicMaterial({map:o.codeTx,toneMapped:false}));cs.position.set(mx,s3_BY+.5,s3_BZ+.585);s.add(cs);
  box(.04,.5,.8,C.metal,mx+.77,s3_BY+.27,s3_BZ);
  o.gears=[[-.35,.32],[.3,.24]].map(([dx,r],k)=>{const g=new THREE.Group();g.position.set(mx+dx,s3_BY+1.0+r,s3_BZ-.1);s.add(g);
    const d=new THREE.Mesh(G.cyl(r,r,.1,10),M(k?C.sand:C.awnA));d.rotation.x=Math.PI/2;d.castShadow=true;g.add(d);
    for(let j=0;j<8;j++){const t=new THREE.Mesh(G.box(.1,.12,.1),M(k?C.sand:C.awnA));const a=j/8*Math.PI*2;t.position.set(Math.cos(a)*(r+.04),Math.sin(a)*(r+.04),0);t.rotation.z=a;g.add(t)}
    const hb=new THREE.Mesh(G.cyl(.06,.06,.14,6),M(C.metal));hb.rotation.x=Math.PI/2;g.add(hb);return g});
  const okT=s3_cubeTex(1),noT=s3_cubeTex(0);
  o.facts=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.24),new THREE.MeshLambertMaterial({map:okT}));m.castShadow=true;s.add(m);return m});
  /* station 4: the Claude booth — a solid orange kiosk over the belt, a big front panel "Claude · writes the words", the mark on top */
  const bx=1.45;o.booth=box(1.5,1.15,1.15,0xd97757,bx,s3_BY+.6,s3_BZ);box(1.58,.08,1.22,C.trim,bx,s3_BY+1.2,s3_BZ);
  box(.04,.5,.8,0x6b3a24,bx-.77,s3_BY+.27,s3_BZ);box(.04,.5,.8,0x6b3a24,bx+.77,s3_BY+.27,s3_BZ);
  o.clTx=PROPS3.tex(512,200,s3_claudeFace);const cf=new THREE.Mesh(new THREE.PlaneGeometry(1.36,.53),new THREE.MeshBasicMaterial({map:o.clTx,toneMapped:false}));cf.position.set(bx,s3_BY+.78,s3_BZ+.58);s.add(cf);
  o.clHalo=K.halo('217,119,87',2.0,.0);o.clHalo.position.set(bx,s3_BY+.8,s3_BZ+.2);s.add(o.clHalo);
  o.claude=LOGO3.make(K,'claude',{depth:.14});o.claude.scale.setScalar(.8);o.claude.position.set(bx,2.25,s3_BZ);s.add(o.claude);
  o.reply=new THREE.Group();s.add(o.reply);{const pp=new THREE.Mesh(G.box(.56,.03,.4),M(C.trim));pp.castShadow=true;o.reply.add(pp);for(let k=0;k<3;k++){const l=new THREE.Mesh(G.box(.34-k*.06,.01,.03),M(C.interior));l.position.set(-.04,.02,-.1+k*.09);o.reply.add(l)}}
  o.bad=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.42),new THREE.MeshLambertMaterial({map:noT}));o.bad.castShadow=true;s.add(o.bad);
  /* station 5: the checker gate */
  const gx=3.25;box(.16,1.7,.16,C.metal,gx,.85,s3_BZ+.5);box(.16,1.7,.16,C.metal,gx,.85,s3_BZ-.5);box(.2,.2,1.2,C.metal,gx,1.75,s3_BZ);
  o.curtain=new THREE.Mesh(new THREE.PlaneGeometry(.92,1.05),new THREE.MeshBasicMaterial({color:0x7ce3c6,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  o.curtain.rotation.y=Math.PI/2;o.curtain.position.set(gx,s3_BY+.55,s3_BZ);s.add(o.curtain);
  o.lamp=new THREE.Mesh(G.box(.24,.1,.24),new THREE.MeshBasicMaterial({color:0x7ce3c6,toneMapped:false}));o.lamp.position.set(gx,1.9,s3_BZ);s.add(o.lamp);
  o.gHalo=K.halo('124,227,198',1.4,.3);o.gHalo.position.set(gx,1.9,s3_BZ);s.add(o.gHalo);
  o.cRed=new THREE.Color(0xee5c68);o.cGrn=new THREE.Color(0x7ce3c6);
  /* station 6: the developer console on a desk */
  o.rug=R(PROPS3.rug(K,C,{kind:'rect',w:2.6,d:2.0,c:'awnA'}),6.2,0,-.9);
  o.desk=R(PROPS3.desk(K,C,{kind:'office',w:1.7}),6.2,0,-1.0);
  o.conTx=rfTex(K,560,320);o.mon=R(PROPS3.monitor(K,C,{tex:o.conTx,w:1.05}),0,0,0);
  o.chair=R(PROPS3.chair(K,C,{kind:'office'}),6.2,0,-.2,Math.PI);
  o.mug=R(PROPS3.mug(K,C,{steam:1,c:'terra'}),0,0,0);o.kb=R(PROPS3.keyboard(K,C,{}),0,0,0);
  o.env=new THREE.Group();s.add(o.env);{const b=new THREE.Mesh(G.box(.56,.36,.04),M(C.trim));b.castShadow=true;o.env.add(b);
    const f=new THREE.Mesh(new THREE.ConeGeometry(.33,.2,3),M(C.sand));f.rotation.set(0,0,Math.PI);f.scale.set(1,1,.08);f.position.set(0,.08,.025);o.env.add(f);
    const seal=new THREE.Mesh(G.cyl(.055,.055,.02,10),LP3.glow(rfDESK3));seal.rotation.x=Math.PI/2;seal.position.set(0,0,.04);o.env.add(seal)}
  o.decor=[R(PROPS3.plant(K,C,{kind:'monstera'}),-7.0,0,2.4),R(PROPS3.plant(K,C,{kind:'snake'}),8.3,0,1.6),R(PROPS3.lamp(K,C,{kind:'floor',light:1}),-7.2,0,-3.3),
    R(PROPS3.bookshelf(K,C,{w:1.3,h:2.2}),8.0,0,-3.75),R(PROPS3.plant(K,C,{kind:'round'}),2.3,0,-3.5),R(PROPS3.plant(K,C,{kind:'cactus'}),-1.9,0,-3.6)];
  o.labs={prof:s3_lab(K,s,'Adapty profile',rfDESK),code:s3_lab(K,s,"plain code: what's true",rfGO),
    claude:s3_lab(K,s,'Claude: only the words','217,119,87',30),con:s3_lab(K,s,'developer console',rfDESK)};
  s.add(o.camera);o.bag=rfBagIn(K,o.camera,{r:.36});
  LP3.shadows(s);return o});

/* camera keyframes [px,py,pz, tx,ty,tz] */
const s3_K={wide:[.4,4.3,13.2, .6,1.1,-.2],phone:[-3.55,1.85,4.4, -4.6,1.42,.1],
  prof:[-2.3,2.7,6.4, -2.0,1.25,-.1],claude:[-.3,2.6,6.6, -.2,1.3,0],gate:[1.2,2.5,5.6, 2.75,1.05,0],con:[4.9,2.4,5.6, 5.2,1.3,-.5]};
function s3_shot(cam,list,t,T){/* list = [[time,key],...] ascending; glide 1.4 s into each */
  let v=s3_K[list[0][1]].slice();for(let k=1;k<list.length;k++){const q=sm(cl((t-list[k][0])/1.4));if(q<=0)break;const b=s3_K[list[k][1]];v=v.map((x,j)=>L(x,b[j],q))}
  cam.position.set(v[0]+Math.sin(T*.21)*.05,v[1]+Math.sin(T*.17)*.03,v[2]);cam.lookAt(v[3],v[4],v[5]);cam.updateMatrixWorld()}

const s3_SR='Naplatili ste mi nakon što sam otkazao!';
function s3_pose(o,t,c,i,T,A){o.lp.pose(T);
  const wW=A(0,'writes'),wH=A(0,'help'),wP=A(1,'profile'),wC=A(1,'code'),wT=A(1,'true'),wCl=A(1,'claude'),wWo=A(1,'words'),
    wCh=A(2,'checker'),wB=A(2,'blocks'),wPr=A(2,'premium'),wR=A(2,'approve');
  const zin=s3_E(wH-.6,wH+.2,t);/* 0 → 1 as the camera leaves the wide shot for the phone */
  s3_shot(o.camera,[[-1e9,'wide'],[wH-.6,'phone'],[c(1)-.5,'prof'],[wCl-1.0,'claude'],[wWo+.5,'gate'],[wPr-.6,'con']],t,T);
  const cq=o.camera.quaternion;
  for(const m of o.decor)if(m.userData.pose)m.userData.pose(T);if(o.mug.userData.pose)o.mug.userData.pose(T);
  o.sign.rotation.z=Math.sin(T*.8)*.02;
  const len=s3_X1-s3_X0;o.slats.forEach((m,k)=>{m.position.x=s3_X0+((k/o.slats.length*len+T*.35)%len)});
  /* phone: greeting from the start (never empty) → on 'writes' the Serbian line types into the input → sent → typing dots */
  const ty=s3_E(wW-.2,wW+1.3,t),n=Math.round(ty*s3_SR.length),sent=t>=wW+1.45,dots=t>=wW+1.8;
  const key=sent?(dots?'d'+(Math.floor(T*4)%8):'s'):'t'+n+(Math.floor(T*2)%2);
  rfPaint(o.phone.userData.tex,key,(x,W,H)=>s3_lh(x,W,H,{dw:285,card:1,greet:sent?0:1,msgs:sent?[{me:1,text:s3_SR}]:[],typing:dots?1:0,input:sent?'':s3_SR.slice(0,n),focus:n>0&&!sent,T}));
  o.phHalo.material.opacity=i===0?.1+.22*zin:.1;
  /* profile, code, facts */
  const pr=i>=1?s3_E(wP-.4,wP+.3,t):1-zin;s3_pop(o.prof,pr);
  const run=i>=1?s3_E(wC-.3,wC+.2,t):0;o.gears.forEach((g,k)=>{g.rotation.z=(k?-1:1)*(T*.4+run*T*1.6)});
  o.facts.forEach((m,k)=>{const out=i>=1?s3_E(wT-.3+k*.2,wT+.4+k*.2,t):1-zin;const into=i>=1?s3_E(wCl-.1+k*.18,wCl+.7+k*.18,t):0;
    const x=i===0?-.25+k*.32:L(-1.15+.5,-.2+k*.24,out);const x2=L(x,1.45,into);m.position.set(x2,s3_BY+.13+Math.abs(Math.sin(T*3+k))*.02,s3_BZ);
    m.rotation.y=.3+k*.4;s3_pop(m,out*(1-s3_E(.8,.97,into)),1)});
  /* the booth glows while Claude writes; the reply slides out on 'words' and waits; beat 3: an unstamped fact rides it into the gate */
  const writing=i===1?s3_E(wCl-.2,wCl+.3,t)*(1-s3_E(wWo+1.2,wWo+2,t)):0;o.clHalo.material.opacity=.15+.5*writing*(.75+.25*Math.sin(T*6));
  const rIn=i===1?s3_E(wWo-.4,wWo+.1,t):i===2?1:0,go=i>=1?s3_E(wWo+.5,wB-.05,t):0,bo=i===2?s3_E(wB,wB+1.1,t):0;
  const gx=3.25,rx=L(L(1.45,2.35,rIn),gx-.45,go)-Math.sin(bo*Math.PI*.5)*1.1,ry=s3_BY+.03+Math.sin(cl(bo)*Math.PI)*.6-(bo>.85?(bo-.85)*2:0);
  o.reply.position.set(rx,ry,s3_BZ);o.reply.rotation.set(0,0,bo*1.2);s3_pop(o.reply,rIn*(1-s3_E(.92,1,bo)),1);
  const badIn=i>=1?s3_E(wWo+.2,wWo+.6,t):0;
  o.bad.position.set(rx+.02,ry+.25,s3_BZ+.02);o.bad.rotation.set(bo*2,.4+T*.4*(1-go),bo*1.6);s3_pop(o.bad,badIn*(1-s3_E(.92,1,bo)),1);
  const red=i===2?cl((t-wB+.05)/.12)*(1-s3_E(wB+1.2,wB+1.8,t)):0,on=i>=2?s3_E(wCh-.3,wCh+.2,t):.4;
  const col=o.cGrn.clone().lerp(o.cRed,red);o.curtain.material.color.copy(col);o.lamp.material.color.copy(col);o.curtain.material.opacity=.1+.2*on+.25*red;
  o.gHalo.material.opacity=.25+.35*red;o.gHalo.material.color&&o.gHalo.material.color.copy(col);
  /* the "PREMIUM?" envelope: appears at the gate on 'premium', flies to the console by 'request' and settles in front of it */
  const ev=i===2?s3_E(wPr-.3,wPr+.2,t):0,fl=i===2?s3_E(wPr+.1,wR+.3,t):0;
  const ex=L(gx+.5,5.75,fl),ey=L(s3_BY+.4,1.62,fl)+Math.sin(fl*Math.PI)*1.0,ez=L(s3_BZ,-.2,fl);
  o.env.position.set(ex,ey,ez);o.env.rotation.set(0,L(-.3,-.15,fl),Math.sin(T*3)*.06*(1-fl));s3_pop(o.env,ev,1);
  PLACE3.onSurface(o.mon,o.desk,[0,-.45]);PLACE3.onSurface(o.kb,o.desk,[-.05,.25]);PLACE3.onSurface(o.mug,o.desk,[.72,.1]);
  const ck2=i===2&&t>wR+.4?1:0;rfPaint(o.conTx,'c'+ck2,(x,W,H)=>s3_console(x,W,H,ck2));
  const lb=o.labs;const showL=(m,a,x,y,z,sc=.42)=>{m.position.set(x,y,z);m.quaternion.copy(cq);s3_pop(m,a,sc)};
  showL(lb.prof,i===1?s3_E(wP-.1,wP+.3,t)*(1-s3_E(wCl-.6,wCl-.2,t)):0,-3.1,2.75,-.35,.4);
  showL(lb.code,i===1?s3_E(wC-.1,wC+.3,t)*(1-s3_E(wCl-.6,wCl-.2,t)):0,-1.15,2.3,s3_BZ,.4);
  showL(lb.claude,i===1?s3_E(wCl-.1,wCl+.3,t):0,1.45,2.7,s3_BZ,.5);
  showL(lb.con,0,6.2,2.55,-.9,.4);
  o.claude.rotation.y=Math.sin(T*.6)*.18;o.claude.position.y=2.25+Math.sin(T*1.4)*.04;
  rfBag(o.bag,T,{rings:(i===0&&t-c(0)>.3&&t-c(0)<1.6)||(i===1&&t>wCl&&t<wCl+1.2)?1:0,tool:i===1&&t>wC&&t<wT+1?1:0,
    sq:i===2&&t>wB&&t<wB+.45?.35:0,tilt:i===2&&t>wB+.3&&t<wB+1.6?-.2:i===0&&t>wH?.08:0,dx:i===2&&t>wB&&t<wB+.6?-.15:0})}

return rfRun({base:(g,t,c,T,i,A)=>X3.draw(g,S3,o=>s3_pose(o,t,c,i,T,A),t),
 b:[
  /* 0: title "Case Desk" on the wide shot, then the phone: the app's own help screen, user writes, any language */
  (g,p,d,T,W)=>{const wh=W('help'),a0=P(p,0,.3)*(1-P(p,wh-.6,.45));
    if(a0>0){g.save();g.globalAlpha*=a0;const gr=g.createLinearGradient(0,320,0,540);gr.addColorStop(0,'rgba(10,18,40,0)');gr.addColorStop(.5,'rgba(10,18,40,.62)');gr.addColorStop(1,'rgba(10,18,40,0)');g.fillStyle=gr;g.fillRect(0,320,1280,220);g.restore();
      rfIconDesk(g,470,410,40,{pop:P(p,0,.35),a:a0,T,n:1});txt(g,665,410,'Case Desk',{fs:58,d:1,w:800,c:PA,a:a0,glow:14});
      rfChip(g,640,478,'inside the app as “Lumen Help”',{c:rfDESK,fs:16,pop:P(p,W('desk')+.1,.4),a:a0})}
    const x=800;
    rfChip(g,x,190,"the app’s own help screen",{c:rfDESK,fs:19,pop:P(p,wh-.1,.4)});
    rfChip(g,x,246,'the user just writes',{c:'120,150,255',fs:18,pop:P(p,W('writes')-.1,.4)});
    const wl=W('any');[['Srpski',0],['Español',1],['English',2],['Deutsch',3],['Русский',4]].forEach(([s,k])=>rfChip(g,x-200+k*100,306,s,{c:rfGO,fs:15,pop:P(p,wl-.25+k*.1,.3),hot:k===0?P(p,wl,.3)*(1-P(p,wl+1,.4)):0}));
    txt(g,x,350,'“You charged me after I cancelled!”',{fs:16,c:'190,200,225',a:P(p,W('writes')+1.2,.4)})},
  /* 1: profile → plain code → Claude */
  (g,p,d,T,W)=>{const wc=W('claude');
    rfChip(g,640,140,'facts: Adapty profile + plain code',{c:rfGO,fs:17,pop:P(p,W('true')-.1,.4)*(1-P(p,wc-.5,.3))});},
  /* 2: the checker bounces an unstamped fact; giving away premium = a request → Approve */
  (g,p,d,T,W)=>{const wB=W('blocks'),wPr=W('premium'),wR=W('approve'),out=1-P(p,wPr-.5,.35);
    rfChip(g,420,150,'checker',{c:rfGO,fs:17,pop:P(p,W('checker')-.15,.3),a:1-P(p,wB-.05,.15)});rfChip(g,420,150,'checker: a fact the code didn’t supply → blocked',{c:rfRED,fs:17,pop:P(p,wB-.05,.3),a:out});
    const a=P(p,wB+.1,.35)*out;if(a>0){g.save();g.globalAlpha*=a;const bx=420,by=212;g.beginPath();g.roundRect(bx-170,by-30,340,60,14);g.fillStyle='rgba(16,30,54,.95)';g.fill();g.lineWidth=1.6;g.strokeStyle=`rgba(${rfRED},.9)`;g.stroke();
      txt(g,bx,by-9,'“…and we’ll refund you.”',{fs:16,c:PA});txt(g,bx,by+12,'not in the facts · no stamp, no entry',{fs:13,c:'176,188,214'});ic(g,'cross',bx+160,by-28,11,rfRED);g.restore()}
    /* the envelope label and the Approve card */
    const ea=P(p,wPr-.15,.35);if(ea>0){g.save();g.globalAlpha*=ea;const ex=330,ey=170;g.beginPath();g.roundRect(ex-150,ey-28,300,56,12);g.fillStyle='rgba(16,30,54,.95)';g.fill();g.lineWidth=1.6;g.strokeStyle=`rgba(${rfDESK},.95)`;g.stroke();
      txt(g,ex-72,ey,'PREMIUM?',{fs:22,w:800,m:1,c:rfGOLD});ic(g,'right',ex+30,ey,12,PA);txt(g,ex+92,ey,'your OK',{fs:22,w:700,c:rfDESK});g.restore()}
    rfApprove(g,330,370,{who:'Marko · u00009',what:'premium request',why:'only you, or a rule you set, can give premium',pop:P(p,W('only')-.1,.45),click:.0001+.75*s3_E(wR,wR+1.2,p),T})}
 ]},3)
})()
