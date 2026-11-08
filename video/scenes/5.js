/* Scene 5 — "Lucía and Ava" (4 beats: Lucía, Ava, console, approve). Stage "the money room": two phones on glowing pedestals
   (Lumen Help in the team's Night Shift dark style, s5_lh; Lucía's in the localized Spanish UI), the developer's desk at the
   back. Beat 0 Lucía (payment failed, update-payment steps, stamp "no grant: never paid", the gift box's lid slams). Beat 1
   Ava (paid → billing error → "requested, not active yet", an envelope flies to the developer). Beats 2–3 (NIGHT SHIFT,
   case-desk-design v2 + the bagley/night-shift-fixes spec): the console grows out of the laptop into a 1000 x 460 window:
   cases list ("Needs a person" pinned), the calm case (evidence collapsed), the count-first dock "1 waiting for your OK".
   A spotlight moves facts → "What Case Desk did" → the checked reply. Then the window zooms onto the big decision card, the
   cursor clicks the amber "Give Ava 3 days of premium" on 'approve', amber→white→teal flash, the card collapses into
   "✓ Premium given to Ava · until 7 Nov 2026", and Ava's Night Shift phone pops up with "Premium given by the team".
   Helpers are scene-local (s5_). */
(()=>{
const s5_E=(a,b,x)=>sm(cl((x-a)/(b-a)));
const s5_ROSE='255,143,163',s5_CYAN='95,230,255';
function s5_shot(cam,shots,i,p,d,T){const a=shots[Math.max(0,i-1)]||shots[0],b=shots[i]||a,q=i===0?1:sm(cl(p/d)),v=a.map((x,k)=>L(x,b[k],q));
  cam.position.set(v[0]+Math.sin(T*.21)*.05,v[1]+Math.sin(T*.17)*.025,v[2]);cam.lookAt(v[3],v[4],v[5]);cam.updateMatrixWorld()}
function s5_pedestal(K,C,col,hc){const g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const b=new THREE.Mesh(G.cyl(.62,.7,.66,6),M(C.interior));b.position.y=.33;b.castShadow=b.receiveShadow=true;g.add(b);
  const cap=new THREE.Mesh(G.cyl(.66,.66,.06,6),M(C.trim));cap.position.y=.69;cap.receiveShadow=true;g.add(cap);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.67,.025,4,6),LP3.glow(col));rim.rotation.x=Math.PI/2;rim.rotation.z=Math.PI/6;rim.position.y=.72;g.add(rim);
  const halo=K.halo(hc,2.2,.25);halo.position.y=.9;g.add(halo);g.userData.halo=halo;return g}
function s5_gift(C){const g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const b=new THREE.Mesh(G.box(.46,.36,.46),M(C.terra));b.position.y=.18;b.castShadow=true;g.add(b);
  for(const r of[0,Math.PI/2]){const rb=new THREE.Mesh(G.box(.08,.37,.47),M(C.trim));rb.position.y=.18;rb.rotation.y=r;g.add(rb)}
  const lid=new THREE.Group();lid.position.set(0,.36,-.25);g.add(lid);
  const lt=new THREE.Mesh(G.box(.52,.1,.52),M(C.terraDk));lt.position.set(0,.05,.25);lt.castShadow=true;lid.add(lt);
  for(const r of[0,Math.PI/2]){const rb=new THREE.Mesh(G.box(.09,.11,.53),M(C.trim));rb.position.set(0,.05,.25);rb.rotation.y=r;lid.add(rb)}
  for(const s of[-1,1]){const bow=new THREE.Mesh(new THREE.TorusGeometry(.08,.03,4,8),M(C.trim));bow.position.set(s*.07,.15,.25);bow.rotation.y=s*.6;lid.add(bow)}
  g.userData.lid=lid;return g}
function s5_env(C){const g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const b=new THREE.Mesh(G.box(.5,.32,.04),M(C.trim));b.castShadow=true;g.add(b);
  const sh=new THREE.Shape();sh.moveTo(-.25,0);sh.lineTo(.25,0);sh.lineTo(0,-.17);sh.closePath();
  const f=new THREE.Mesh(new THREE.ShapeGeometry(sh),M(C.kerb));f.position.set(0,.16,.022);g.add(f);
  const seal=new THREE.Mesh(G.cyl(.05,.05,.02,10),LP3.glow(rfDESK3));seal.rotation.x=Math.PI/2;seal.position.set(0,-.01,.035);g.add(seal);return g}

const S5=X3.stage('s5-money2',K=>{const s=K.scene({fov:35}),lp=LP3.world(K,s,{mood:'studio',clouds:0,shadow:12}),C=lp.P,o={scene:s,lp,camera:s.userData.cam},M=LP3.mat,G=LP3.geo;
  const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const floor=new THREE.Mesh(G.box(30,.1,18),M(C.woodDk));floor.position.set(0,-.05,0);floor.receiveShadow=true;s.add(floor);
  const wall=new THREE.Mesh(G.box(30,6,.2),M(C.interior));wall.position.set(0,3,-4.6);wall.receiveShadow=true;s.add(wall);
  const lw=new THREE.Mesh(G.box(.2,6,18),M(C.interior));lw.position.set(-9.2,3,0);lw.receiveShadow=true;s.add(lw);
  const skirt=new THREE.Mesh(G.box(30,.14,.06),M(C.trim));skirt.position.set(0,.07,-4.48);s.add(skirt);
  for(const y of[.32,4.7]){const st=new THREE.Mesh(G.box(22,.06,.04),LP3.glow(rfDESK3));st.position.set(0,y,-4.48);s.add(st)}
  o.pL=R(s5_pedestal(K,C,0xff8fa3,s5_ROSE),-2.4,0,-1.2);o.pR=R(s5_pedestal(K,C,0x5fe6ff,s5_CYAN),2.4,0,-1.2);
  o.phL=rfHelpPhone(K,C,{s:1.3,c:0x16181d});o.phL.position.set(-2.4,.72+.84,-1.2);o.phL.rotation.y=.22;s.add(o.phL);
  o.phR=rfHelpPhone(K,C,{s:1.3,c:0x16181d});o.phR.position.set(2.4,.72+.84,-1.2);o.phR.rotation.y=-.22;s.add(o.phR);
  o.desk=R(PROPS3.desk(K,C,{kind:'office',w:1.6}),0,0,-3.0,Math.PI);
  o.chair=R(PROPS3.chair(K,C,{kind:'office'}),0,0,-3.75,Math.PI);
  o.dev=K.add(s,CHAR3.person(K,{skin:0xf3c39d,P:C,seed:8,kind:'tee',c:C.sage}));
  o.lap=R(PROPS3.laptop(K,C,{open:1}),0,0,0);PLACE3.onSurface(o.lap,o.desk,[0,.1],{ry:Math.PI});
  o.deco=[R(PROPS3.mug(K,C,{c:'teal',steam:1}),0,0,0),R(PROPS3.lamp(K,C,{kind:'desk',light:1}),0,0,0)];
  PLACE3.onSurface(o.deco[0],o.desk,[.62,.2]);PLACE3.onSurface(o.deco[1],o.desk,[-.75,-.2],{ry:2.4});
  o.lapHalo=K.halo('255,168,76',1.0,.3);o.lapHalo.position.set(0,1.05,-2.85);s.add(o.lapHalo);
  o.lapPt=new THREE.Object3D();o.lapPt.position.set(0,1.12,-2.86);s.add(o.lapPt);
  o.gift=R(s5_gift(C),-1.15,0,-.8,.3);
  o.env=s5_env(C);s.add(o.env);o.env.visible=false;
  o.ring=K.add(s,CHAR3.ring(K,{c:rfRED,R:.7}),-1.25,.5,-.55);
  o.rug=R(PROPS3.rug(K,C,{kind:'rect',w:6.4,d:3.2,c:'teal'}),0,.01,-1.5);
  o.decor=[R(PROPS3.window(K,C,{w:1.6,h:1.8,curtains:1}),-5.2,1.0,-4.4),R(PROPS3.bookshelf(K,C,{w:1.2,h:2.0}),-7.3,0,-4.15),
    R(PROPS3.plant(K,C,{kind:'monstera'}),-6.3,0,-3.9),R(PROPS3.lamp(K,C,{kind:'floor',light:1}),5.0,0,-3.9),R(PROPS3.plant(K,C,{kind:'snake'}),6.1,0,-3.8),
    R(PROPS3.bookshelf(K,C,{w:1.0,h:1.6}),7.4,0,-4.15),R(PROPS3.plant(K,C,{kind:'monstera',seed:4}),-5.0,0,3.2),R(PROPS3.plant(K,C,{kind:'round'}),5.2,0,3.0)];
  for(const [x,c] of[[-2.6,C.sage],[2.6,C.rose]]){const fr=new THREE.Mesh(G.box(1.0,.7,.05),M(C.trim));fr.position.set(x,3.1,-4.47);s.add(fr);
    const art=new THREE.Mesh(G.box(.86,.56,.02),M(c));art.position.set(x,3.1,-4.43);s.add(art);const hill=new THREE.Mesh(G.box(.86,.18,.025),M(C.teal));hill.position.set(x,2.91,-4.42);s.add(hill)}
  s.add(o.camera);o.bag=rfBagIn(K,o.camera,{r:.36});
  LP3.shadows(s);return o});

/* shots: 0 wide, 1 Lucía (phone on the left third), 2 Ava (phone on the left third), 3–4 pushed in on the developer's laptop */
const s5_SH=[[0,2.5,8.2, 0,1.35,-1.8],[-1.0,1.95,3.7, -1.2,1.08,-1.0],[3.5,1.95,3.7, 3.6,1.2,-1.0],[0,1.6,.4, 0,1.12,-2.9],[0,1.58,.2, 0,1.12,-2.9]];

const s5_URL='play.google.com/store/paymentmethods';

function s5_pose(o,t,c,i,T,A){const p=t-c(i);o.lp.pose(T);s5_shot(o.camera,s5_SH,i,p,i===3?1.4:1.6,T);
  for(const m of o.decor)if(m.userData.pose)m.userData.pose(T);for(const m of o.deco)if(m.userData.pose)m.userData.pose(T);
  o.dev.userData.pose(T,{pose:'type'});PLACE3.atDesk(o.dev,o.desk,o.chair);
  o.lapHalo.material.opacity=(i>=3?.4:.22)+.06*Math.sin(T*1.4);
  const lOn=i===0||i===1?1:.35,rOn=i===0||i===2||i===4?1:.35;o.pL.userData.halo.material.opacity=.12+.22*lOn+.04*Math.sin(T*1.7);o.pR.userData.halo.material.opacity=.12+.22*rOn+.04*Math.sin(T*1.7+1.4);
  /* Lucía's phone: plan card on 'trial', the update-payment reply on 'steps' */
  const lc=i>=2?1:i===1?s5_E(A(1,'trial')-.3,A(1,'trial')+.2,t):0,lr=i>=2?1:i===1?s5_E(A(1,'steps')-.4,A(1,'steps')+.1,t):0;
  const lq=[Math.round(lc*4),Math.round(lr*4)];
  rfPaint(o.phL.userData.tex,'L'+lq.join(','),(x,W,H)=>s5_lh(x,W,H,Object.assign({dw:270},s5_LU,{card:lq[0]?Object.assign({},s5_LU.card,{a:lq[0]/4}):null,
    msgs:[{me:1,text:s5_LU_Q},{text:s5_LU_R,a:lq[1]/4},{link:'Actualizar método de pago',a:lq[1]/4}]})));
  /* Ava's phone: plan card on 'billing', the reply on 'asks', premium again in beat 4 */
  const ac=i>=3?1:i===2?s5_E(A(2,'billing')-.3,A(2,'billing')+.2,t):0,ar=i>=3?1:i===2?s5_E(A(2,'asks')-.2,A(2,'asks')+.3,t):0;
  const aq=[Math.round(ac*4),Math.round(ar*4),i===4&&t>A(4,'approve')?1:0];
  rfPaint(o.phR.userData.tex,'A'+aq.join(','),(x,W,H)=>s5_lh(x,W,H,Object.assign({dw:270},s5_AV,{card:aq[0]?Object.assign({},s5_AV.card,{a:aq[0]/4}):null,
    msgs:[{me:1,text:'I paid but have no premium'},{text:s5_AV_R,a:aq[1]/4},{link:'Update payment method',a:aq[1]/4},{note:s5_AV_N,kind:'amber',a:aq[1]/4},{note:s5_AV_G,kind:'green',a:aq[2]}]})));
  /* the gift box (humour beat): hops toward Lucía from 'fix', lid open hopefully; on 'no' the lid slams and it scoots back */
  const g0=i===1?A(1,'fix'):1e9,gn=i===1?A(1,'no'):1e9,hop=i===1?s5_E(g0,gn,t):0,back=i===1?s5_E(gn+.15,gn+.8,t):0;
  const hz=Math.abs(Math.sin((t-g0)*7))*.32*(t>g0&&t<gn?1:0);o.gift.position.set(-1.15-.55*hop*(1-back),hz,-.8-.2*hop*(1-back));
  o.gift.userData.lid.rotation.x=-(t>g0&&t<gn?(.9+.15*Math.sin(T*8))*s5_E(g0,g0+.4,t):0);o.gift.rotation.y=.3+(t>g0&&t<gn?Math.sin(T*6)*.06:0);
  o.ring.visible=i===1&&t>gn&&t<gn+.9;o.ring.position.set(o.gift.position.x,.5,o.gift.position.z);o.ring.userData.pose(T,{p:cl((t-gn)/.9)});
  /* the envelope (Ava's request) arcs from her phone to the laptop from 'team' */
  const e0=i===2?A(2,'team'):-1,ev=i===2?s5_E(e0,e0+1.8,t):0;o.env.visible=i===2&&t>e0&&ev<.995;
  if(o.env.visible){const a=[2.4,1.9,-1.0],b=[0,1.15,-2.75];o.env.position.set(L(a[0],b[0],ev),L(a[1],b[1],ev)+Math.sin(ev*Math.PI)*.9,L(a[2],b[2],ev));
    o.env.rotation.set(0,-.4+ev*.4,Math.sin(T*3)*.08);o.env.scale.setScalar(Math.max(1e-3,bk(cl((t-e0)/.35))*(1-.45*ev)))}
  const gnS=i===1?A(1,'no'):1e9;
  rfBag(o.bag,T,{tilt:i===0&&t>A(0,'care')?-.16:i===1&&t>gnS&&t<gnS+1.2?.22:0,sq:i===1&&t>gnS&&t<gnS+.5?.35:0,
    rings:(i===2&&t>A(2,'active')&&t<A(2,'active')+1.2)||(i===4&&t>A(4,'approve')+.3)?1:0})}

/* ---------- the Lumen Help screen (white app), copied from scene 3's s3_lh and made scene-local: the status card and the
   chat take options. o = {dw, who, title, sub, card:{a,label,status,dot,rows:[[[k,v],[k,v]],..]}, msgs:[{me,text,a} |
   {link,a} | {note,kind:'amber'|'green',a}], chips, ph (input placeholder), fs} */
const s5_FNT=(w,fs)=>`${w} ${fs}px "IBM Plex Sans",sans-serif`;
function s5_lh(x,W,H,o={}){const dw=o.dw||300,u=W/dw,w=dw,h=H/u;x.save();x.scale(u,u);x.textBaseline='middle';
  x.fillStyle='#0d1629';x.fillRect(0,0,w,h);
  x.fillStyle='#0b1324';x.fillRect(0,0,w,50);x.fillStyle='#1c2944';x.fillRect(0,50,w,1);
  x.fillStyle='#1c2230';x.beginPath();x.roundRect(10,11,28,28,7);x.fill();x.lineWidth=2.6;
  x.strokeStyle='#f08a4b';x.beginPath();x.arc(24,25,7.5,-2.6,.6);x.stroke();x.strokeStyle='#5b86f2';x.beginPath();x.arc(24,25,7.5,.8,3.4);x.stroke();
  x.fillStyle='#ffffff';x.beginPath();x.arc(24,25,2.6,0,6.283);x.fill();
  x.textAlign='left';x.fillStyle='#e8edf7';x.font=s5_FNT(700,15);x.fillText(o.title||'Lumen Help',46,20);x.fillStyle='#7d8ba8';x.font=s5_FNT(400,11);x.fillText(o.sub||'Subscription',46,36);
  x.font=s5_FNT(600,11);const who=o.who||'Ava · 00239',pw=x.measureText(who).width+30;x.beginPath();x.roundRect(w-10-pw,13,pw,24,12);x.fillStyle='#101a30';x.fill();x.strokeStyle='#2a3a5c';x.lineWidth=1;x.stroke();
  x.fillStyle='#e8edf7';x.fillText(who,w-pw,25.5);x.beginPath();x.moveTo(w-24,23);x.lineTo(w-17,23);x.lineTo(w-20.5,27.5);x.closePath();x.fill();
  /* status card */
  let top=60;const cd=o.card,ca=cd?(cd.a??1):0;if(ca>0){x.save();x.globalAlpha*=ca;const cw=w-20,cx=10,cy=60,col=(cw-24)/2,rows=cd.rows;
    x.font=s5_FNT(600,12);const rh=rows.map(r=>Math.max(...r.filter(Boolean).map(([k,v])=>rfWrap(x,v,col-4).length))*15+16);const chh=58+rh.reduce((s,a)=>s+a,0)+4;
    x.shadowColor='rgba(20,30,60,.08)';x.shadowBlur=6;x.shadowOffsetY=1;x.beginPath();x.roundRect(cx,cy,cw,chh,10);x.fillStyle='#0b1324';x.fill();x.shadowColor='transparent';x.strokeStyle='#1c2944';x.stroke();
    x.fillStyle='#7d8ba8';x.font=s5_FNT(400,10);x.fillText(cd.label||'What we found on your account',cx+12,cy+15);x.letterSpacing='0px';
    x.font=s5_FNT(600,10);const st=cd.status,sw=x.measureText(st).width+24;x.beginPath();x.roundRect(cx+12,cy+26,sw,19,9.5);x.fillStyle=cd.bg||'#16223d';x.fill();
    x.fillStyle=cd.dot||'#9aa7c2';x.beginPath();x.arc(cx+20,cy+35.5,2.2,0,6.283);x.fill();x.fillStyle=cd.fg||'#9aa7c2';x.fillText(st,cx+27,cy+36);
    let yy=cy+56;rows.forEach((r,j)=>{r.forEach((c,k)=>{if(!c)return;const xx=cx+12+k*(col+4);x.fillStyle='#7d8ba8';x.font=s5_FNT(400,9.5);x.fillText(c[0],xx,yy+5);
      x.fillStyle='#e8edf7';x.font=s5_FNT(600,12);rfWrap(x,c[1],col-4).forEach((l,n)=>x.fillText(l,xx,yy+19+n*15))});yy+=rh[j]});
    x.restore();top=cy+chh*ca+10}
  /* bottom: chips + input */
  const chipY=h-90,inY=h-50;x.fillStyle='#0b1324';x.fillRect(0,chipY-12,w,h-chipY+12);x.fillStyle='#1c2944';x.fillRect(0,chipY-12,w,1);
  let cxp=10;x.font=s5_FNT(500,10.5);for(const c of(o.chips||['Charged after cancelling','I paid but have no premium'])){const cw=x.measureText(c).width+22;x.beginPath();x.roundRect(cxp,chipY,cw,26,13);x.fillStyle='#0b1324';x.fill();x.strokeStyle='#2a3a5c';x.stroke();
    x.fillStyle='#e8edf7';x.fillText(c,cxp+11,chipY+13.5);cxp+=cw+6}
  x.beginPath();x.roundRect(10,inY,w-60,36,18);x.fillStyle='#0b1324';x.fill();x.lineWidth=1;x.strokeStyle='#2a3a5c';x.stroke();
  x.font=s5_FNT(400,12);x.fillStyle='#7d8ba8';x.fillText(o.ph||'Describe the problem…',22,inY+18.5);
  x.fillStyle='#1b2a4a';x.beginPath();x.arc(w-28,inY+18,17,0,6.283);x.fill();x.strokeStyle='#e8edf7';x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(w-35,inY+18);x.lineTo(w-21,inY+18);x.moveTo(w-27,inY+12);x.lineTo(w-21,inY+18);x.lineTo(w-27,inY+24);x.stroke();
  /* chat: bubbles, link buttons, notes; newest kept in view */
  const bot=chipY-18;x.save();x.beginPath();x.rect(0,top-4,w,bot-top+4);x.clip();
  const fs=o.fs||12.5,lh=fs*1.32,ms=(o.msgs||[]).filter(m=>(m.a??1)>0),mw=(w-20)*.84;
  const lay=ms.map(m=>{if(m.link){x.font=s5_FNT(600,11);return{m,bw:x.measureText(m.link).width+42,bh:30}}
    if(m.note){x.font=s5_FNT(m.kind==='green'?600:400,11);const L1=rfWrap(x,m.note,mw-30);return{m,L1,bw:mw,bh:L1.length*15+16}}
    x.font=s5_FNT(m.me?500:400,fs);const L1=rfWrap(x,m.text,mw-20);return{m,L1,bw:Math.min(mw,Math.max(...L1.map(l=>x.measureText(l).width))+20),bh:L1.length*lh+14}});
  const tot=lay.reduce((s,q)=>s+q.bh+8,0);let y=top+4-Math.max(0,tot-(bot-top-4));
  for(const q of lay){const m=q.m;x.save();x.globalAlpha*=m.a??1;
    if(m.link){x.beginPath();x.roundRect(10,y,q.bw,q.bh,15);x.fillStyle='#0b1324';x.fill();x.strokeStyle='#2a3a5c';x.lineWidth=1.2;x.stroke();
      x.fillStyle='#e8edf7';x.font=s5_FNT(600,11);x.fillText(m.link,22,y+15.5);x.font=s5_FNT(600,12);x.fillText('↗',q.bw-6,y+15.5)}
    else if(m.note){const gr=m.kind==='green',nx=gr?(w-q.bw)/2:10;x.beginPath();x.roundRect(nx,y,q.bw,q.bh,8);x.fillStyle=gr?'#0f2b2f':'#2a2117';x.fill();
      x.font=s5_FNT(gr?600:400,11);x.fillStyle=gr?'#3fd0c0':'#ffa84c';if(gr){x.textAlign='center';q.L1.forEach((l,n)=>x.fillText(l,w/2,y+15+n*15));x.textAlign='left'}
      else{x.fillStyle='#ffa84c';x.beginPath();x.arc(nx+12,y+15,2.6,0,6.283);x.fill();x.fillStyle='#ffa84c';q.L1.forEach((l,n)=>x.fillText(l,nx+22,y+15+n*15))}}
    else{const bx=m.me?w-10-q.bw:10;x.beginPath();x.roundRect(bx,y,q.bw,q.bh,12);x.fillStyle=m.me?'#1b2a4a':'#101a30';x.fill();if(!m.me){x.fillStyle='#ffa84c';x.fillRect(bx,y+2,2.5,q.bh-4)}
      x.fillStyle='#e8edf7';x.font=s5_FNT(m.me?500:400,fs);q.L1.forEach((l,n)=>x.fillText(l,bx+10,y+7+lh/2+n*lh))}
    x.restore();y+=q.bh+8}
  x.restore();x.restore()}
/* Lucía (Spanish UI, like the real localized app) and Ava */
const s5_LU={title:'Ayuda de Lumen',sub:'Suscripción',who:'Lucía',ph:'Describe el problema…',chips:['Me cobraron después de cancelar','Pagué y no tengo premium'],
  card:{label:'Lo que encontramos en tu cuenta',status:'Prueba — el pago falló',dot:'#ff7a6b',bg:'#2d1a20',fg:'#ff7a6b',rows:[[['Paquete','Lumen Premium Weekly'],['Comprado en','Google Play']],[['Pagado','Nunca'],['Prueba','pago fallido']]]}};
const s5_LU_Q='Mi prueba terminó y no tengo premium',s5_LU_R='El pago de tu prueba de Lumen Premium Weekly no se completó en Google Play, así que nunca se cobró. Para seguir, actualiza tu método de pago en Google Play: play.google.com/store/paymentmethods';
const s5_AV={who:'Ava · 00239',card:{status:"Ended: the payment didn't go through",dot:'#ff7a6b',bg:'#2d1a20',fg:'#ff7a6b',rows:[[['Package','Lumen Premium Weekly'],['Bought on','App Store']],[['Price','6.99 USD'],['Payment failed on','22 Oct 2026']]]}};
const s5_AV_R="Your Lumen Premium Weekly subscription ended on 22 October 2026 because App Store couldn't take the renewal payment. Please update your payment method in your Apple account. I've asked the team to review a 3-day courtesy extension of your access. It isn't active yet — it only starts if they approve it.";
const s5_AV_N="Requested. The Lumen team will review it. Nothing changes until they decide; you'll see it here.",s5_AV_G="Good news — the Lumen team added Premium until Nov 7, 2026. It's active now.";
/* 2D phone (black frame, white Lumen Help screen) centred at cx,cy, h tall */
function s5_phone2(g,cx,cy,h,pop,o){const w=h*.49;if(pop<=0)return;g.save();g.translate(cx,cy);g.rotate(-.03);const sc=bk(cl(pop));g.scale(sc,sc);
  g.shadowColor='rgba(80,230,150,.55)';g.shadowBlur=40;g.beginPath();g.roundRect(-w/2,-h/2,w,h,w*.13);g.fillStyle='#16181d';g.fill();g.shadowColor='transparent';
  g.lineWidth=2;g.strokeStyle='rgba(200,210,235,.35)';g.stroke();const m=w*.045,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.1);g.clip();
  g.translate(-sw/2,-sh/2);s5_lh(g,sw,sh,o);g.restore();g.restore()}

/* ---------- the developer console in the team's NIGHT SHIFT design (case-desk-design casedesk/app/static/v2, tokens at the
   top of base.css; fixes on bagley/night-shift-fixes): navy panes, IBM Plex, amber = needs your OK, teal = checked, coral =
   problem. Evidence column collapsed ("Evidence ▸"), "Needs a person" pinned in the list, the dock is count-first
   ("1 waiting for your OK") with ONE big decision card. Drawn in its own space (1000 x 720, s5_NW x s5_NH) and seen through
   a 1000 x 460 window (y 110–570): beat 2 shows the top at 1:1, beat 3 zooms onto the decision card. */
const s5_N={page:'#070b14',pane:'#0b1324',raised:'#101a30',sel:'#16223d',line:'#1c2944',line2:'#2a3a5c',ink:'#e8edf7',ink2:'#9aa7c2',ink3:'#7d8ba8',
  amb:'#ffa84c',ambOn:'#1f1200',ambSoft:'#2a2117',teal:'#3fd0c0',tealSoft:'#0f2b2f',coral:'#ff7a6b'};
const s5_NW=1000,s5_NH=720,s5_VW=[70,110,1000,460];
function s5_t(g,x,y,s,fs,col,o={}){g.font=`${o.w||400} ${fs}px ${o.m?'"IBM Plex Mono",monospace':'"IBM Plex Sans",sans-serif'}`;g.fillStyle=col;g.textAlign=o.al||'left';g.textBaseline='middle';
  if(o.max&&g.measureText(s).width>o.max){while(s.length>2&&g.measureText(s+'…').width>o.max)s=s.slice(0,-1);s=s.trimEnd()+'…'}g.fillText(s,x,y);return g.measureText(s).width}
function s5_box(g,x,y,w,h,r,fill,stroke,lw=1){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke()}}
function s5_ck(g,x,y,s,c,lw=2){g.save();g.strokeStyle=c;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(x-s*.5,y);g.lineTo(x-s*.12,y+s*.38);g.lineTo(x+s*.55,y-s*.42);g.stroke();g.restore()}
function s5_sq(g,x,y,c,s=9,hollow){if(hollow){g.lineWidth=2;g.strokeStyle=c;g.strokeRect(x-s/2+1,y-s/2+1,s-2,s-2)}else{g.fillStyle=c;g.fillRect(x-s/2,y-s/2,s,s)}}
function s5_who(g,x,y,name,id,fs=14){const w=s5_t(g,x,y,name,fs,s5_N.ink,{w:600});return w+6+s5_t(g,x+w+6,y+1,id,fs-1.5,s5_N.ink3,{m:1})}
const s5_REPLY3=["Your Lumen Premium Weekly subscription ended on 22 October 2026 because App","Store couldn't take the renewal payment. Please update your payment method …","I've asked the team to review a 3-day courtesy extension. It isn't active yet."];
const s5_GIVEN='Premium given to Ava · until 7 Nov 2026';
/* regions (console space) the beat-2 spotlight moves between: facts, actions, the checked reply */
const s5_RG={facts:[288,90,690,62],actions:[288,316,690,104],reply:[288,226,690,86]};
/* st = {spot:[x,y,w,h,a,tag], press 0..1, flash 0..1, done 0..1 (card collapses into the given line), T} → button rect */
function s5_nsConsole(g,st){const N=s5_N,W=s5_NW,H=s5_NH,done=st.done||0,flash=st.flash||0;let btn=null;
  g.fillStyle=N.page;g.fillRect(0,0,W+200,H);
  /* top bar */
  g.fillStyle=N.pane;g.fillRect(0,0,W+200,40);g.fillStyle=N.line;g.fillRect(0,40,W+200,1);
  s5_sq(g,20,20,N.amb,10);const hw=s5_t(g,32,20,'Case Desk',16,N.ink,{w:600});s5_t(g,40+hw,21,'for Lumen',13,N.ink3);
  s5_t(g,W-18,21,'02:00',13,N.ink3,{m:1,al:'right'});s5_t(g,W-66,21,'Live',13,N.ink2,{al:'right'});s5_sq(g,W-104,21,N.teal,10,1);
  s5_t(g,W-130,21,'Demo data',13,N.ink3,{al:'right'});
  /* the cases list (left, 270) — "Needs a person" pinned first, in its own ink (not amber) */
  const LW=270;g.fillStyle=N.pane;g.fillRect(0,41,LW,H);g.fillStyle=N.line;g.fillRect(LW,41,1,H);
  let cw=s5_t(g,18,64,'Cases',15,N.ink,{w:600});s5_t(g,26+cw,65,'18',13,N.ink3,{m:1});
  const pin=(y)=>{g.save();g.strokeStyle=N.ink2;g.lineWidth=1.6;g.beginPath();g.arc(24,y-3,3.2,0,6.283);g.stroke();g.beginPath();g.arc(24,y+7,6,Math.PI*1.1,Math.PI*1.9);g.stroke();g.restore()};
  pin(94);cw=s5_t(g,36,94,'Needs a person',13,N.ink2,{w:600});s5_t(g,44+cw,95,'2',13,N.ink3,{m:1});
  const row=(y,name,id,when,msg,lab,lc,o={})=>{if(o.sel){g.fillStyle=N.sel;g.fillRect(0,y,LW,50);g.fillStyle=N.ink;g.fillRect(0,y,3,50)}
    s5_sq(g,22,y+16,o.dot||N.ink3,8,o.hollow);s5_who(g,34,y+16,name,id,14);s5_t(g,LW-16,y+16,when,12.5,N.ink3,{al:'right'});
    let lw=0;if(lab){lw=s5_t(g,LW-16,y+35,lab,13,lc,{w:600,al:'right'})+10}s5_t(g,34,y+35,msg,13,N.ink2,{max:LW-50-lw});g.fillStyle=N.line;g.fillRect(0,y+50,LW,1)};
  row(108,'Isla','00185','3 Nov','I want to talk to a real person','asked for a person',N.ink2,{hollow:1,dot:N.ink2});
  row(159,'Benjamin','00044','2 Nov','Please delete my account and all my data','privacy request',N.ink2,{hollow:1,dot:N.ink2});
  g.fillStyle=N.line2;g.fillRect(0,212,LW,2);
  row(216,'Ava','00239','now','I paid but have no premium',done>.5?null:'waiting',N.amb,{sel:1,dot:N.coral});
  row(267,'Marko','00009','now','Naplatili ste mi pretplatu posle otkazivanja!');
  row(318,'Oliver','03873','3 Nov','I cancelled the free trial but I think you still charged me');
  row(369,'Harry','01826','3 Nov','Can I get my money back? I don\'t use the app',null,null,{hollow:1});
  row(420,'Lukas','00998','3 Nov','Ich habe mein Abo gekündigt und trotzdem bezahlt');
  row(471,'Léa','00359','3 Nov','Bonjour, comment est-ce que je peux annuler ?',null,null,{hollow:1});
  row(522,'Giulia','00095','3 Nov','Ho cambiato telefono e adesso l\'app non mi riconosce');
  row(573,'Jelena','01941','3 Nov','Otkazala sam pretplatu, a opet ste mi skinuli novac');
  row(624,'Madison','01067','3 Nov','When will I actually be charged? I\'m still on trial',null,null,{hollow:1});
  /* the case (rest of the width; evidence collapsed) */
  const x0=LW+28,R=W-28;g.fillStyle=N.pane;g.fillRect(LW+1,41,W-LW+200,H);
  s5_who(g,x0,62,'Ava','00239',17);s5_t(g,x0+104,63,'English  ·  App Store  ·  Lumen Premium Weekly',13,N.ink2);
  g.font='400 13px "IBM Plex Sans",sans-serif';const ew=g.measureText('Evidence').width+36;s5_box(g,R-ew,49,ew,28,6,null,N.line2);s5_t(g,R-ew+11,63.5,'Evidence',13,N.ink2);
  g.save();g.strokeStyle=N.ink2;g.lineWidth=1.6;g.beginPath();g.moveTo(R-17,58.5);g.lineTo(R-12,63.5);g.lineTo(R-17,68.5);g.stroke();g.restore();
  g.fillStyle=N.line;g.fillRect(LW+1,84,W-LW,1);
  s5_sq(g,x0+4,104,N.coral,9);s5_t(g,x0+16,104,"Ended: the payment didn't go through",13.5,N.coral,{w:600});
  {let fs=24;const s="Paid, then the App Store couldn't take the renewal on 22 Oct";g.font=`600 ${fs}px "IBM Plex Sans",sans-serif`;while(g.measureText(s).width>R-x0&&fs>19){fs-=.5;g.font=`600 ${fs}px "IBM Plex Sans",sans-serif`}
    s5_t(g,x0,133,s,fs,N.ink,{w:600})}
  s5_ck(g,x0+6,170,10,N.teal,2);s5_t(g,x0+20,170,'Every fact in the reply matches the account.',14,N.teal);
  g.fillStyle=N.line;g.fillRect(x0,190,R-x0,1);
  /* the conversation */
  g.fillStyle=N.line2;g.fillRect(x0,198,2,24);s5_t(g,x0+14,204,'Ava',13,N.ink,{w:600});s5_t(g,x0+50,205,'I paid but have no premium',14,N.ink);s5_t(g,R,204,'01:58',12.5,N.ink3,{m:1,al:'right'});
  g.fillStyle=N.amb;g.fillRect(x0,232,2,76);let cdw=s5_t(g,x0+14,240,'Case Desk',13,N.amb,{w:600});
  {const pv=1+.08*cl((st.ckPulse||0))*Math.max(0,Math.sin((st.T||0)*6));g.save();g.translate(x0+26+cdw,240);g.scale(pv,pv);s5_ck(g,4,0,9,N.teal,1.8);s5_t(g,14,0,'Checked',13,N.teal,{w:600});g.restore()}
  s5_t(g,R,240,'01:58',12.5,N.ink3,{m:1,al:'right'});
  s5_REPLY3.forEach((l,k)=>s5_t(g,x0+14,262+k*20,l,14,N.ink,{max:R-x0-14}));
  /* What Case Desk did */
  s5_t(g,x0,330,'What Case Desk did',13.5,N.teal,{w:600});
  ['Explained what happened','Sent the link to update payment','Sent the link to manage the subscription'].forEach((s,k)=>{s5_ck(g,x0+8,352+k*20,10,N.teal,1.8);s5_t(g,x0+24,352+k*20,s,14,N.ink)});
  s5_sq(g,x0+8,412,done>.5?N.teal:N.amb,8);s5_t(g,x0+24,412,'Asked you for a 3-day courtesy extension',14,N.ink,{w:600});
  /* the dock: count first, then the ONE big decision card; after the click it collapses into the teal "given" line */
  const dy=438;g.fillStyle=N.raised;g.fillRect(LW+1,dy,W-LW+200,H-dy);g.fillStyle=done>.5?N.teal:N.amb;g.fillRect(LW+1,dy,W-LW+200,3);
  if(done<.5){g.save();g.globalAlpha*=1-cl(done*2.2);const nw=s5_t(g,x0,dy+24,'1',17,N.amb,{w:600,m:1});s5_t(g,x0+nw+8,dy+24,'waiting for your OK',17,N.amb,{w:600});
    s5_t(g,R,dy+25,'3 days of premium asked for',13,N.ink3,{al:'right'});g.restore()}
  else{g.save();g.globalAlpha*=cl(done*2-1);s5_t(g,x0,dy+24,'Nothing waiting',17,N.ink2,{w:600});g.restore()}
  const cy=dy+44,chFull=176,ch=L(chFull,56,sm(cl(done)));
  g.save();if(flash>0){g.shadowColor=`rgba(63,208,192,${.8*flash})`;g.shadowBlur=40*flash}
  s5_box(g,x0-8,cy,R-x0+16,ch,8,done>.5?N.tealSoft:N.pane,flash>0?`rgba(63,208,192,${.5+.5*flash})`:N.line2,flash>0?2:1);g.restore();
  if(done<1){g.save();g.beginPath();g.rect(x0-8,cy,R-x0+16,ch);g.clip();g.globalAlpha*=1-cl(done*2.5);
    s5_sq(g,x0+6,cy+22,N.amb,8);let kw=s5_t(g,x0+18,cy+22,'Case Desk asks you to confirm',13,N.ink2);s5_t(g,R-8,cy+22,'02:00',12.5,N.ink3,{m:1,al:'right'});
    let w=s5_t(g,x0+4,cy+52,'Ava',24,N.ink,{w:600});w+=s5_t(g,x0+14+w,cy+54,'00239',14,N.ink3,{m:1})+24;s5_t(g,x0+4+w,cy+52,'3 days of premium',24,N.ink,{w:600});
    s5_t(g,x0+4,cy+80,"Paid, then the App Store couldn't take the renewal on 22 Oct.",14,N.ink2);
    s5_t(g,x0+4,cy+100,'Ava gets premium for 3 days. Nothing else changes.',14,N.ink);
    const bl='Give Ava 3 days of premium';g.font='600 17px "IBM Plex Sans",sans-serif';const bw=g.measureText(bl).width+56,bh=50,bx=x0+4,by=cy+114,pr=1-.05*(st.press||0);
    const fm=(a,b,q)=>`rgb(${Math.round(L(a[0],b[0],q))},${Math.round(L(a[1],b[1],q))},${Math.round(L(a[2],b[2],q))})`,fc=flash<=0?N.amb:flash<.4?fm([255,168,76],[255,250,235],flash/.4):fm([255,250,235],[63,208,192],(flash-.4)/.6);
    g.save();g.translate(bx+bw/2,by+bh/2);g.scale(pr,pr);g.shadowColor='rgba(255,168,76,.45)';g.shadowBlur=flash>0?0:18;s5_box(g,-bw/2,-bh/2,bw,bh,8,fc);g.shadowColor='transparent';
    if(flash>.5){s5_ck(g,-bw/2+24,0,13,N.ambOn,2.6);s5_t(g,8,1,'Giving…',17,N.ambOn,{w:600,al:'center'})}else s5_t(g,0,1,bl,17,N.ambOn,{w:600,al:'center'});g.restore();
    btn=[bx,by,bw,bh];
    s5_box(g,bx+bw+12,by,92,bh,8,null,N.line2);s5_t(g,bx+bw+58,by+bh/2+1,'Deny',17,N.ink,{w:600,al:'center'});
    s5_t(g,bx+bw+120,by+bh/2+1,'Nothing is granted until you approve.',13,N.ink3);
    g.restore()}
  if(done>0){const a=cl(done*2-.8);if(a>0){g.save();g.globalAlpha*=a;const s=.92+.08*bk(cl(done*1.4-.4));g.translate(x0+6,cy+28);g.scale(s,s);
    g.fillStyle=N.teal;g.beginPath();g.arc(12,0,12,0,6.283);g.fill();s5_ck(g,12,0,12,N.pane,2.6);s5_t(g,34,1,s5_GIVEN,20,N.teal,{w:600});g.restore()}}
  /* the beat-2 spotlight: dims the rest, a thin ink outline + a tag */
  const sp=st.spot;if(sp&&sp[4]>0){const [x,y,w,h,a,tag]=sp;g.save();g.globalAlpha*=a;g.beginPath();g.rect(0,0,W,H);g.roundRect(x-8,y-8,w+16,h+16,10);g.fillStyle='rgba(3,6,12,.55)';g.fill('evenodd');
    g.strokeStyle='rgba(232,237,247,.95)';g.lineWidth=2;g.beginPath();g.roundRect(x-8,y-8,w+16,h+16,10);g.stroke();
    if(tag){g.font='600 14px "IBM Plex Sans",sans-serif';const tw=g.measureText(tag).width+24;s5_box(g,x+w+8-tw,y+h-5,tw,26,13,N.ink);s5_t(g,x+w+8-tw/2,y+h+8.5,tag,14,N.page,{w:600,al:'center'})}g.restore()}
  return btn}

/* view: console point F at the window centre, zoom z; returns the console→screen mapping */
function s5_view(F,z){const [vx,vy,vw,vh]=s5_VW,cx=vx+vw/2,cy=vy+vh/2;return{z,tx:cx-F[0]*z,ty:cy-F[1]*z,at:(x,y)=>[cx+(x-F[0])*z,cy+(y-F[1])*z]}}
function s5_drawConsole(g,t,c,i,T,A){if(i<3)return;const o=S5.built;if(!o)return;
  const gq=i===3?s5_E(c(3)+.1,c(3)+.9,t):1;if(gq<=0)return;
  /* beat 2 spotlight: facts → actions → the reply the checker passed */
  const pas=A(3,'passed'),E=(w,d=.3)=>s5_E(A(3,w)-.2,A(3,w)+d,t);let spot=null,ckp=0;
  if(i===3){const k1=E('facts'),k2=E('actions'),k3=E('reply'),off=1-s5_E(pas+.25,pas+.55,t),R1=s5_RG.facts,R2=s5_RG.actions,R3=s5_RG.reply;
    const r=R1.map((v,k)=>L(L(v,R2[k],k2),R3[k],k3));ckp=s5_E(A(3,'checker')-.2,A(3,'checker')+.2,t)*off;
    spot=[...r,k1*off,k3>.5?'the reply the checker passed':k2>.5?'the actions policy chose':'the facts']}
  /* beat 3: the camera pans and zooms onto the decision card (from the end of beat 2), the click lands on 'approve' */
  const ap=A(4,'approve'),zs=Math.min(pas+.4,c(4)-.25),zp=s5_E(zs,Math.max(zs+.5,c(4)+.32),t);
  const press=i===4?cl(1-Math.abs(t-ap-.04)/.1):0,flash=i===4?cl((t-ap)/.12)*(1-s5_E(ap+.35,ap+.7,t)):0,done=i===4?s5_E(ap+.3,ap+.85,t):0;
  const F=[L(L(500,628,zp),680,done),L(L(230,586,zp),420,done)],z=L(L(1,1.36,zp),1.22,done),V=s5_view(F,z);
  const [vx,vy,vw,vh]=s5_VW,gs=L(.12,1,gq);let lx=vx+vw/2,ly=vy+vh/2;if(gq<1){const p=X3.at(S5,o.lapPt);lx=L(p[0],lx,gq);ly=L(p[1],ly,gq)}
  g.save();g.globalAlpha*=cl(gq*3);g.translate(lx,ly);g.scale(gs,gs);g.translate(-(vx+vw/2),-(vy+vh/2));
  g.save();g.shadowColor='rgba(0,0,0,.6)';g.shadowBlur=34;g.shadowOffsetY=10;s5_box(g,vx,vy,vw,vh,12,s5_N.page);g.restore();
  g.save();g.beginPath();g.roundRect(vx,vy,vw,vh,12);g.clip();g.translate(V.tx,V.ty);g.scale(z,z);
  const btn=s5_nsConsole(g,{spot,press,flash,done,ckPulse:ckp,T});g.restore();
  s5_box(g,vx+.5,vy+.5,vw-1,vh-1,12,null,s5_N.line2,1.5);
  /* the click: a teal ring bursts from the button */
  if(btn&&i===4){const [bx,by]=V.at(btn[0]+btn[2]/2,btn[1]+btn[3]/2);const r=cl((t-ap)/.6);
    if(r>0&&r<1){g.save();g.globalAlpha*=(1-r);g.lineWidth=4;g.strokeStyle='#3fd0c0';g.beginPath();g.ellipse(bx,by,btn[2]*z*.5+70*r,btn[3]*z*.5+50*r,0,0,6.283);g.stroke();g.restore()}
    /* the cursor: in from the lower right during the zoom, presses on 'approve', leaves */
    const c0=zs+.1,q=sm(cl((t-c0)/Math.max(.3,ap-.06-c0))),ca=cl((t-c0)*5)*(1-s5_E(ap+.5,ap+.8,t));
    if(ca>0){const px=L(1010,bx+40,q),py=L(560,by+10,q);g.save();g.globalAlpha*=ca;g.translate(px,py);const ps=1.5*(1-.14*press);g.scale(ps,ps);
      g.beginPath();g.moveTo(0,0);g.lineTo(0,26);g.lineTo(7,20);g.lineTo(12,31);g.lineTo(17,29);g.lineTo(12,18);g.lineTo(21,18);g.closePath();
      g.fillStyle='#ffffff';g.fill();g.lineWidth=2;g.strokeStyle='#070b14';g.stroke();g.restore()}}
  g.restore()}
/* Ava's phone (Night Shift help screen, dark) pops up on the right once she has premium again */
function s5_nsHelp(x,W,H){const N=s5_N,u=W/250,w=250,h=H/u;x.save();x.scale(u,u);x.textBaseline='middle';
  x.fillStyle='#0d1629';x.fillRect(0,0,w,h);x.fillStyle=N.pane;x.fillRect(0,0,w,56);x.fillStyle=N.line;x.fillRect(0,56,w,1);
  x.fillStyle='#1c2230';x.beginPath();x.roundRect(10,11,34,34,8);x.fill();x.lineWidth=3;x.strokeStyle='#f08a4b';x.beginPath();x.arc(27,28,8.5,-2.6,.6);x.stroke();x.strokeStyle='#5b86f2';x.beginPath();x.arc(27,28,8.5,.8,3.4);x.stroke();
  x.fillStyle='#fff';x.beginPath();x.arc(27,28,3,0,6.283);x.fill();
  s5_t(x,52,21,'Lumen Help',16,N.ink,{w:600});s5_t(x,52,40,'Subscription',12,N.ink3);
  s5_box(x,174,14,66,28,6,null,N.line2);s5_t(x,184,28.5,'Ava',14,N.ink,{w:600});x.fillStyle=N.ink2;x.beginPath();x.moveTo(220,25);x.lineTo(230,25);x.lineTo(225,31);x.closePath();x.fill();
  /* status band: granted (teal = checked / true) */
  x.fillStyle=N.tealSoft;x.fillRect(0,57,w,166);x.fillStyle=N.teal;x.fillRect(0,57,3,166);
  s5_t(x,14,77,'What we found on your account',12,N.ink2);s5_sq(x,19,103,N.teal,11,1);s5_t(x,32,103,'Premium given by the team',16,N.ink,{w:600});
  s5_t(x,14,133,'Plan',12,N.ink2);s5_t(x,14,152,'Lumen Premium',15,N.ink,{w:600});s5_t(x,140,133,'Given until',12,N.ink2);s5_t(x,140,152,'Nov 7, 2026',15,N.teal,{w:600});
  s5_t(x,14,182,'Days left',12,N.ink2);s5_t(x,14,201,'3 days',15,N.ink,{w:600});
  /* the turns */
  x.font='400 14px "IBM Plex Sans",sans-serif';const um='I paid but have no premium',uw=x.measureText(um).width+24;s5_box(x,w-10-uw,240,uw,34,8,'#1b2a4a');s5_t(x,w-10-uw+12,257.5,um,14,N.ink);
  s5_box(x,10,286,w-20,54,6,N.raised);x.fillStyle=N.amb;x.fillRect(10,286,2.5,54);s5_t(x,22,303,"…It isn't active yet and only",13,N.ink2);s5_t(x,22,323,'starts if they approve it.',13,N.ink2);
  s5_box(x,10,352,w-20,70,6,N.tealSoft,'rgba(63,208,192,.65)');s5_ck(x,26,372,11,N.teal,2.2);s5_t(x,40,372,'The Lumen team approved',14,N.teal,{w:600});
  s5_t(x,22,396,'access until 7 November 2026.',14,N.ink);
  const cy=h-54;x.fillStyle=N.pane;x.fillRect(0,cy-10,w,h);x.fillStyle=N.line;x.fillRect(0,cy-10,w,1);
  s5_box(x,10,cy,180,38,6,null,N.line2);s5_t(x,22,cy+19.5,'Describe the problem…',13,N.ink3);s5_box(x,198,cy,42,38,6,'#1b2a4a');
  x.strokeStyle=N.ink;x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(211,cy+19);x.lineTo(227,cy+19);x.moveTo(221,cy+13);x.lineTo(227,cy+19);x.lineTo(221,cy+25);x.stroke();
  x.restore()}
function s5_drawAva(g,t,c,i,T,A){if(i!==4)return;const t0=A(4,'ava')-.25,pp=cl((t-t0)/.45);if(pp<=0)return;
  const h=462,w=h*.49,cx=958,cy=340;g.save();g.translate(cx,cy);g.rotate(.025);const sc=bk(pp);g.scale(sc,sc);
  g.shadowColor='rgba(63,208,192,.5)';g.shadowBlur=44;s5_box(g,-w/2,-h/2,w,h,w*.13,'#05080f');g.shadowColor='transparent';s5_box(g,-w/2,-h/2,w,h,w*.13,null,'rgba(160,180,215,.45)',2);
  const m=w*.04,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.1);g.clip();g.translate(-sw/2,-sh/2);s5_nsHelp(g,sw,sh);g.restore();g.restore()}
/* the narration starts at Lucía (the old "Money needs more care." beat was cut): the pose/console code keeps its 5-beat
   numbering (1 Lucía … 4 approve) through this remap; beat 1's camera move starts from the wide shot. */
const s5_c=c=>j=>c(Math.max(0,j-1)),s5_A=A=>(j,w)=>A(Math.max(0,j-1),w);
return rfRun({base:(g,t,c,T,i,A)=>{const c1=s5_c(c),A1=s5_A(A),i1=i+1;X3.draw(g,S5,o=>s5_pose(o,t,c1,i1,T,A1),t);s5_drawConsole(g,t,c1,i1,T,A1);s5_drawAva(g,t,c1,i1,T,A1)},
 b:[
  (g,p,d,T,W)=>{rfCard(g,780,150,410,214,{title:'LUCÍA · Spanish · Android',c:s5_ROSE,pop:P(p,.1,.45),body:(g,x,y,w,h)=>{
      txt(g,20,y+30,'Premium Weekly · free trial',{fs:22,c:PA,al:'left',a:P(p,W('trial')-.2,.4)});
      ic(g,'cross',30,y+70,11,rfRED,P(p,W('failed')-.1,.3));txt(g,50,y+70,'trial payment failed',{fs:21,w:700,c:rfRED,al:'left',a:P(p,W('failed')-.1,.4)});
      txt(g,20,y+108,'Google Play',{fs:17,c:'176,188,214',al:'left',a:P(p,W('failed')-.1,.4)});
      rfPill(g,w-90,y+108,'PAID: NEVER',{pop:P(p,W('never')-.1,.4),c:rfRED,fs:15})}});
    rfCard(g,780,380,410,118,{title:'THE ANSWER: UPDATE PAYMENT',c:rfDESK,pop:P(p,W('steps')-.25,.45),body:(g,x,y,w,h)=>{
      txt(g,20,y+26,'steps to fix the card, in Spanish',{fs:19,w:600,c:PA,al:'left'});
      txt(g,20,y+56,s5_URL,{fs:15,m:1,c:rfDESK,al:'left',a:P(p,W('card')-.2,.4)})}});
    rfStamp(g,505,478,'NO GRANT: NEVER PAID',{p:P(p,W('no')-.05,.35),c:rfRED,fs:28})},
  (g,p,d,T,W)=>{rfCard(g,780,150,410,180,{title:'AVA · English · iPhone',c:s5_CYAN,pop:P(p,.1,.45),body:(g,x,y,w,h)=>{
      txt(g,20,y+26,'Premium Weekly',{fs:20,c:PA,al:'left'});
      ic(g,'check',30,y+64,11,rfGO,P(p,W('pay')-.1,.3));txt(g,50,y+64,'paid 6.99 USD · 15 Oct',{fs:21,w:700,c:rfGO,al:'left',a:P(p,W('pay')-.1,.4)});
      ic(g,'cross',30,y+102,11,rfRED,P(p,W('billing')-.1,.3));txt(g,50,y+102,'billing error · 22 Oct',{fs:21,w:700,c:rfRED,al:'left',a:P(p,W('billing')-.1,.4)})}});
    rfCard(g,780,346,410,150,{title:'THE REPLY ENDS',c:rfDESK,pop:P(p,W('asks')-.2,.45),body:(g,x,y,w,h)=>{
      g.font='400 19px "IBM Plex Sans",sans-serif';rfWrap(g,"“I've asked the team to review a 3-day courtesy extension of your access.",w-40).forEach((l,k)=>txt(g,20,y+26+k*26,l,{fs:19,c:PA,al:'left'}));
      txt(g,20,y+84,"It isn't active yet.”",{fs:21,w:700,c:rfGOLD,al:'left',a:P(p,W('tells')-.1,.4),glow:8})}});
    const o=S5.built;if(o&&o.env&&o.env.visible){const [x,y]=X3.at(S5,o.env);rfChip(g,x,y-46,'request: 3-day courtesy',{pop:P(p,W('team')+.1,.4),c:rfDESK,fs:15})}
    rfPill(g,920,528,'REQUESTED · NOT ACTIVE YET',{pop:P(p,W('active')-.3,.4),c:rfGOLD,fs:15})},
  ()=>{},()=>{}]},4)
})()
