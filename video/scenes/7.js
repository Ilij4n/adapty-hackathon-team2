/* Scene 7 — "Built AI-native" (NEW). One warm agent workshop, three zones along the back wall; the camera walks left→right:
     A (x −6)  the debate table: six voter agents around a round table, ~20 idea cards circling over it; they drop out one by
               one and the amber "Case Desk" card rises to the middle.
     B (x 0)   four builder desks in an arc around one standing document "ARCH.md · the contract" (amber floor lines to each desk);
               then three bug-bash agents (AI · UI · backend) with magnifiers walk in on the right, "37 found & fixed".
     C (x 7.5) the run wall: a big screen with 5,000 user dots lighting green, two server racks; the counter
               "5,000 users × every question = 63,296 runs · 0 crashes · 0 broken facts" (+ "544 tests").
   Beats: 0 wide of the whole workshop, title · 1 zone A · 2 zone B then the trio · 3 zone C ·
   4 back to a wide, dimmed, with a Claude chat window on top: the REAL Claude Code transcript against Case Desk's MCP server
   (docs/mcp/claude-code-transcripts.txt in case-desk), revealed on ask / waiting / approve; ends on a chip row before "chat".
   Light beat: one voter agent keeps its losing card up a moment too long, then droops (Bagley tilts at it).
   Agents are scene-local low-poly robots (s7_bot). Scene-local helpers are prefixed s7_. */
(()=>{
const s7_N=20,s7_WIN=7;/* the 20 idea cards; card 7 is Case Desk */
const s7_ROLE=[['Adapty client',0x5fe6ff,'95,230,255'],['engine',0xffa84c,rfDESK],['AI layer',0x967cff,rfLUM],['app',0x7ce3c6,rfGO]];
const s7_BUG=[['AI',0x967cff,rfLUM,10],['UI',0x56d6ce,'86,214,206',17],['backend',0xffa84c,rfDESK,10]];
const s7_VOTE=[0x5fe6ff,0xe8b14a,0x967cff,0x7ce3c6,0xe1604f,0x9fb4ff];
const s7_AX=-6.2,s7_BX=0,s7_CX=7.6;

/* ---- a small agent robot (~1.2 tall, faces +z): wheel foot, body in its colour with a chest light, a screen face with
   two cyan eyes, an antenna with a glowing tip, two arms on shoulder pivots. o.prop:'paddle'|'lens' adds a hand-held item.
   pose(T,{bob,look,nod,arms:'idle'|'type'|'vote'|'lens'|'cheer',lift 0..1,droop 0..1,ph}) */
const s7_bot=(K,P,o={})=>{const g=new THREE.Group(),M=LP3.mat,G=LP3.geo,c=o.c??0x5fe6ff,s=o.s||1;
  const add=(par,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m};
  const root=new THREE.Group();root.scale.setScalar(s);g.add(root);
  add(root,G.cyl(.17,.22,.12,8),M(P.metal),0,.06,0);
  for(const x of[-.09,.09])add(root,G.cyl(.045,.05,.26,6),M(P.metal),x,.23,0);
  const up=new THREE.Group();up.position.y=.36;root.add(up);
  add(up,G.box(.44,.4,.3),M(c),0,.22,0);add(up,G.box(.46,.06,.32),M(P.metal),0,.02,0);
  const chest=add(up,G.box(.18,.08,.02),LP3.glow(0xc8f4ff),0,.26,.155);chest.castShadow=false;
  add(up,G.cyl(.06,.07,.08,6),M(P.metal),0,.46,0);
  const head=new THREE.Group();head.position.y=.5;up.add(head);
  add(head,G.box(.42,.3,.32),M(P.trim),0,.15,0);
  const face=add(head,G.box(.34,.2,.02),LP3.glow(0x16213f),0,.15,.165);face.castShadow=false;
  const eyes=[-.075,.075].map(x=>{const e=add(head,G.box(.06,.075,.02),LP3.glow(0x7fefff),x,.16,.172);e.castShadow=false;return e});
  add(head,G.cyl(.012,.012,.16,4),M(P.metal),0,.38,0);const tip=add(head,G.sph(.04,6,4),LP3.glow(c),0,.47,0);tip.castShadow=false;
  for(const x of[-.22,.22])add(head,G.box(.04,.12,.12),M(c),x,.15,0);
  const arm=k=>{const a=new THREE.Group();a.position.set(k*.27,.36,0);up.add(a);const m=add(a,G.box(.08,.28,.08),M(c),0,-.13,0);
    add(a,G.sph(.055,6,4),M(P.metal),0,-.3,0);return a};
  const aL=arm(-1),aR=arm(1);
  let item=null;
  if(o.prop==='paddle'){item=new THREE.Group();item.position.set(0,-.34,0);aR.add(item);add(item,G.cyl(.012,.012,.3,4),M(P.woodDk),0,-.1,0);
    const pd=add(item,G.cyl(.12,.12,.02,10),M(o.pc??P.trim),0,-.28,0);pd.rotation.x=Math.PI/2}
  if(o.prop==='lens'){item=new THREE.Group();item.position.set(0,-.34,.02);aR.add(item);add(item,G.cyl(.016,.016,.16,5),M(P.woodDk),0,-.06,0);
    const rim=add(item,new THREE.TorusGeometry(.1,.018,4,12),M(P.metal),0,-.24,0);rim.rotation.x=Math.PI/2;
    const gl=add(item,G.cyl(.09,.09,.008,12),new THREE.MeshBasicMaterial({color:0xbfe0e6,transparent:true,opacity:.45}),0,-.24,0);gl.castShadow=false}
  g.userData.tipMat=tip.material;g.userData.head=head;
  g.userData.pose=(T,q={})=>{const ph=q.ph||0,bob=q.bob??1,lift=q.lift??0;
    up.position.y=.36+Math.sin(T*2.2+ph)*.012*bob+lift*.12;root.position.y=lift*(.05+.05*Math.sin(T*9+ph));
    head.rotation.y=(q.look||0)+Math.sin(T*.7+ph)*.12*bob;head.rotation.x=(q.nod||0)*.35+(q.droop||0)*.45;head.rotation.z=Math.sin(T*.9+ph*2)*.05*bob;
    const bl=((T*.31+ph*.17)%1)<.035?.15:1;eyes.forEach(e=>e.scale.y=bl);
    const A=q.arms||'idle';let l=.08,r=.08,lz=.12,rz=-.12;
    if(A==='type'){l=-1.25+Math.sin(T*16+ph)*.12;r=-1.25+Math.sin(T*16+ph+1.6)*.12;lz=.05;rz=-.05}
    else if(A==='vote'){r=L(-.3,-2.9,q.v??1)-(q.droop||0)*1.6;l=.1}
    else if(A==='lens'){r=-1.35+Math.sin(T*2+ph)*.15;l=.1+Math.sin(T*1.3)*.05}
    else if(A==='cheer'){l=-2.7+Math.sin(T*8+ph)*.25;r=-2.7+Math.sin(T*8+ph+1)*.25;lz=.35;rz=-.35}
    else{l=.06+Math.sin(T*1.1+ph)*.06;r=.06-Math.sin(T*1.1+ph)*.06}
    aL.rotation.set(l,0,lz);aR.rotation.set(r,0,rz);
    if(item)item.visible=A===(o.prop==='paddle'?'vote':'lens');
    tip.material.color.setHex(c).multiplyScalar(.75+.25*Math.sin(T*3+ph))};
  return g};

/* ---- card faces (built once) */
const s7_cardFace=(x,W,H,win)=>{x.fillStyle=win?'#ffb35c':'#fff1da';x.fillRect(0,0,W,H);x.fillStyle=win?'#7a3e10':'#c9b7a0';
  if(win){x.font='800 54px "IBM Plex Sans",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('Case',W/2,H*.36);x.fillText('Desk',W/2,H*.56);
    x.fillStyle='#7a3e10';x.fillRect(W*.2,H*.74,W*.6,8);x.fillRect(W*.2,H*.81,W*.45,8)}
  else{x.fillRect(W*.15,H*.18,W*.55,18);for(let k=0;k<5;k++)x.fillRect(W*.15,H*(.36+k*.1),W*(.5+.2*((k*37)%5)/5),9)}};
const s7_archFace=(x,W,H)=>{x.fillStyle='#fff7ec';x.fillRect(0,0,W,H);x.fillStyle='#ffa84c';x.fillRect(0,0,W,H*.16);
  x.fillStyle='#3a1f08';x.font='800 64px "IBM Plex Mono",monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('ARCH.md',W/2,H*.08);
  x.fillStyle='#6d5b78';x.font='600 34px "IBM Plex Sans",sans-serif';x.fillText('one written contract',W/2,H*.22);
  const sec=['Adapty client','engine','AI layer','app'];sec.forEach((t,k)=>{const y=H*(.32+k*.165);x.fillStyle=['#5fe6ff','#ffa84c','#967cff','#7ce3c6'][k];x.fillRect(W*.08,y,22,22);
    x.fillStyle='#2a2440';x.textAlign='left';x.font='700 32px "IBM Plex Sans",sans-serif';x.fillText(t,W*.08+36,y+12);x.fillStyle='#c9bfd2';
    x.fillRect(W*.08,y+40,W*.78,8);x.fillRect(W*.08,y+58,W*.6,8);x.fillRect(W*.08,y+76,W*.7,8)})};
const s7_monFace=(k)=>(x,W,H)=>{x.fillStyle='#0e1730';x.fillRect(0,0,W,H);const c=['#5fe6ff','#ffa84c','#967cff','#7ce3c6'][k];x.fillStyle=c;x.fillRect(0,0,W,H*.2);
  x.fillStyle='#0e1730';x.font='800 30px "IBM Plex Sans",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(s7_ROLE[k][0],W/2,H*.1);
  for(let j=0;j<6;j++){x.fillStyle=j%3==0?c:'rgba(238,243,250,.45)';x.fillRect(W*(.08+(j%2)*.06),H*(.3+j*.11),W*(.35+((j*29+k*11)%7)/14),9)}};
/* the run wall: 5,000 dots (100 x 50), lit in a seeded order; f 0..1 how many have run */
const s7_ORD=(()=>{const a=[];for(let k=0;k<5000;k++)a.push([LP3.hash(k*.731+5)*.35+(k%100)/100*.65,k]);a.sort((p,q)=>p[0]-q[0]);const r=new Float32Array(5000);a.forEach((q,j)=>r[q[1]]=j/5000);return r})();
const s7_wallFace=(x,W,H,f)=>{x.fillStyle='#0a1022';x.fillRect(0,0,W,H);x.fillStyle='#17223f';x.fillRect(0,0,W,H*.12);
  x.fillStyle='#9fb4ff';x.font='700 30px "IBM Plex Sans",sans-serif';x.textAlign='left';x.textBaseline='middle';x.fillText('population run · Lumen · 5,000 users',W*.03,H*.06);
  x.textAlign='right';x.fillStyle='#7ce3c6';x.fillText(Math.round(f*63296).toLocaleString('en-US')+' runs',W*.97,H*.06);
  const gx=W*.03,gy=H*.17,cw=(W*.94)/100,ch=(H*.79)/50;
  for(let k=0;k<5000;k++){const on=s7_ORD[k]<f;x.fillStyle=on?'#7ce3c6':'#26304f';x.fillRect(gx+(k%100)*cw,gy+Math.floor(k/100)*ch,cw*.66,ch*.66)}};

/* ---- beat 4: the Claude chat window (dark, clean), centred at cx,cy, 700 x 440. Messages are the real Claude Code run
   (case-desk docs/mcp/claude-code-transcripts.txt), trimmed but quoted exactly. Each message: [kind,text,revealWord,offset]. */
const s7_MSG=[['me',"What is waiting for my OK in Case Desk?",'ask',-.1],
  ['ai',["One courtesy grant is waiting for your OK:",["Who:","Ava (00239)"],["What:","3 days of Premium"],["Why:","Ava paid before, then the App Store couldn't take the renewal on 22 Oct 2026."]],'waiting',-.15],
  ['me',"Approve Ava's grant",'approve',-.2],
  ['tool',"approve_grant · confirm: true",'approve',.2],
  ['ai',["I approved Ava's grant. Ava now has 3 days of Premium, running until 7 Nov 2026."],'it',.05]];
const s7_claude=(g,cx,cy,o)=>{const {pop,T,W,p}=o;if(pop<=0)return;const w=760,h=420,x0=cx-w/2,y0=cy-h/2,FN='"IBM Plex Sans",sans-serif';
  g.save();g.translate(cx,cy);const sc=bk(cl(pop));g.scale(sc,sc);g.translate(-cx,-cy);g.globalAlpha*=cl(pop*1.5);
  g.shadowColor='rgba(0,0,0,.6)';g.shadowBlur=40;g.shadowOffsetY=12;g.beginPath();g.roundRect(x0,y0,w,h,18);g.fillStyle='#262624';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.2;g.strokeStyle='rgba(255,255,255,.12)';g.stroke();
  /* header: clawd + "Claude", connector chip */
  g.fillStyle='#1f1e1d';g.beginPath();g.roundRect(x0,y0,w,52,[18,18,0,0]);g.fill();g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x0,y0+52,w,1);
  logo(g,'clawd',x0+34,y0+26,34,{T});g.font=`600 21px ${FN}`;g.fillStyle='#f0eee6';g.textAlign='left';g.textBaseline='middle';g.fillText('Claude',x0+60,y0+27);
  {const t='Case Desk · MCP';g.font=`600 14px ${FN}`;const cw=g.measureText(t).width+40,chx=x0+w-cw-16,hot=P(p,W('claude')-.1,.3)*(1-P(p,W('claude')+.9,.4));
   g.beginPath();g.roundRect(chx,y0+12,cw,28,14);g.fillStyle='rgba(217,119,87,.16)';g.fill();g.lineWidth=1.4;g.strokeStyle=`rgba(217,119,87,${.7+.3*hot})`;
   if(hot){g.shadowColor='rgba(217,119,87,.9)';g.shadowBlur=18*hot}g.stroke();g.shadowColor='transparent';
   g.fillStyle='#7ce3c6';g.beginPath();g.arc(chx+15,y0+26,4.5,0,6.283);g.fill();g.fillStyle='#f5d0bf';g.fillText(t,chx+26,y0+27)}
  /* input bar: the first question is typed here (from "plugs" to "ask"), then sent; the bar hides once the chat fills */
  {const sent=P(p,W('ask')-.1,.3),ty=P(p,W('plugs')+.2,W('ask')-W('plugs')-.35),ba=1-sent;if(ba>0){const by=y0+h-62,q0=s7_MSG[0][1];g.save();g.globalAlpha*=ba;
    g.beginPath();g.roundRect(x0+24,by,w-48,44,14);g.fillStyle='#30302e';g.fill();g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
    g.font=`400 18px ${FN}`;g.textAlign='left';const tt=q0.slice(0,Math.round(q0.length*ty));g.fillStyle=tt?'#f0eee6':'#8a877e';g.fillText(tt||'Reply to Claude…',x0+42,by+22);
    if(tt&&((T*2)%1)<.6){g.fillStyle='#f0eee6';g.fillRect(x0+43+g.measureText(tt).width,by+11,2,22)}
    g.fillStyle=ty>=1?'#d97757':'rgba(217,119,87,.4)';g.beginPath();g.roundRect(x0+w-66,by+7,30,30,8);g.fill();g.fillStyle='#fff';g.font=`700 16px ${FN}`;g.textAlign='center';g.fillText('↑',x0+w-51,by+23);g.restore()}}
  /* messages */
  const mx=x0+28,mw=w-56,fs=18,lh=25;let y=y0+70;
  for(const [kind,text,wd,off] of s7_MSG){const q=P(p,W(wd)+off,.35);if(q<=0)break;
    if(kind==='me'){g.font=`400 ${fs}px ${FN}`;const tw=g.measureText(text).width,bw=tw+30,bx=mx+mw-bw;g.save();g.globalAlpha*=q;
      g.beginPath();g.roundRect(bx,y+(1-q)*8,bw,40,12);g.fillStyle='#141413';g.fill();g.fillStyle='#f0eee6';g.textAlign='left';g.fillText(text,bx+15,y+20+(1-q)*8);g.restore();y+=52}
    else if(kind==='tool'){g.save();g.globalAlpha*=q;g.font=`500 14px "IBM Plex Mono",monospace`;const tw=g.measureText(text).width,bw=tw+46;
      g.beginPath();g.roundRect(mx+30,y,bw,28,8);g.fillStyle='rgba(255,255,255,.05)';g.fill();g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=1;g.stroke();
      g.fillStyle='#7ce3c6';g.font=`700 14px ${FN}`;g.fillText('✓',mx+42,y+15);g.fillStyle='#c9c6bc';g.font=`500 14px "IBM Plex Mono",monospace`;g.fillText(text,mx+60,y+15);g.restore();y+=38}
    else{/* Claude: spark mark + plain text, streamed in line by line */
      g.save();g.globalAlpha*=cl(q*3);logo(g,'claude',mx+9,y+12,22,{T,a:1});g.restore();
      const rows=[];text.forEach((ln,k)=>{if(typeof ln==='string'){g.font=`400 ${fs}px ${FN}`;rfWrap(g,ln,mw-32).forEach(l=>rows.push(['',l,0]))}
        else{g.font=`700 ${fs}px ${FN}`;const bw=g.measureText(ln[0]+' ').width;g.font=`400 ${fs}px ${FN}`;rfWrap(g,ln[1],mw-32-18-bw).forEach((l,j)=>rows.push([j?'':ln[0],l,j?bw:0,1,bw]))}});
      const nShow=P(p,W(wd)+off,.25+rows.length*.09)*rows.length;
      rows.forEach(([lab,l,ind,bul,bw],k)=>{const a=cl(nShow-k);if(a<=0)return;g.save();g.globalAlpha*=a;const tx=mx+32+(bul?18:0);g.fillStyle='#e8e5dc';g.textAlign='left';
        if(bul&&lab){g.fillStyle='#d97757';g.beginPath();g.arc(mx+38,y+lh*k+12,2.8,0,6.283);g.fill();g.fillStyle='#f0eee6';g.font=`700 ${fs}px ${FN}`;g.fillText(lab,tx,y+lh*k+12)}
        g.font=`400 ${fs}px ${FN}`;g.fillStyle='#e8e5dc';g.fillText(l,tx+(bul?bw:0),y+lh*k+12);g.restore()});
      y+=rows.length*lh+16}}
  g.restore()};

/* ================= the workshop stage ================= */
const S7=X3.stage('s7-workshop',K=>{const s=K.scene({fov:35}),lp=LP3.world(K,s,{mood:'interior',clouds:0,shadow:16,sunDir:[4,10,8]}),P=lp.P,M=LP3.mat,G=LP3.geo;
  const cam=s.userData.cam;s.add(cam);const o={scene:s,lp,P,camera:cam,alive:[]};const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const box=(w,h,d,c,x,y,z,gl)=>{const m=new THREE.Mesh(G.box(w,h,d),gl?LP3.glow(c):M(c));m.position.set(x,y,z);if(!gl){m.receiveShadow=true;m.castShadow=true}s.add(m);return m};
  box(34,.2,16,P.wood,0,-.1,0).userData.pl_name='ground';
  for(let k=0;k<17;k++)box(.03,.005,16,P.woodDk,-16+k*2,.003,0).castShadow=false;
  box(34,6.5,.3,P.interior,0,3.25,-4.6);box(34,.16,.08,P.trim,0,.08,-4.42);box(34,.12,.1,P.trim,0,4.0,-4.42);
  for(const x of[-12.5,12.5])box(.3,6.5,10,P.interior,x,3.25,.3);
  /* back wall, zone A: a window, a whiteboard of sticky notes, a clawd poster */
  o.alive.push(R(PROPS3.window(K,P,{w:1.5,h:1.5,curtains:1}),s7_AX-3.2,1.5,-4.37));
  {const wb=box(2.6,1.4,.06,P.trim,s7_AX+.6,2.3,-4.42);box(2.75,.08,.12,P.metal,s7_AX+.6,1.58,-4.38);
   for(let k=0;k<12;k++)box(.3,.3,.02,[P.bike,P.rose,P.sage,P.glassLt][k%4],s7_AX-.4+(k%6)*.4,2.65-Math.floor(k/6)*.5,-4.38).castShadow=false}
  o.claw=LOGO3.make(K,'clawd',{tile:'metal'});o.claw.scale.setScalar(.9);o.claw.position.set(s7_AX+3.0,2.4,-4.38);s.add(o.claw);
  /* zone B wall: shelves with books, a clock-like status lamp row; zone C wall: the run screen */
  R(PROPS3.bookshelf(K,P,{w:1.2,h:2.0}),s7_BX-3.6,0,-4.2);R(PROPS3.bookshelf(K,P,{w:1.0,h:2.0,seed:3}),s7_BX+3.4,0,-4.2);
  {const sg=PROPS3.sign(K,P,{kind:'board',text:'AGENT WORKSHOP',w:2.6,h:.42,c:'metal'});sg.position.set(s7_BX,3.1,-4.4);s.add(sg)}
  o.wallTx=rfTex(K,1200,600);{const fr=box(5.3,2.8,.1,P.metal,s7_CX,2.15,-4.42);const sc=new THREE.Mesh(new THREE.PlaneGeometry(5.0,2.5),new THREE.MeshBasicMaterial({map:o.wallTx,toneMapped:false}));sc.position.set(s7_CX,2.15,-4.36);s.add(sc)}
  o.racks=[R(PROPS3.serverRack(K,P,{units:8}),s7_CX-3.6,0,-3.8,.3),R(PROPS3.serverRack(K,P,{units:8}),s7_CX+3.6,0,-3.8,-.3)];o.alive.push(...o.racks);
  /* pendant lamps over each zone */
  for(const x of[s7_AX,s7_BX,s7_CX]){box(.02,1.6,.02,P.metal,x,5.0,-.3).castShadow=false;const sh=new THREE.Mesh(G.cone(.38,.3,8),M(P.metal));sh.position.set(x,4.15,-.3);s.add(sh);
    const bl=box(.22,.06,.22,0xffd98c,x,4.0,-.3,1);bl.castShadow=false}
  o.lamp=new THREE.PointLight(0xffd29a,1.2,9,1.6);o.lamp.position.set(s7_AX,3.4,0);s.add(o.lamp);
  /* zone A: the debate table, voters, cards */
  {const ped=new THREE.Mesh(G.cyl(.18,.32,.7,8),M(P.metal));ped.position.set(s7_AX,.35,-.4);ped.castShadow=true;s.add(ped);
   o.tab=new THREE.Mesh(G.cyl(1.35,1.35,.08,12),M(P.woodDk));o.tab.position.set(s7_AX,.74,-.4);o.tab.castShadow=o.tab.receiveShadow=true;s.add(o.tab);
   const rug=R(PROPS3.rug(K,P,{kind:'round',w:4.2,d:4.2,c:'sage'}),s7_AX,0,-.4)}
  o.voters=[0,1,2,3,4,5].map(k=>{const a=-2.4+k*.96,b=s7_bot(K,P,{c:s7_VOTE[k],prop:'paddle',pc:[P.trim,P.rose,P.trim,P.sage,P.trim,P.bike][k]});
    b.position.set(s7_AX+Math.sin(a)*1.85,0,-.4-Math.cos(a)*1.85);b.rotation.y=Math.atan2(-Math.sin(a),Math.cos(a));s.add(b);return b});
  const gTx=K.canvasTex(256,360,(x,W,H)=>s7_cardFace(x,W,H,0)),wTx=K.canvasTex(256,360,(x,W,H)=>s7_cardFace(x,W,H,1));
  const cg=new THREE.PlaneGeometry(.26,.36),cmG=new THREE.MeshLambertMaterial({map:gTx,side:THREE.DoubleSide}),cmW=new THREE.MeshBasicMaterial({map:wTx,side:THREE.DoubleSide,toneMapped:false});
  o.cards=[];for(let k=0;k<s7_N;k++){const m=new THREE.Mesh(cg,k===s7_WIN?cmW:cmG);m.castShadow=true;s.add(m);o.cards.push(m)}
  o.winHalo=K.halo(rfDESK,1.6,0);s.add(o.winHalo);
  /* zone B: ARCH.md on a pedestal, four builder stations in an arc behind it, glowing floor lines */
  {const ped=new THREE.Mesh(G.cyl(.45,.55,.4,6),M(P.metal));ped.position.set(s7_BX,.2,.6);ped.castShadow=true;s.add(ped);
   const aTx=K.canvasTex(512,680,s7_archFace);o.arch=new THREE.Mesh(G.box(1.05,1.4,.05),[M(P.trim),M(P.trim),M(P.trim),M(P.trim),new THREE.MeshBasicMaterial({map:aTx,toneMapped:false}),M(P.trim)]);
   o.arch.position.set(s7_BX,1.15,.6);o.arch.castShadow=true;s.add(o.arch);o.archHalo=K.halo(rfDESK,2.4,0);o.archHalo.position.set(s7_BX,1.15,.4);s.add(o.archHalo);
   R(PROPS3.rug(K,P,{kind:'rect',w:6,d:3.6,c:'awnA'}),s7_BX,0,-.6)}
  o.st=[-1.2,-.4,.4,1.2].map((a,k)=>{const x=s7_BX+Math.sin(a)*2.7,z=.4-Math.cos(a)*2.7,ry=Math.atan2(s7_BX-x,.6-z);
    const desk=R(PROPS3.desk(K,P,{kind:'office',w:1.0}),x,0,z,ry);const tx=K.canvasTex(320,190,s7_monFace(k));const mon=R(PROPS3.monitor(K,P,{tex:tx,w:.5}),0,0,0);
    const bot=s7_bot(K,P,{c:s7_ROLE[k][1]});s.add(bot);const bx=x-Math.sin(ry)*.75,bz=z-Math.cos(ry)*.75;bot.position.set(bx,0,bz);bot.rotation.y=ry;
    const ln=new THREE.Mesh(G.box(.05,.012,1),new THREE.MeshBasicMaterial({color:rfDESK3,transparent:true,opacity:0}));const dx=x-s7_BX,dz=z-.6,len=Math.hypot(dx,dz)-.9;
    ln.scale.z=len;ln.position.set(s7_BX+dx*.5,.012,.6+dz*.5);ln.rotation.y=Math.atan2(dx,dz);s.add(ln);
    return{desk,mon,bot,ry,ln}});
  /* bug-bash trio, front right of zone B */
  o.bugs=s7_BUG.map(([n,c],k)=>{const b=s7_bot(K,P,{c,prop:'lens',s:.92});b.position.set(s7_BX+2.5+k*1.0,0,.95-k*.2);b.rotation.y=-.35;s.add(b);return b});
  /* zone C: two watchers, a plant */
  o.watch=[s7_bot(K,P,{c:0x7ce3c6}),s7_bot(K,P,{c:0xffa84c})];o.watch[0].position.set(s7_CX-1.4,0,.4);o.watch[0].rotation.y=Math.PI-.25;o.watch[1].position.set(s7_CX+1.3,0,.2);o.watch[1].rotation.y=Math.PI+.3;
  o.watch.forEach(b=>s.add(b));
  /* corners: plants, a cafe chair, a mug on a stool */
  o.alive.push(R(PROPS3.plant(K,P,{kind:'monstera',s:1.2}),s7_AX-3.6,0,-3.3),R(PROPS3.plant(K,P,{kind:'snake',s:1.1}),s7_CX+4.6,0,-3.2),
    R(PROPS3.plant(K,P,{kind:'round',s:1.0}),-2.8,0,2.6),R(PROPS3.plant(K,P,{kind:'cactus',s:1.0}),s7_CX+4.2,0,1.4));
  R(PROPS3.chair(K,P,{kind:'cafe'}),s7_AX+2.6,0,2.0,-.6);
  o.bag=rfBagIn(K,cam,{x:2.12,y:-1.02,z:-5});
  LP3.shadows(s);return o});

/* camera shots [pos, target] per beat; beat 2 drifts right to the trio after "three" */
const s7_SH=[[0,4.2,15.5,0,1.5,-1.2],[s7_AX+.3,3.4,6.3,s7_AX+.3,1.2,-.6],[s7_BX+.4,2.9,6.6,s7_BX+.4,1.05,-.5],[s7_CX,2.4,6.4,s7_CX,1.9,-2.6],[s7_BX+1.2,3.9,13.5,s7_BX+1.2,1.4,-1.4]];
const s7_B2=[s7_BX+2.0,2.8,6.6,s7_BX+2.3,1.25,-.3];
const s7_lerp=(a,b,q)=>a.map((v,j)=>L(v,b[j],q));
const s7_pose=(o,t,c,i,T,w)=>{const p=t-c(i);o.lp.pose(T);for(const a of o.alive)if(a.userData.pose)a.userData.pose(T);
  let k=i===0?s7_SH[0].map((v,j)=>j==2?v-p*.3:v):s7_lerp(s7_SH[i-1],s7_SH[i],sm(cl(p/1.6)));
  if(i===2)k=s7_lerp(k,s7_B2,sm(P(p,w(2,'three')-.4,1.4)));
  K3.look(o.camera,k[0]+Math.sin(T*.2)*.06,k[1]+Math.sin(T*.17)*.03,k[2],k[3],k[4],k[5]);
  /* zone A: cards circle, then drop out between "debated" and "chose"; the winner rises to the middle */
  const cut=i<1?0:i>1?1:P(p,w(1,'debated')-.3,w(1,'chose')-w(1,'debated')+.2),win=i<1?0:i>1?1:P(p,w(1,'chose')-.2,.9);
  const spin=T*.25;
  o.cards.forEach((m,k)=>{const a=spin+k/s7_N*Math.PI*2,r=1.3,hx=s7_AX+Math.sin(a)*r,hz=-.4+Math.cos(a)*r,hy=1.45+Math.sin(T*1.3+k)*.05;
    if(k===s7_WIN){const q=sm(win);m.position.set(L(hx,s7_AX,q),L(hy,1.75,q),L(hz,-.2,q));m.scale.setScalar(1+1.6*q);m.rotation.set(0,L(a,0,q)+(1-q)*0,0);m.visible=true;
      if(q>0)m.rotation.y=L(a,0,q);o.winHalo.position.set(m.position.x,m.position.y,m.position.z-.1);o.winHalo.material.opacity=.7*q*(.85+.15*Math.sin(T*2));return}
    const order=(k*7+3)%s7_N/s7_N,d=sm(cl((cut-order*.9)/.12));
    m.visible=d<1;m.position.set(L(hx,s7_AX+Math.sin(a)*.7,d),L(hy,.8,d),L(hz,-.4+Math.cos(a)*.7,d));m.rotation.set(-Math.PI/2*d,a,0);m.scale.setScalar(1-.3*d)});
  const vote=i===1?P(p,w(1,'debated')-.4,.5):0,late=i===1?P(p,w(1,'chose')+.3,.5):i>1?1:0;
  o.voters.forEach((b,k)=>b.userData.pose(T,{ph:k*1.3,arms:i===1&&(k!==2||late<1)?'vote':'idle',v:k===2?vote:vote*(1-P(p,w(1,'chose'),.5)),
    droop:k===2?late:0,nod:i===1&&win>.5&&k!==2?.3*Math.sin(T*6+k):0,look:i===1&&win>.3?-.2*Math.sign(k-2.5):0}));
  o.lamp.position.x=k[3];
  /* zone B: the contract glows, lines run to every desk, builders type; then the trio */
  const con=i<2?0:i>2?1:P(p,w(2,'contract')-.5,.6),bld=i<2?0:i>2?1:P(p,w(2,'parallel')-.2,.4);
  o.archHalo.material.opacity=(.25+.45*con)*(.85+.15*Math.sin(T*2.2));
  o.st.forEach((q,k)=>{PLACE3.onSurface(q.mon,q.desk,[0,-.2],{ry:q.ry});q.bot.userData.pose(T,{ph:k*.9,arms:bld>.5?'type':'idle',look:bld>.5?0:.3});
    q.ln.material.opacity=.9*con*(.7+.3*Math.sin(T*4-k))});
  const tri=i<2?0:i>2?1:P(p,w(2,'bugbash')-.3,.6),found=i===2?P(p,w(2,'found'),.8):i>2?1:0;
  o.bugs.forEach((b,k)=>{const e=sm(cl(tri*1.6-k*.3));b.visible=e>0;b.position.x=s7_BX+2.5+k*1.0+(1-e)*2.5;b.userData.pose(T,{ph:k*2,arms:e>.9?'lens':'idle',lift:found>0&&found<1?.6:0,look:-.2+.3*Math.sin(T*.8+k)})});
  /* zone C: the wall fills, watchers cheer at the end */
  const f=i<3?0:i>3?1:P(p,w(3,'five')-.2,w(3,'runs')-w(3,'five')+.2);
  rfPaint(o.wallTx,'w'+Math.round(f*60),(x,W,H)=>s7_wallFace(x,W,H,Math.round(f*60)/60));
  const ch=i===3?P(p,w(3,'facts')-.3,.3):0;
  o.watch.forEach((b,k)=>b.userData.pose(T,{ph:k*3,arms:ch>.5?'cheer':'idle',lift:ch>.5?1:0,look:0}));
  /* Bagley: tilts at the stubborn voter, rings at the end of each proof */
  rfBag(o.bag,T,{tilt:i===1?.18*P(p,w(1,'chose')+.3,.3)*(1-P(p,w(1,'chose')+1.6,.4)):0,
    rings:(i===2&&p>w(2,'thirtyseven')&&p<w(2,'thirtyseven')+1.3)||(i===3&&p>w(3,'facts')&&p<w(3,'facts')+1.4)?1:0,
    sq:i===0?.08*P(p,w(0,'ainative'),.25)*(1-P(p,w(0,'ainative')+.5,.3)):0})};

let O=null;
const s7_at=v=>X3.at(S7,v);
return rfRun({base:(g,t,c,T,i,A2)=>{const w=(j,s)=>A2(j,s)-c(j);X3.draw(g,S7,o=>{O=o;s7_pose(o,t,c,i,T,w)},t)},
 b:[
  /* 0 wide: title */
  (g,p,d,T,W)=>{const a=P(p,.1,.5);g.save();g.globalAlpha*=a;const gr=g.createLinearGradient(0,100,0,230);gr.addColorStop(0,'rgba(20,14,30,0)');gr.addColorStop(.5,'rgba(20,14,30,.6)');gr.addColorStop(1,'rgba(20,14,30,0)');g.fillStyle=gr;g.fillRect(0,100,1280,130);g.restore();
    txt(g,640,155,'Built AI-native',{fs:58,d:1,w:800,c:PA,a,glow:14});
    txt(g,640,205,'agents did the research, the building and the bug hunt',{fs:18,c:rfDESK,a:P(p,W('ainative')-.1,.4)})},
  /* 1 the debate table */
  (g,p,d,T,W)=>{if(!O)return;const k0=P(p,W('twenty')-.2,.4),cut=P(p,W('debated')-.3,W('chose')-W('debated')+.2),n=Math.max(1,Math.round(20-19*cut));
    rfChip(g,300,140,n>1?n+' ideas':'20 ideas → 1',{c:rfLUMG,fs:20,pop:k0,hot:P(p,W('twenty'),.3)*(1-P(p,W('twenty')+.9,.3))});
    rfChip(g,300,186,'agent voters debate',{c:CY,fs:16,pop:P(p,W('debated')-.15,.35),mk:'v'});
    const [x,y]=s7_at(O.cards[s7_WIN]);
    rfChip(g,Math.min(1000,x+190),Math.max(150,y-20),'→ Case Desk',{c:rfDESK,fs:22,pop:P(p,W('chose')+.2,.4),hot:P(p,W('this'),.3)*(1-P(p,W('this')+1,.4))});
    const [vx,vy]=s7_at(O.voters[2]);txt(g,vx,Math.min(560,vy+24),'(still voting)',{fs:15,c:'190,200,222',a:P(p,W('one')-.1,.3)*(1-P(p,W('one')+1.4,.4))})},
  /* 2 builders around ARCH.md, then the bug-bash trio */
  (g,p,d,T,W)=>{if(!O)return;const out=P(p,W('three')-.5,.5);
    O.st.forEach((q,k)=>{const [x,y]=s7_at(q.bot.userData.head);rfChip(g,x,Math.max(132,y-44),s7_ROLE[k][0],{c:s7_ROLE[k][2],fs:16,pop:P(p,W('parallel')+k*.15,.35),a:1-out})});
    const [ax,ay]=s7_at([s7_BX,.42,1.15]);rfChip(g,ax,Math.min(540,ay+6),'one written contract',{c:rfDESK,fs:18,pop:P(p,W('written')-.15,.4),hot:P(p,W('contract'),.3)*(1-P(p,W('contract')+1,.4))});
    const fd=P(p,W('found')-.1,W('thirtyseven')-W('found')+.2);
    O.bugs.forEach((b,k)=>{if(!b.visible)return;const [x,y]=s7_at([b.position.x,0,b.position.z]);
      rfChip(g,x,Math.min(556,y+22),s7_BUG[k][0]+' · '+Math.round(s7_BUG[k][3]*fd),{c:s7_BUG[k][2],fs:16,pop:P(p,W('bugbash')+k*.2,.35)})});
    const q=P(p,W('found')-.2,.4);if(q>0){rfStat(g,1030,215,String(Math.round(37*fd)),'found & fixed',{c:rfGO,pop:q,w:200,h:118,fs:56,hot:P(p,W('thirtyseven'),.3)*(1-P(p,W('thirtyseven')+1,.4))});
      txt(g,1030,300,'by 3 bug-bash agents',{fs:15,c:'190,200,222',a:q})}},
  /* 3 the population run */
  (g,p,d,T,W)=>{const q0=P(p,W('users')-.3,.4);
    g.save();g.globalAlpha*=q0;g.fillStyle='rgba(10,16,34,.82)';g.beginPath();g.roundRect(330,118,620,48,24);g.fill();g.restore();
    txt(g,640,143,'5,000 users  ×  every question',{fs:24,d:1,w:700,c:PA,a:q0});
    const r=P(p,W('sixtythree')-.25,.45);
    if(r>0){g.save();g.globalAlpha*=r;g.fillStyle='rgba(10,16,34,.86)';g.beginPath();g.roundRect(430,212,420,150,22);g.fill();g.strokeStyle=`rgba(${rfGOLD},.8)`;g.lineWidth=2;g.stroke();g.restore();
      txt(g,640,276,'63,296',{fs:86,d:1,w:800,c:rfGOLD,a:r,glow:16});txt(g,640,336,'runs',{fs:22,c:PA,a:r})}
    rfStat(g,500,470,'0','crashes',{c:rfGO,pop:P(p,W('crashes')-.2,.4),w:210,h:116,fs:56});
    rfStat(g,780,470,'0','broken facts',{c:rfGO,pop:P(p,W('broken')-.2,.4),w:210,h:116,fs:56,hot:P(p,W('facts'),.3)*(1-P(p,W('facts')+1.2,.4))});
    rfChip(g,640,555,'+ 544 automated tests',{c:CY,fs:15,pop:P(p,W('facts')+.3,.4)})},
  /* 4 Claude + MCP: a Claude chat window over the dimmed workshop; the real transcript (trimmed, quoted exactly) */
  (g,p,d,T,W)=>{const a0=P(p,.05,.5),pop=P(p,W('plugs')-.1,.45);
    /* dim the workshop, lighter toward Bagley's corner */
    g.save();g.globalAlpha*=a0;const vg=g.createRadialGradient(560,340,120,560,340,760);vg.addColorStop(0,'rgba(8,8,14,.74)');vg.addColorStop(.75,'rgba(8,8,14,.55)');vg.addColorStop(1,'rgba(8,8,14,.2)');
    g.fillStyle=vg;g.fillRect(0,0,1280,720);g.restore();
    s7_claude(g,560,322,{pop,T,W,p});
    /* calm end: the chip row (the server has 7 tools at HEAD, not 9, so no number) */
    const cr=P(p,W('from')-.1,.4);[['MCP server',rfDESK],['works with Claude Code & Desktop','217,119,87'],['you still confirm',rfGO]].reduce((x,[t,c],k)=>{
      g.save();g.font=F({fs:14,w:600});const cw=g.measureText(t).width+14*2.4;g.restore();rfChip(g,x+cw/2,555,t,{c,fs:14,pop:P(cr,k*.18,.5)});return x+cw+12},
      560-(3*12+[ 'MCP server','works with Claude Code & Desktop','you still confirm'].reduce((s,t)=>{g.save();g.font=F({fs:14,w:600});const v=g.measureText(t).width+14*2.4;g.restore();return s+v},0)-12)/2)},
 ]},5)})()
