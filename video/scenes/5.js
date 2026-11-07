/* Scene 5 — "Lucía and Ava" (4 beats: Lucía, Ava, console, approve). Stage "the money room": two phones (white Lumen Help
   screens, s5_lh copied from scene 3's s3_lh; Lucía's in the localized Spanish UI) on glowing pedestals, the developer's desk
   at the back. Beat 0 Lucía (payment failed, update-payment steps, stamp "no grant: never paid", the gift box's lid slams).
   Beat 1 Ava (paid → billing error → "requested, not active yet", an envelope flies to the developer). Beats 2–3 (REV 2):
   the REDESIGNED console grows out of the laptop (docs/screens/console-pending-1280.png / console-approved-1280.png): left
   "Waiting for approval" card with ONE green "Give Ava 3 days of premium" + Deny, "Cases"; right one calm case card. Amber
   outline on the status line (facts) → "What Case Desk did" (actions) → reply + "Checked" pill (checker). Beat 3: a cursor
   clicks the green button, the left card goes ("Nothing waiting for you."), the green "Premium given · expires 7 Nov,
   00:12" box appears, and Ava's white phone pops up with the "Good news" note. Helpers are scene-local (s5_). */
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
  x.fillStyle='#f3f4f7';x.fillRect(0,0,w,h);
  x.fillStyle='#ffffff';x.fillRect(0,0,w,50);x.fillStyle='#e2e5ea';x.fillRect(0,50,w,1);
  x.fillStyle='#1c2230';x.beginPath();x.roundRect(10,11,28,28,7);x.fill();x.lineWidth=2.6;
  x.strokeStyle='#f08a4b';x.beginPath();x.arc(24,25,7.5,-2.6,.6);x.stroke();x.strokeStyle='#5b86f2';x.beginPath();x.arc(24,25,7.5,.8,3.4);x.stroke();
  x.fillStyle='#ffffff';x.beginPath();x.arc(24,25,2.6,0,6.283);x.fill();
  x.textAlign='left';x.fillStyle='#121826';x.font=s5_FNT(700,15);x.fillText(o.title||'Lumen Help',46,20);x.fillStyle='#6b7280';x.font=s5_FNT(400,11);x.fillText(o.sub||'Subscription',46,36);
  x.font=s5_FNT(600,11);const who=o.who||'Ava · 00239',pw=x.measureText(who).width+30;x.beginPath();x.roundRect(w-10-pw,13,pw,24,12);x.fillStyle='#eef0f4';x.fill();x.strokeStyle='#d5d9e1';x.lineWidth=1;x.stroke();
  x.fillStyle='#1f2430';x.fillText(who,w-pw,25.5);x.beginPath();x.moveTo(w-24,23);x.lineTo(w-17,23);x.lineTo(w-20.5,27.5);x.closePath();x.fill();
  /* status card */
  let top=60;const cd=o.card,ca=cd?(cd.a??1):0;if(ca>0){x.save();x.globalAlpha*=ca;const cw=w-20,cx=10,cy=60,col=(cw-24)/2,rows=cd.rows;
    x.font=s5_FNT(600,12);const rh=rows.map(r=>Math.max(...r.filter(Boolean).map(([k,v])=>rfWrap(x,v,col-4).length))*15+16);const chh=58+rh.reduce((s,a)=>s+a,0)+4;
    x.shadowColor='rgba(20,30,60,.08)';x.shadowBlur=6;x.shadowOffsetY=1;x.beginPath();x.roundRect(cx,cy,cw,chh,10);x.fillStyle='#ffffff';x.fill();x.shadowColor='transparent';x.strokeStyle='#e2e5ea';x.stroke();
    x.fillStyle='#6b7280';x.font=s5_FNT(600,9);x.letterSpacing='1px';x.fillText(cd.label||'WHAT WE FOUND ON YOUR ACCOUNT',cx+12,cy+15);x.letterSpacing='0px';
    x.font=s5_FNT(600,10);const st=cd.status,sw=x.measureText(st).width+24;x.beginPath();x.roundRect(cx+12,cy+26,sw,19,9.5);x.fillStyle=cd.bg||'#e9ebf0';x.fill();
    x.fillStyle=cd.dot||'#374151';x.beginPath();x.arc(cx+20,cy+35.5,2.2,0,6.283);x.fill();x.fillStyle=cd.fg||'#374151';x.fillText(st,cx+27,cy+36);
    let yy=cy+56;rows.forEach((r,j)=>{r.forEach((c,k)=>{if(!c)return;const xx=cx+12+k*(col+4);x.fillStyle='#6b7280';x.font=s5_FNT(400,9.5);x.fillText(c[0],xx,yy+5);
      x.fillStyle='#111827';x.font=s5_FNT(600,12);rfWrap(x,c[1],col-4).forEach((l,n)=>x.fillText(l,xx,yy+19+n*15))});yy+=rh[j]});
    x.restore();top=cy+chh*ca+10}
  /* bottom: chips + input */
  const chipY=h-90,inY=h-50;x.fillStyle='#f6f7f9';x.fillRect(0,chipY-12,w,h-chipY+12);x.fillStyle='#e2e5ea';x.fillRect(0,chipY-12,w,1);
  let cxp=10;x.font=s5_FNT(500,10.5);for(const c of(o.chips||['Charged after cancelling','I paid but have no premium'])){const cw=x.measureText(c).width+22;x.beginPath();x.roundRect(cxp,chipY,cw,26,13);x.fillStyle='#eceef2';x.fill();x.strokeStyle='#d8dbe2';x.stroke();
    x.fillStyle='#1f2430';x.fillText(c,cxp+11,chipY+13.5);cxp+=cw+6}
  x.beginPath();x.roundRect(10,inY,w-60,36,18);x.fillStyle='#ffffff';x.fill();x.lineWidth=1;x.strokeStyle='#d8dbe2';x.stroke();
  x.font=s5_FNT(400,12);x.fillStyle='#9aa1ad';x.fillText(o.ph||'Describe the problem…',22,inY+18.5);
  x.fillStyle='#2f5be7';x.beginPath();x.arc(w-28,inY+18,17,0,6.283);x.fill();x.strokeStyle='#ffffff';x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(w-35,inY+18);x.lineTo(w-21,inY+18);x.moveTo(w-27,inY+12);x.lineTo(w-21,inY+18);x.lineTo(w-27,inY+24);x.stroke();
  /* chat: bubbles, link buttons, notes; newest kept in view */
  const bot=chipY-18;x.save();x.beginPath();x.rect(0,top-4,w,bot-top+4);x.clip();
  const fs=o.fs||12.5,lh=fs*1.32,ms=(o.msgs||[]).filter(m=>(m.a??1)>0),mw=(w-20)*.84;
  const lay=ms.map(m=>{if(m.link){x.font=s5_FNT(600,11);return{m,bw:x.measureText(m.link).width+42,bh:30}}
    if(m.note){x.font=s5_FNT(m.kind==='green'?600:400,11);const L1=rfWrap(x,m.note,mw-30);return{m,L1,bw:mw,bh:L1.length*15+16}}
    x.font=s5_FNT(m.me?500:400,fs);const L1=rfWrap(x,m.text,mw-20);return{m,L1,bw:Math.min(mw,Math.max(...L1.map(l=>x.measureText(l).width))+20),bh:L1.length*lh+14}});
  const tot=lay.reduce((s,q)=>s+q.bh+8,0);let y=top+4-Math.max(0,tot-(bot-top-4));
  for(const q of lay){const m=q.m;x.save();x.globalAlpha*=m.a??1;
    if(m.link){x.beginPath();x.roundRect(10,y,q.bw,q.bh,15);x.fillStyle='#ffffff';x.fill();x.strokeStyle='#2f5be7';x.lineWidth=1.2;x.stroke();
      x.fillStyle='#2f5be7';x.font=s5_FNT(600,11);x.fillText(m.link,22,y+15.5);x.font=s5_FNT(600,12);x.fillText('↗',q.bw-6,y+15.5)}
    else if(m.note){const gr=m.kind==='green',nx=gr?(w-q.bw)/2:10;x.beginPath();x.roundRect(nx,y,q.bw,q.bh,8);x.fillStyle=gr?'#dcf3e6':'#fbf0d9';x.fill();
      x.font=s5_FNT(gr?600:400,11);x.fillStyle=gr?'#167a50':'#8a5a0b';if(gr){x.textAlign='center';q.L1.forEach((l,n)=>x.fillText(l,w/2,y+15+n*15));x.textAlign='left'}
      else{x.fillStyle='#c9a35b';x.beginPath();x.arc(nx+12,y+15,2.6,0,6.283);x.fill();x.fillStyle='#8a5a0b';q.L1.forEach((l,n)=>x.fillText(l,nx+22,y+15+n*15))}}
    else{const bx=m.me?w-10-q.bw:10;x.beginPath();x.roundRect(bx,y,q.bw,q.bh,12);x.fillStyle=m.me?'#2f5be7':'#ffffff';x.fill();if(!m.me){x.strokeStyle='#dfe2e8';x.lineWidth=1;x.stroke()}
      x.fillStyle=m.me?'#ffffff':'#1f2430';x.font=s5_FNT(m.me?500:400,fs);q.L1.forEach((l,n)=>x.fillText(l,bx+10,y+7+lh/2+n*lh))}
    x.restore();y+=q.bh+8}
  x.restore();x.restore()}
/* Lucía (Spanish UI, like the real localized app) and Ava */
const s5_LU={title:'Ayuda de Lumen',sub:'Suscripción',who:'Lucía',ph:'Describe el problema…',chips:['Me cobraron después de cancelar','Pagué y no tengo premium'],
  card:{label:'LO QUE ENCONTRAMOS EN TU CUENTA',status:'Prueba — el pago falló',dot:'#c4323a',bg:'#fbe3e3',fg:'#a3262d',rows:[[['Paquete','Lumen Premium Weekly'],['Comprado en','Google Play']],[['Pagado','Nunca'],['Prueba','pago fallido']]]}};
const s5_LU_Q='Mi prueba terminó y no tengo premium',s5_LU_R='El pago de tu prueba de Lumen Premium Weekly no se completó en Google Play, así que nunca se cobró. Para seguir, actualiza tu método de pago en Google Play: play.google.com/store/paymentmethods';
const s5_AV={who:'Ava · 00239',card:{status:"Ended — the payment didn't go through",dot:'#c4323a',bg:'#fbe3e3',fg:'#a3262d',rows:[[['Package','Lumen Premium Weekly'],['Bought on','App Store']],[['Price','6.99 USD'],['Payment failed on','22 Oct 2026']]]}};
const s5_AV_R="Your Lumen Premium Weekly subscription ended on 22 October 2026 because App Store couldn't take the renewal payment. Please update your payment method in your Apple account. I've asked the team to review a 3-day courtesy extension of your access. It isn't active yet — it only starts if they approve it.";
const s5_AV_N="Requested — the Lumen team will review it. Nothing changes until they decide; you'll see it here.",s5_AV_G="Good news — the Lumen team added Premium until Nov 7, 2026. It's active now.";
/* 2D phone (black frame, white Lumen Help screen) centred at cx,cy, h tall */
function s5_phone2(g,cx,cy,h,pop,o){const w=h*.49;if(pop<=0)return;g.save();g.translate(cx,cy);g.rotate(-.03);const sc=bk(cl(pop));g.scale(sc,sc);
  g.shadowColor='rgba(80,230,150,.55)';g.shadowBlur=40;g.beginPath();g.roundRect(-w/2,-h/2,w,h,w*.13);g.fillStyle='#16181d';g.fill();g.shadowColor='transparent';
  g.lineWidth=2;g.strokeStyle='rgba(200,210,235,.35)';g.stroke();const m=w*.045,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.1);g.clip();
  g.translate(-sw/2,-sh/2);s5_lh(g,sw,sh,o);g.restore();g.restore()}

/* ---------- the developer console, redrawn after the REDESIGNED real one (docs/screens/console-pending-1280.png,
   console-approved-1280.png): header, left "Waiting for approval" card with ONE green button + Deny, "Cases"; right one calm
   case card. Panel space 1180 x 540. st = {hl:{facts,actions,reply,checker}, ck (cursor 0..0.8 glide, pressed at .8), ok, T} */
const s5_INK='#141a26',s5_GR='#6b7280',s5_LN='#e2e5ea',s5_GRN='#167a50',s5_BLU='#2f5be7';
function s5_t(g,x,y,s,fs,col,o={}){g.font=`${o.w||400} ${fs}px ${o.m?'"IBM Plex Mono",monospace':'"IBM Plex Sans",sans-serif'}`;g.fillStyle=col;g.textAlign=o.al||'left';g.textBaseline='middle';g.fillText(s,x,y);return g.measureText(s).width}
function s5_box(g,x,y,w,h,r,fill,stroke,lw=1){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke()}}
function s5_ck(g,x,y,s,c,lw=2.2){g.save();g.strokeStyle=c;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(x-s*.5,y);g.lineTo(x-s*.12,y+s*.38);g.lineTo(x+s*.55,y-s*.42);g.stroke();g.restore()}
function s5_dot(g,x,y,c,r=4){g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,6.283);g.fill()}
function s5_hl(g,x,y,w,h,v){v=v||0;if(v<=0)return;g.save();g.globalAlpha*=cl(v);g.shadowColor='rgba(255,168,76,.95)';g.shadowBlur=22;s5_box(g,x-5,y-5,w+10,h+10,14,null,'rgba(255,168,76,1)',4);g.restore()}
const s5_REPLY="Your Lumen Premium Weekly subscription ended on 22 October 2026 because App Store couldn't take the renewal payment. Please update your payment method in your Apple account… I've asked the team to review a 3-day courtesy extension of your access. It isn't active yet — it only starts if they approve it.";
function s5_console(g,cx,cy,sc,st){const W=1180,H=556,ok=st.ok||0,hl=st.hl||{},ck=st.ck||0;g.save();g.translate(cx,cy);g.scale(sc,sc);g.translate(-W/2,-H/2);
  g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=30;g.shadowOffsetY=10;s5_box(g,0,0,W,H,14,'#f3f4f7');g.shadowColor='transparent';
  g.save();g.beginPath();g.roundRect(0,0,W,46,[14,14,0,0]);g.fillStyle='#ffffff';g.fill();g.restore();
  const hw=s5_t(g,22,24,'Case Desk',22,s5_INK,{w:700});s5_t(g,32+hw,25,'for Lumen',15,s5_GR);g.fillStyle=s5_LN;g.fillRect(0,46,W,1);
  /* left column */
  const lx=22,lw=372,gone=sm(cl(ok*1.6));
  let w1=s5_t(g,lx,76,'Waiting for approval',17,s5_INK,{w:700});s5_t(g,lx+w1+10,77,ok>.5?'0':'1',14,s5_GR);
  if(gone<1){g.save();g.globalAlpha*=1-gone;const y0=92;
    g.save();g.shadowColor='rgba(22,122,80,.35)';g.shadowBlur=10;s5_box(g,lx,y0,lw,170,12,'#ffffff','#2f8a5f',2);g.restore();
    let nx=lx+16+s5_t(g,lx+16,y0+26,'Ava',17,s5_INK,{w:700});nx+=s5_t(g,nx,y0+26,'  ·  ',15,s5_GR);s5_t(g,nx,y0+27,'00239',13,s5_GR,{m:1});
    s5_t(g,lx+16,y0+54,'Wants 3 days of premium',16,'#2b3140');
    s5_dot(g,lx+20,y0+80,'#c4323a');s5_t(g,lx+32,y0+80,"Ended — the payment didn't go through",15,s5_GR);
    const bl='Give Ava 3 days of premium';g.font='700 16px "IBM Plex Sans",sans-serif';const bw=g.measureText(bl).width+40,by=y0+122,pr=ck>.8&&ck<1?.94:1;
    g.save();g.translate(lx+16+bw/2,by);g.scale(pr,pr);s5_box(g,-bw/2,-21,bw,42,21,s5_GRN);s5_t(g,0,0,bl,16,'#ffffff',{w:700,al:'center'});g.restore();
    st.btn=[lx+16+bw/2,by];
    s5_box(g,lx+26+bw,by-21,70,42,21,'#ffffff','#d0d4dc');s5_t(g,lx+61+bw,by,'Deny',16,s5_INK,{w:600,al:'center'});
    s5_t(g,lx+16,y0+156,'Nothing is granted until you approve.',13.5,s5_GR);g.restore()}
  if(ok>0){g.save();g.globalAlpha*=cl(ok*2-.6);s5_t(g,lx+2,106,'Nothing waiting for you.',15,s5_GR);g.restore()}
  const cy0=L(294,146,gone);
  w1=s5_t(g,lx,cy0,'Cases',17,s5_INK,{w:700});s5_t(g,lx+w1+10,cy0+1,'1',14,s5_GR);
  {const y=cy0+18;s5_box(g,lx,y,lw,92,12,'#ffffff',s5_BLU,2);let nx=lx+16+s5_t(g,lx+16,y+24,'Ava',16,s5_INK,{w:700});nx+=s5_t(g,nx,y+24,'  ·  ',14,s5_GR);s5_t(g,nx,y+25,'00239',12.5,s5_GR,{m:1});
    s5_t(g,lx+lw-14,y+24,'just now',13,s5_GR,{al:'right'});s5_t(g,lx+16,y+50,'I paid but have no premium',15,'#2b3140');
    s5_dot(g,lx+20,y+74,'#c4323a');s5_t(g,lx+32,y+74,ok>.5?"Ended — the payment didn't go through":"Ended — the payment didn't go…",14,s5_GR);
    if(ok<.5){g.font='600 12.5px "IBM Plex Sans",sans-serif';const tw=g.measureText('waiting').width+16;s5_box(g,lx+lw-14-tw,y+63,tw,22,11,'#fbefcf');s5_t(g,lx+lw-14-tw/2,y+74,'waiting',12.5,'#8a6410',{w:600,al:'center'})}}
  /* right: the case card */
  const rx=414,rw=744,ry=62,rh=480,x0=rx+28,iw=rw-56;
  g.save();g.shadowColor='rgba(20,30,60,.10)';g.shadowBlur=12;g.shadowOffsetY=2;s5_box(g,rx,ry,rw,rh,18,'#ffffff');g.restore();s5_box(g,rx,ry,rw,rh,18,null,s5_LN);
  s5_dot(g,x0+22,ry+38,'#e4e9fb',22);s5_t(g,x0+22,ry+39,'A',20,s5_BLU,{w:700,al:'center'});
  let nx=x0+56+s5_t(g,x0+56,ry+28,'Ava',21,s5_INK,{w:600});nx+=s5_t(g,nx,ry+28,'  ·  ',16,s5_GR);s5_t(g,nx,ry+29,'00239',14,s5_GR,{m:1});
  s5_t(g,x0+56,ry+51,'English · App Store',15,s5_GR);
  const sy=ry+82;s5_dot(g,x0+5,sy,'#c4323a',5);const sw=s5_t(g,x0+18,sy,"Paid, then the App Store couldn't take the renewal on 22 Oct",19,s5_INK,{w:700});
  s5_hl(g,x0-4,sy-16,sw+26,32,hl.facts);
  const py=ry+112,pv=1+.06*cl(hl.checker||0)*Math.max(0,Math.sin((st.T||0)*5));g.font='700 14px "IBM Plex Sans",sans-serif';const pw=g.measureText('Checked: every fact matches the account').width+42;
  g.save();g.translate(x0+pw/2,py);g.scale(pv,pv);s5_box(g,-pw/2,-13,pw,26,13,'#dcf3e6');s5_ck(g,-pw/2+16,0,10,s5_GRN,2.2);s5_t(g,-pw/2+28,1,'Checked: every fact matches the account',14,s5_GRN,{w:700});g.restore();
  s5_hl(g,x0,py-13,pw,26,hl.checker);
  const um='I paid but have no premium';g.font='500 16px "IBM Plex Sans",sans-serif';const uw=g.measureText(um).width+30;s5_box(g,x0+iw-uw,ry+132,uw,36,14,s5_BLU);s5_t(g,x0+iw-15,ry+150,um,16,'#ffffff',{w:500,al:'right'});
  g.font='400 15px "IBM Plex Sans",sans-serif';const RL=rfWrap(g,s5_REPLY,600),rby=ry+176,rbh=RL.length*20+20;s5_box(g,x0,rby,630,rbh,14,'#eceef2');RL.forEach((l,k)=>s5_t(g,x0+15,rby+20+k*20,l,15,'#1f2430'));
  s5_hl(g,x0,rby,630,rbh,hl.reply);
  const dy=rby+rbh+10,dh=98;s5_box(g,x0,dy,iw,dh,12,'#f1f2f6');s5_t(g,x0+18,dy+20,'What Case Desk did',15,s5_INK,{w:700});
  ['Explained what happened','Sent the link to update payment','Asked you for a 3-day courtesy extension'].forEach((s,k)=>{s5_ck(g,x0+24,dy+45+k*22,11,s5_GRN);s5_t(g,x0+42,dy+45+k*22,s,15,'#4a5263')});
  s5_hl(g,x0,dy,iw,dh,hl.actions);
  const wy=dy+dh+10;
  if(ok<1){g.save();g.globalAlpha*=1-cl(ok*2);const wl='Waiting for your OK… approve or deny it in the list';g.font='600 14.5px "IBM Plex Sans",sans-serif';const ww=g.measureText(wl).width+62;
    s5_box(g,x0,wy,ww,34,10,'#fdf8ec','#e2cf9f');s5_t(g,x0+16,wy+17,'←',16,'#9a6a12',{w:700});s5_t(g,x0+42,wy+17,wl,14.5,'#5a5f6b',{w:600});g.restore()}
  if(ok>0){g.save();g.globalAlpha*=cl(ok*2-.4);const gl='Premium given · expires 7 Nov, 00:12';g.font='700 17px "IBM Plex Sans",sans-serif';const gw=g.measureText(gl).width+70,s=.9+.1*bk(cl(ok*1.5));
    g.translate(x0,wy+17);g.scale(s,s);s5_box(g,0,-19,gw,38,10,'#e1f3ea','#8fcfad',1.2);s5_dot(g,20,0,s5_GRN,11);s5_ck(g,20,0,10,'#ffffff',2.4);s5_t(g,42,1,gl,17,s5_GRN,{w:700});g.restore()}
  g.fillStyle=s5_LN;g.fillRect(x0,wy+48,iw,1);g.fillStyle='#2b3140';g.beginPath();g.moveTo(x0+2,wy+60);g.lineTo(x0+10,wy+66);g.lineTo(x0+2,wy+72);g.closePath();g.fill();s5_t(g,x0+18,wy+66,'Details (for the curious)',14,'#2b3140',{w:600});
  /* the cursor: glides in from the lower right to the green button, presses at .8 */
  if(ck>0&&ck<1.5&&st.btn){const [bx,by]=st.btn,q=sm(cl(ck/.8)),px=L(W*.55,bx+30,q),py=L(H+40,by+8,q),ca=cl(ck*6)*cl((1.5-ck)*4);
    g.save();g.globalAlpha*=ca;g.translate(px,py);const ps=ck>.8&&ck<1?.86:1;g.scale(ps*1.3,ps*1.3);g.beginPath();g.moveTo(0,0);g.lineTo(0,26);g.lineTo(7,20);g.lineTo(12,31);g.lineTo(17,29);g.lineTo(12,18);g.lineTo(21,18);g.closePath();
    g.fillStyle='#ffffff';g.fill();g.lineWidth=2;g.strokeStyle='#0e1a33';g.stroke();g.restore();
    if(ck>.8&&ck<1.3){const r=cl((ck-.8)/.5);g.save();g.globalAlpha*=1-r;g.lineWidth=3;g.strokeStyle='rgba(22,122,80,1)';g.beginPath();g.arc(bx+30,by+8,10+40*r,0,6.283);g.stroke();g.restore()}}
  g.restore()}

/* the console grows out of the laptop at the start of beat 3 and stays for beat 4 */
const s5_PC=[630,296];
function s5_drawConsole(g,t,c,i,T,A){if(i<3)return;const o=S5.built;if(!o)return;
  const gq=i===3?s5_E(c(3)+.15,c(3)+1.0,t):1;let sx=s5_PC[0],sy=s5_PC[1];
  if(gq<1){const [lx,ly]=X3.at(S5,o.lapPt);sx=L(lx,sx,gq);sy=L(ly,sy,gq)}
  const sc=L(.1,1,gq);if(gq<=0)return;
  const pk=(w,d=.3)=>i>3?0:s5_E(A(3,w)-.2,A(3,w)+d,t),off=w=>1-s5_E(A(3,w)-.15,A(3,w)+.2,t);
  const hl=i===3?{facts:pk('facts')*off('actions'),actions:pk('actions')*off('reply'),reply:pk('reply'),checker:pk('checker')}:{};
  const ap=i===4?A(4,'approve'):1e9,c4=c(4),ck=i===4?(t<ap?.8*cl((t-c4+.05)/Math.max(.4,ap-c4+.05)):.8+(t-ap)/1.25):0,ok=i===4?cl((t-ap-.2)/.6):0;
  g.save();g.globalAlpha*=cl(gq*3);s5_console(g,sx,sy,sc,{hl,ck,ok,T});g.restore()}
/* Ava's phone pops up over the left column once she has premium again: the white Lumen Help screen with the green note */
function s5_drawAva(g,t,c,i,T,A){if(i!==4)return;const t0=A(4,'ava')-.2,pp=cl((t-t0)/.45);if(pp<=0)return;
  s5_phone2(g,215,352,410,pp,Object.assign({dw:250,fs:11.5,msgs:[{me:1,text:'I paid but have no premium'},{text:s5_AV_R},{link:'Update payment method'},{note:s5_AV_N,kind:'amber'},{note:s5_AV_G,kind:'green'}]},s5_AV,{card:null}))}

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
