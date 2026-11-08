/* Scene 8 — "For Adapty" (REVISION 2 + rules beat, the extended sales scene, 7 beats). Stage A: the Adapty pricing studio (plan card, add-ons shelf,
   a ticket conveyor into the ADAPTY box). Stage B: the shared Belgrade night (rfNight) for the closer.
   Beats:
     0 "Now, the business." — wide studio, big title card "The business" (kicker FOR ADAPTY).
     1 the pricing shelf: Pro plan card (free under $5K/mo · then 1%), ADD-ONS shelf, Refund Saver (0.2% · free up to $5K/mo)
       lights up; chips "free for small apps" / "then a small share of revenue"; the amber Case Desk box drops into the slot
       beside Refund Saver on "Case Desk" ("NEW ADD-ON").
     2 the split: RevenueCat "a support menu" (a phone with a list of menu buttons) vs Adapty + Case Desk "an answer"
       (Marko's question + the true reply).
     3 for the developer: a ticket answered in seconds; the refund request and the one-star review it would have become
       appear as ghosts and get crossed out ("never happens"); a row of 4 product chips lights up in turn underneath.
     4 the rules: a console "Rules" drawer (Night Shift navy): Courtesy premium = Ask me / Automatic up to [3] days / Never,
       the selection slides on "ask", "automatic", "never" and back to Ask me; locked row "Always a person";
       caption "You set the rules. Code enforces them."
     5 the ADAPTY box: "What Adapty sees" — already: charges · renewals · refunds; new from Case Desk: the complaint,
       what the subscriber said, what fixed it.
     6 closer (callback to S1): 02:00 in the night stage, Marko's one-star review draft (App Store) turns into a question in
       Lumen Help and gets a true answer; the founder is still asleep (office dark, z's, clock at 2). End: "Case Desk".
   Light beat: Bagley rings on the Case Desk drop, and dozes with the founder at the end.
   Scene-local helpers are prefixed s8_. */
(()=>{
const s8_AD='95,230,255',s8_AD3=0x5fe6ff;
const s8_REV='I cancelled on the app, and confirmed it, but it still tried to charge me after.';
const s8_REVT='Still Got Charged After Canceling Subscription';
const s8_ANS='Your last charge was 13 July 2026, before you turned off renewal. Nothing more will be charged, and Lumen Pro stays active until 13 July 2027.';
const s8_ASK='Naplatili ste mi nakon što sam otkazao!';
const s8_TK=[['charged after cancel',rfRED],['paid, no premium',rfLUM],['billing error',rfDESK]];

/* ---- canvas faces (built once) */
const s8_font=(x,w,fs,f='"IBM Plex Sans",sans-serif')=>{x.font=`${w} ${fs}px ${f}`};
const s8_proFace=(x,W,H)=>{x.fillStyle='#fff7ec';x.fillRect(0,0,W,H);x.fillStyle='#37697a';x.fillRect(0,0,W,H*.2);
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';s8_font(x,800,70);x.fillText('Pro',W/2,H*.1);
  x.fillStyle='#2a2440';s8_font(x,800,78);x.fillText('Free',W/2,H*.34);s8_font(x,600,36);x.fillStyle='#6d5b78';x.fillText('under $5K / month',W/2,H*.45);
  x.fillStyle='#e8dccb';x.fillRect(W*.15,H*.53,W*.7,4);x.fillStyle='#2a2440';s8_font(x,800,64);x.fillText('then 1%',W/2,H*.64);
  s8_font(x,600,36);x.fillStyle='#6d5b78';x.fillText('of revenue',W/2,H*.74);
  for(let k=0;k<3;k++){x.fillStyle='#93b8a2';x.beginPath();x.arc(W*.2,H*(.83+k*.055),9,0,6.283);x.fill();x.fillStyle='#d8ccd8';x.fillRect(W*.26,H*(.83+k*.055)-5,W*(.45+k*.08),10)}};
const s8_boxFace=(kind)=>(x,W,H)=>{const cd=kind==='cd',rs=kind==='rs';x.fillStyle=cd?'#ffb35c':rs?'#e9fbff':'#d9d2e2';x.fillRect(0,0,W,H);
  x.fillStyle=cd?'#b8682a':rs?'#2a7f96':'#a69cb6';x.fillRect(0,0,W,H*.22);x.textAlign='center';x.textBaseline='middle';
  x.fillStyle='#fff';s8_font(x,700,30);x.fillText(cd?'NEW ADD-ON':'ADD-ON',W/2,H*.11);
  if(cd||rs){x.fillStyle=cd?'#3a1f08':'#13304a';s8_font(x,800,58);x.fillText(cd?'Case':'Refund',W/2,H*.36);x.fillText(cd?'Desk':'Saver',W/2,H*.5);
    if(rs){s8_font(x,800,64);x.fillStyle='#2a7f96';x.fillText('0.2%',W/2,H*.7);s8_font(x,600,26);x.fillStyle='#4a6070';x.fillText('of monthly revenue',W/2,H*.8);x.fillText('free up to $5K/mo',W/2,H*.88)}
    else{x.strokeStyle='#3a1f08';x.lineWidth=6;x.strokeRect(W*.32,H*.62,W*.36,H*.2);x.fillStyle='#3a1f08';x.fillRect(W*.4,H*.68,W*.2,6);x.fillRect(W*.4,H*.74,W*.14,6)}}
  else{x.fillStyle='#b4aac4';for(let k=0;k<4;k++)x.fillRect(W*.2,H*(.38+k*.12),W*(.6-k*.08),14)}};
const s8_tkFace=(k)=>(x,W,H)=>{const [t,c]=s8_TK[k];x.fillStyle='#fff7ec';x.fillRect(0,0,W,H);x.fillStyle=`rgb(${c})`;x.fillRect(0,0,W*.06,H);
  x.fillStyle='#6d5b78';s8_font(x,700,26);x.textAlign='left';x.textBaseline='middle';x.fillText('SUPPORT TICKET',W*.11,H*.24);
  x.fillStyle='#2a2440';s8_font(x,800,46);const tw=x.measureText(t).width;if(tw>W*.84)s8_font(x,800,Math.floor(46*W*.84/tw));x.fillText(t,W*.11,H*.58);x.fillStyle='#d8ccd8';x.fillRect(W*.11,H*.8,W*.6,8)};

/* ================= stage A: the pricing shelf + the conveyor ================= */
const s8_SLOT=[-.2,1.05,2.3,3.55],s8_SHY=1.12,s8_CDK=2;/* box x positions on the shelf; Case Desk takes slot 2 */
const S8=X3.stage('s8-adapty',K=>{const s=K.scene({fov:35}),lp=LP3.world(K,s,{mood:'studio',clouds:0,shadow:14,sunDir:[3,10,7]}),P=lp.P,M=LP3.mat,G=LP3.geo;
  const cam=s.userData.cam;s.add(cam);const o={scene:s,lp,P,camera:cam,alive:[]};const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const box=(w,h,d,c,x,y,z,gl)=>{const m=new THREE.Mesh(G.box(w,h,d),gl?LP3.glow(c):M(c));m.position.set(x,y,z);if(!gl){m.receiveShadow=true;m.castShadow=true}s.add(m);return m};
  const face=(w,h,d,c,tx,x,y,z)=>{const fm=new THREE.MeshLambertMaterial({map:tx}),sm=M(c);const m=new THREE.Mesh(G.box(w,h,d),[sm,sm,sm,sm,fm,sm]);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;s.add(m);return m};
  box(40,.2,18,P.road,4,-.1,1).userData.pl_name='ground';
  box(40,8,.3,P.interior,4,4,-3.6);box(40,.14,.06,P.trim,4,.07,-3.42);
  for(let k=0;k<18;k++){const x=-12+k*2.2;box(.08,6,.06,0x3e4570,x,3.6,-3.42).castShadow=false}
  /* the plan card on a hex podium, left */
  {const base=new THREE.Mesh(G.cyl(1.05,1.15,.5,6),M(P.metal));base.position.set(-3.0,.25,-.9);base.castShadow=base.receiveShadow=true;s.add(base);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(1.0,.035,3,6),LP3.glow(0x37697a));rim.rotation.x=Math.PI/2;rim.rotation.z=Math.PI/6;rim.position.set(-3.0,.51,-.9);s.add(rim);
   o.pro=face(1.4,1.9,.08,P.trim,K.canvasTex(420,570,s8_proFace),-3.0,1.5,-.85);o.pro.rotation.y=.18}
  /* the add-ons shelf: two uprights, two boards, a header sign */
  for(const x of[-.95,4.3])box(.12,2.9,.6,P.woodDk,x,1.45,-2.2);box(5.4,.1,.7,P.wood,1.67,s8_SHY-.05,-2.2);box(5.4,.1,.7,P.wood,1.67,.25,-2.2);
  {const sg=PROPS3.sign(K,P,{kind:'board',text:'ADD-ONS',w:2.2,h:.4,c:'teal'});sg.position.set(1.67,3.05,-2.35);s.add(sg)}
  {const sg=PROPS3.sign(K,P,{kind:'board',text:'ADAPTY PRICING',w:3.0,h:.42,c:'metal'});sg.position.set(-1.6,4.1,-3.42);s.add(sg)}
  const tx={g:K.canvasTex(300,340,s8_boxFace('g')),rs:K.canvasTex(300,340,s8_boxFace('rs')),cd:K.canvasTex(300,340,s8_boxFace('cd'))};
  o.boxes=s8_SLOT.map((x,k)=>k===s8_CDK?null:face(1.0,1.15,.55,k===1?0x2a7f96:0x8a80a0,k===1?tx.rs:tx.g,x,s8_SHY+.575,-2.2));
  o.cd=face(1.0,1.15,.55,0xb8682a,tx.cd,s8_SLOT[s8_CDK],s8_SHY+.575,-2.2);
  o.slot=box(1.04,.02,.6,rfDESK3,s8_SLOT[s8_CDK],s8_SHY+.012,-2.2,1);o.slot.material=new THREE.MeshBasicMaterial({color:rfDESK3,transparent:true,opacity:.6});
  o.cdHalo=K.halo(rfDESK,2.4,0);o.cdHalo.position.set(s8_SLOT[s8_CDK],s8_SHY+.6,-1.9);s.add(o.cdHalo);
  o.rsHalo=K.halo(s8_AD,2.2,0);o.rsHalo.position.set(s8_SLOT[1],s8_SHY+.6,-1.9);s.add(o.rsHalo);
  const cm=new THREE.MeshBasicMaterial({color:rfDESK3,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  o.cone=new THREE.Mesh(new THREE.ConeGeometry(.9,5,10,1,true),cm);o.cone.position.set(s8_SLOT[s8_CDK],s8_SHY+2.6,-2.2);o.cone.userData.noAudit=1;s.add(o.cone);
  for(let k=0;k<5;k++)box(.5,.3,.4,[P.sand,P.sage,P.rose,P.trim,P.tealLt][k],-.4+k*1.05,.45,-2.2);
  /* the conveyor into the ADAPTY box, further right */
  const CX0=6.0,CX1=10.4;o.cx0=CX0;o.cx1=CX1;
  box(CX1-CX0+.4,.12,.9,P.metal,(CX0+CX1)/2,.86,-.6);for(const x of[CX0,CX1-.4])for(const z of[-.95,-.25])box(.08,.8,.08,P.metal,x,.4,z);
  o.belt=[];for(let k=0;k<14;k++){const m=box(.06,.02,.86,0x4a527c,CX0,.93,-.6);m.castShadow=false;o.belt.push(m)}
  o.ad=box(2.2,2.2,2.0,s8_AD3,12.0,1.1,-.8);o.ad.material=M(0x2a7f96);
  box(2.3,.14,2.1,P.metal,12.0,2.26,-.8);const mouth=box(.12,.9,1.0,0x0e1730,10.88,1.25,-.6,1);mouth.castShadow=false;
  {const sg=PROPS3.sign(K,P,{kind:'board',text:'ADAPTY',w:1.8,h:.5,c:'teal'});sg.position.set(12.0,1.5,.22);s.add(sg)}
  o.adHalo=K.halo(s8_AD,3.2,.3);o.adHalo.position.set(12,1.4,-.2);s.add(o.adHalo);
  o.tk=[0,1,2].map(k=>{const m=face(1.3,.66,.03,P.trim,K.canvasTex(360,192,s8_tkFace(k)),CX0,1.3,-.6);return m});
  o.alive.push(R(PROPS3.plant(K,P,{kind:'monstera',s:1.3}),-5.4,0,-2.6),R(PROPS3.lamp(K,P,{kind:'floor',light:1}),5.0,0,-2.4),
    R(PROPS3.plant(K,P,{kind:'snake',s:1.2}),14.2,0,-2.6),R(PROPS3.plant(K,P,{kind:'round',s:1.0}),-4.6,0,2.2));
  R(PROPS3.chair(K,P,{kind:'cafe'}),8.0,0,2.4,.5);
  o.bag=rfBagIn(K,cam,{x:2.12,y:-1.02,z:-5});
  LP3.shadows(s);return o});

/* camera per beat [pos, target]; each beat eases in from the previous beat's shot */
const s8_SH=[[.3,3.1,11.4,.3,1.7,-1.4],[.3,2.5,8.6,.3,1.65,-1.4],[3.2,2.7,9.6,3.4,1.6,-1.4],[8.0,2.5,7.4,8.6,1.3,-.8],[5.2,2.9,9.2,5.6,1.4,-1.4],[10.4,2.3,6.0,11.3,1.35,-.8]];
const s8_pose=(o,t,c,i,T,w)=>{const p=t-c(i);o.lp.pose(T);for(const a of o.alive)if(a.userData.pose)a.userData.pose(T);
  const k=i===0?s8_SH[0].map((v,j)=>j==2?v-p*.15:v):s8_SH[i-1].map((v,j)=>L(v,s8_SH[i][j],sm(cl(p/1.4))));
  K3.look(o.camera,k[0]+Math.sin(T*.2)*.06,k[1]+Math.sin(T*.17)*.03,k[2],k[3],k[4],k[5]);
  /* Case Desk drops into its slot on "case" (beat 1) */
  const cw=w(1,'case'),dr=i>1?1:i<1?0:P(p,cw-.35,.7),db=dr<1?(1-dr)*(1-dr)*2.6:i===1?Math.max(0,Math.sin(Math.min(1,(p-(cw+.35))/.35)*Math.PI))*.06:0;
  o.cd.visible=dr>0;o.cd.position.y=s8_SHY+.575+db;o.cd.rotation.z=(1-dr)*.25;
  o.slot.material.opacity=dr<1?(i===1?.35+.3*Math.sin(T*5):.15):0;o.slot.visible=dr<1;
  const lit=i>1?.5:i<1?0:P(p,cw,.6);o.cdHalo.material.opacity=.6*lit*(.85+.15*Math.sin(T*2));o.cone.material.opacity=.12*lit;
  const rs=i===1?P(p,w(1,'refund')-.2,.4)*(1-.5*P(p,cw,.5)):0;o.rsHalo.material.opacity=.55*rs;
  /* belt + tickets: ride left to right, vanish into the Adapty box (beats 3-4) */
  const run=i>=4,sp=.9;
  o.belt.forEach((m,j)=>{m.position.x=o.cx0+(((j/14)+T*sp/(o.cx1-o.cx0))%1)*(o.cx1-o.cx0-.2)});
  o.tk.forEach((m,j)=>{const u=((T*sp/(o.cx1-o.cx0+.9))+j/3)%1,x=o.cx0-.3+u*(o.cx1-o.cx0+.9);m.visible=run;m.position.set(x,1.32,-.6);m.rotation.set(-.32,-.12,0);
    const sq=cl((x-(o.cx1-.3))/.7),gr=cl((x-o.cx0+.3)/.5);m.scale.set(gr*(1-sq*.7),gr*(1-sq*.7),1)});
  o.adHalo.material.opacity=(i===5?.6:i===3?.4:.25)*(.85+.15*Math.sin(T*2.4));
  rfBag(o.bag,T,{rings:(i===1&&p>cw+.2&&p<cw+1.4)||(i===0&&p<1.2)?1:0,tool:i===5&&p>w(5,'fixed')-.2?'check':0,tc:rfGO,
    tilt:i===2?.14*P(p,w(2,'an')-.1,.3):0})};

/* ================= stage B: the Belgrade night closer ================= */
const S8N=rfNight();
const s8_NSH=[[-1.2,2.4,8.2,-1.6,1.0,-1.0],[0,2.7,10.2,0,1.15,-1.2]];
const s8_night=(o,p,T,w)=>{const q=sm(cl(p/4.5)),k=s8_NSH[0].map((v,j)=>L(v,s8_NSH[1][j],q));
  K3.look(o.camera,k[0]+Math.sin(T*.2)*.05,k[1],k[2],k[3],k[4],k[5]);
  const ans=p>w(6,'and')+.2;
  rfNightPose(o,T,{litB:0,phone:1,marko:{face:ans?'smile':'neutral',look:-.1},founder:{pose:'sit',face:'neutral'},mon:{n:0},
    help:ans?{lang:'EN',key:'s8-ans',msgs:[{me:1,text:s8_REV},{text:s8_ANS}]}:{lang:'EN',key:'s8-q',msgs:[{me:1,text:s8_REV}]}});
  /* asleep: eyes shut, slumped over the desk */
  o.founder.userData.pose(T,{pose:'sit',w:1,face:'neutral',blink:1,look:0,hand:1});PLACE3.atDesk(o.founder,o.desk,o.chair);
  const b=o.founder.userData.bones||{},br=Math.sin(T*1.1)*.03;if(b.chest)b.chest.rotateX(.32+br);if(b.head)b.head.rotateX(.42);
  /* the clock reads 2:00 */
  o.hHand.rotation.z=-(2/12)*Math.PI*2;o.mHand.rotation.z=-(T*.004)%(Math.PI*2)*.0;
  rfBag(o.bag,T,{sleep:p>w(6,'gets')?1:0,rings:p>w(6,'and')&&p<w(6,'and')+1.1?1:0})};

/* ---- 2D pieces */
const s8_title=(g,x,y,big,kick,o={})=>{const a=o.a??1;if(a<=0)return;
  g.save();g.globalAlpha*=a;const gr=g.createLinearGradient(0,y-80,0,y+80);gr.addColorStop(0,'rgba(10,18,40,0)');gr.addColorStop(.5,'rgba(10,18,40,.72)');gr.addColorStop(1,'rgba(10,18,40,0)');g.fillStyle=gr;g.fillRect(0,y-80,1280,160);g.restore();
  if(kick)txt(g,x,y-48,kick,{fs:18,w:700,m:1,c:rfDESK,a});txt(g,x,y+6,big,{fs:o.fs||72,d:1,w:800,c:PA,a,glow:14})};
const s8_panel=(g,x,y,w,h,c,o={})=>{const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;g.save();g.globalAlpha*=a;const sc=bk(cl(pop));g.translate(x+w/2,y+h/2);g.scale(sc,sc);g.translate(-w/2,-h/2);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=22;g.shadowOffsetY=8;g.beginPath();g.roundRect(0,0,w,h,18);g.fillStyle='rgba(14,24,46,.94)';g.fill();g.shadowColor='transparent';
  g.lineWidth=2;g.strokeStyle=`rgba(${c},${.6+.4*(o.hot||0)})`;if(o.hot){g.shadowColor=`rgba(${c},.9)`;g.shadowBlur=20*o.hot}g.stroke();g.shadowColor='transparent';
  if(o.body)o.body(g,w,h);g.restore()};
/* a phone frame; body(g, w, h) paints the screen (0,0 = screen top-left) */
const s8_phone=(g,cx,cy,w,h,o={})=>{const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;g.save();g.globalAlpha*=a;g.translate(cx,cy);const sc=bk(cl(pop));g.scale(sc,sc);
  g.shadowColor=o.glow?`rgba(${rfLUM},${.7*o.glow})`:'rgba(0,0,0,.5)';g.shadowBlur=o.glow?40*o.glow:24;g.beginPath();g.roundRect(-w/2,-h/2,w,h,w*.12);g.fillStyle='#1b2033';g.fill();g.shadowColor='transparent';
  g.lineWidth=2;g.strokeStyle='rgba(200,210,235,.35)';g.stroke();const m=10,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.09);g.clip();g.translate(-sw/2,-sh/2);
  o.body&&o.body(g,sw,sh);g.restore();g.fillStyle='#0b0f1c';g.beginPath();g.roundRect(-w*.15,-h/2+m+5,w*.3,9,5);g.fill();g.restore()};
/* the App Store "Write a Review" draft: stars, title, body typed to q (0..1), caret blinking */
const s8_draft=(g,W,H,q,T)=>{g.fillStyle='#f4f5f8';g.fillRect(0,0,W,H);g.fillStyle='#ffffff';g.fillRect(0,0,W,64);g.fillStyle='#d9dce4';g.fillRect(0,64,W,1);
  txt(g,16,40,'Cancel',{fs:14,c:'40,120,250',al:'left'});txt(g,W/2,40,'Write a Review',{fs:15,w:700,c:'20,22,30'});txt(g,W-16,40,'Send',{fs:14,w:700,c:'40,120,250',al:'right'});
  txt(g,W/2,94,'★☆☆☆☆',{fs:30,c:'255,170,40'});
  g.fillStyle='#ffffff';g.fillRect(12,122,W-24,44);g.font=F({fs:13,w:700});const tfs=Math.min(13,13*(W-44)/g.measureText(s8_REVT).width);txt(g,22,144,s8_REVT,{fs:tfs,w:700,c:'20,22,30',al:'left',type:cl(q*3)});
  g.fillStyle='#ffffff';g.fillRect(12,174,W-24,H-190);g.font=F({fs:17});const s=s8_REV.slice(0,Math.round(s8_REV.length*cl(q*1.25-.25))),ls=rfWrap(g,s||' ',W-48);
  ls.forEach((l,k)=>txt(g,24,198+k*24,l,{fs:17,c:'20,22,30',al:'left'}));
  if(Math.sin(T*8)>0){const l=ls[ls.length-1]||'';g.font=F({fs:17});g.fillStyle='rgba(40,120,250,1)';g.fillRect(24+g.measureText(l).width+1,188+(ls.length-1)*24,2,20)}};

/* the feature lineup: 4 product chips in one row (centred at cx), each lights up at its time ts[k] and stays lit */
const s8_FEAT=['One-click approve','Rules you choose','Suggested replies for your team','Works from Claude (MCP)'];
const s8_lineup=(g,cx,y,p,ts,pop)=>{if(pop<=0)return;const fs=15;g.font=F({fs,w:600});
  const ws=s8_FEAT.map(s=>g.measureText(s).width+fs*2.4),gap=12,tot=ws.reduce((a,b)=>a+b,0)+gap*3;let x=cx-tot/2;
  s8_FEAT.forEach((s,k)=>{const on=P(p,ts[k]-.1,.3),hot=on*(1-P(p,ts[k]+.5,.4));
    rfChip(g,x+ws[k]/2,y,s,{fs,c:on>.5?rfDESK:'130,140,165',a:.5+.5*on,pop,hot,s:1+.06*hot});x+=ws[k]+gap})};
/* the console's Rules drawer (Night Shift navy), top-left x,y; sel 0..2 = Ask me / Automatic / Never (slides) */
const s8_TEAL='64,214,170';
const s8_rules=(g,x,y,w,h,o)=>{const {a=1,sel=0,hot=0,dayHot=0,lock=1,lockHot=0}=o;if(a<=0)return;g.save();g.globalAlpha*=a;g.translate(x+(1-a)*60,y);
  g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=30;g.shadowOffsetY=10;g.beginPath();g.roundRect(0,0,w,h,14);g.fillStyle='#0f1729';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.5;g.strokeStyle='rgba(120,140,190,.35)';g.stroke();
  txt(g,24,38,'Rules',{fs:28,w:800,al:'left',c:'236,240,250'});
  g.beginPath();g.roundRect(w-86,22,62,32,7);g.strokeStyle='rgba(200,208,225,.5)';g.lineWidth=1.4;g.stroke();txt(g,w-55,38,'Close',{fs:13,w:700,c:'236,240,250'});
  txt(g,24,76,'You choose what Case Desk does on its own.',{fs:15,al:'left',c:'176,188,214'});
  txt(g,24,97,'Everything it does is in the audit log.',{fs:15,al:'left',c:'176,188,214'});
  g.fillStyle='rgba(255,255,255,.1)';g.fillRect(24,120,w-48,1);
  txt(g,24,148,'Courtesy premium',{fs:18,w:700,al:'left',c:'236,240,250'});
  /* segmented control */
  const fs=16,sy=166,sh=46;g.font=F({fs,w:700});const lab=['Ask me','Automatic up to','Never'],box=44;
  const sw=[g.measureText(lab[0]).width+36,g.measureText(lab[1]).width+box+g.measureText('days').width+48,g.measureText(lab[2]).width+36];
  const sx=[24,24+sw[0],24+sw[0]+sw[1]];
  g.beginPath();g.roundRect(24,sy,sw[0]+sw[1]+sw[2],sh,8);g.fillStyle='#121c32';g.fill();g.strokeStyle='rgba(120,135,170,.55)';g.lineWidth=1.4;g.stroke();
  g.fillStyle='rgba(120,135,170,.45)';g.fillRect(sx[1],sy+1,1,sh-2);g.fillRect(sx[2],sy+1,1,sh-2);
  const k0=Math.min(1,Math.floor(sel)),f=sel-k0,hx=L(sx[k0],sx[k0+1],f),hw=L(sw[k0],sw[k0+1],f);
  g.beginPath();g.roundRect(hx+1,sy+1,hw-2,sh-2,7);g.fillStyle=`rgba(${s8_TEAL},.16)`;g.fill();g.lineWidth=2;g.strokeStyle=`rgba(${s8_TEAL},1)`;
  if(hot){g.shadowColor=`rgba(${s8_TEAL},.9)`;g.shadowBlur=18*hot}g.stroke();g.shadowColor='transparent';
  const on=k=>cl(1-Math.abs(sel-k));const col=k=>{const u=on(k);return `${Math.round(L(200,64,u))},${Math.round(L(208,214,u))},${Math.round(L(225,170,u))}`};
  txt(g,sx[0]+sw[0]/2,sy+sh/2,lab[0],{fs,w:700,c:col(0)});
  const tx=sx[1]+18;txt(g,tx,sy+sh/2,lab[1],{fs,w:700,al:'left',c:col(1)});const bx=tx+g.measureText(lab[1]).width+8;
  g.beginPath();g.roundRect(bx,sy+9,box,sh-18,5);g.fillStyle='#0b1222';g.fill();g.lineWidth=1.3;g.strokeStyle=`rgba(${dayHot?s8_TEAL:'150,160,190'},${.6+.4*dayHot})`;
  if(dayHot){g.shadowColor=`rgba(${s8_TEAL},.9)`;g.shadowBlur=14*dayHot}g.stroke();g.shadowColor='transparent';
  txt(g,bx+14,sy+sh/2,'3',{fs:15,w:700,c:'236,240,250'});txt(g,bx+32,sy+sh/2+1,'▾',{fs:11,c:'200,208,225'});
  txt(g,bx+box+8,sy+sh/2,'days',{fs,w:700,al:'left',c:col(1)});
  txt(g,sx[2]+sw[2]/2,sy+sh/2,lab[2],{fs,w:700,c:col(2)});
  /* what the selected mode does (cross-fades) */
  const D=['Case Desk asks you first. Each courtesy extension waits for your OK, and the user is told it is only requested.',
    'Case Desk gives up to 3 days on its own and tells the user. Only after a failed payment; anything longer still waits for your OK.',
    'Courtesy premium is off. Case Desk never gives it away.'];
  g.font=F({fs:14.5});D.forEach((d,k)=>{const u=cl(1-2.2*Math.abs(sel-k));if(u<.02)return;rfWrap(g,d,w-48).forEach((l,j)=>txt(g,24,sy+sh+24+j*20,l,{fs:14.5,al:'left',c:'176,188,214',a:u}))});
  g.fillStyle='rgba(255,255,255,.1)';g.fillRect(24,302,w-48,1);
  /* the locked row */
  g.save();g.globalAlpha*=lock;
  txt(g,24,332,"Privacy, attacks and 'I want a person'",{fs:18,w:700,al:'left',c:'236,240,250'});
  g.font=F({fs:15,w:700});const pw=g.measureText('Always a person').width+56;
  g.beginPath();g.roundRect(24,352,pw,40,7);g.fillStyle='#1c2742';g.fill();if(lockHot){g.strokeStyle=`rgba(${s8_TEAL},${lockHot})`;g.lineWidth=1.6;g.shadowColor=`rgba(${s8_TEAL},.8)`;g.shadowBlur=14*lockHot;g.stroke();g.shadowColor='transparent'}
  ic(g,'lock',46,372,8,'200,208,225',1);txt(g,62,372,'Always a person',{fs:15,w:700,al:'left',c:'236,240,250'});
  txt(g,24,414,'By design: Case Desk hands these over and never decides them.',{fs:14.5,al:'left',c:'176,188,214'});
  g.restore();g.restore()};

let ON=null;
return rfRun({base:(g,t,c,T,i,A2)=>{const w=(j,s)=>A2(j,s)-c(j),p=t-c(i);
  const dis=i===6?P(p,-.1,.6):0;
  if(dis<1)X3.draw(g,S8,o=>s8_pose(o,t,c,Math.min(i,5),T,w),t);
  /* the founder's desk lamp (bulb + halo) stays dark; hidden only for this render and restored right after (seek-safe) */
  if(dis>0){let hid=[];X3.draw(g,S8N,o=>{ON=o;s8_night(o,p,T,w);o.dl.traverse(m=>{if(m!==o.dl&&m.visible&&(m.isLight||m.isSprite||(m.isMesh&&m.material&&!m.material.isMeshLambertMaterial)))hid.push(m)});hid.forEach(m=>m.visible=false)},t,{a:dis});
    hid.forEach(m=>m.visible=true)}},
 b:[
  /* 0 title card */
  (g,p,d,T,W)=>{s8_title(g,640,300,'The business','FOR ADAPTY',{a:P(p,0,.35)*(1-P(p,d-.3,.3))})},
  /* 1 the pricing shelf */
  (g,p,d,T,W)=>{
    const [px,py]=X3.at(S8,[-3.0,2.55,-.85]);
    rfChip(g,px,Math.max(150,py-30),'Adapty Pro',{c:'95,180,200',fs:18,pop:P(p,W('adapty')-.1,.35)});
    const [sx,sy]=X3.at(S8,[1.67,3.3,-2.35]);
    rfChip(g,sx,Math.max(130,sy-28),'add-ons',{c:s8_AD,fs:18,pop:P(p,W('addons')-.15,.35),hot:P(p,W('addons'),.3)*(1-P(p,W('addons')+.8,.3))});
    const [rx,ry]=X3.at(S8,[s8_SLOT[1],s8_SHY,-1.9]);
    const fy=Math.min(500,ry+40);
    rfChip(g,rx-40,fy,'free for small apps',{c:rfGO,fs:19,pop:P(p,W('free')-.15,.35),mk:'v'});
    rfChip(g,rx-40,fy+50,'then a small share of revenue',{c:rfGOLD,fs:19,pop:P(p,W('share')-.15,.35)});
    const [cx,cy]=X3.at(S8,[s8_SLOT[s8_CDK]+.2,s8_SHY+1.3,-1.9]);
    rfChip(g,cx+70,Math.max(140,cy-40),'Case Desk · fits right beside it',{c:rfDESK,fs:19,pop:P(p,W('fits')-.15,.35),hot:P(p,W('fits'),.3)*(1-P(p,W('fits')+1,.4))})},
  /* 2 the split: a support menu vs an answer */
  (g,p,d,T,W)=>{const aL=P(p,W('revenuecat')-.1,.35),aR=P(p,W('adapty')-.25,.35);
    s8_panel(g,70,128,540,430,rfGRY,{pop:aL,body:(g,w,h)=>{
      rfRCLogo(g,20,12,44);txt(g,w/2+20,34,'RevenueCat · Customer Center',{fs:18,w:700,c:'190,198,215'});rfCat(g,w-80,0,84,T,1,{c:'#d98a4a',hi:'#f0a868',eye:'#2a1c10'});
      s8_phone(g,w/2,214,170,300,{body:(g,W2,H2)=>{g.fillStyle='#f4f5f8';g.fillRect(0,0,W2,H2);txt(g,W2/2,26,'Support',{fs:13,w:700,c:'20,22,30'});
        for(let k=0;k<5;k++){const y=50+k*44,q=P(p,W('support')-.6+k*.12,.3);g.globalAlpha*=1;g.fillStyle=`rgba(255,255,255,${q})`;g.beginPath();g.roundRect(10,y,W2-20,36,8);g.fill();
          g.fillStyle=`rgba(150,158,178,${q})`;g.fillRect(22,y+14,(W2-70)*(.55+LP3.hash(k*5)*.4),8);txt(g,W2-22,y+18,'›',{fs:18,w:700,c:'150,158,178',a:q})}}});
      txt(g,w/2,h-44,'a support menu',{fs:34,w:800,d:1,c:PA,a:P(p,W('menu')-.2,.35)})}});
    s8_panel(g,670,128,540,430,rfDESK,{pop:aR,hot:P(p,W('an')-.1,.3),body:(g,w,h)=>{
      txt(g,w/2,34,'Adapty + Case Desk',{fs:18,w:700,c:rfDESK});
      let y=66;y+=rfBub(g,40,y,w-80,s8_ASK,{me:1,fs:17,sub:'You charged me after I cancelled!',pop:P(p,W('adapty')+.1,.35)});
      rfBub(g,40,y,w-80,s8_ANS,{fs:17,pop:P(p,W('give')-.2,.35),maxW:.9});
      txt(g,w/2,h-44,'an answer',{fs:34,w:800,d:1,c:rfDESK,a:P(p,W('an')-.2,.35)})}})},
  /* 3 for the developer: answered in seconds, so the refund and the one-star review never happen */
  (g,p,d,T,W)=>{const k=P(p,W('never')-.1,.45);
    s8_panel(g,70,140,470,250,rfGO,{pop:P(p,W('ticket')-.2,.35),body:(g,w,h)=>{
      txt(g,24,30,'SUPPORT TICKET',{fs:15,w:700,m:1,c:'176,188,214',al:'left'});
      const hq=rfBub(g,24,50,w-48,s8_REV,{me:1,fs:17,maxW:.95});
      rfBub(g,24,50+hq,w-48,'Your last charge was before you turned off renewal. Nothing more will be charged.',{fs:16,maxW:.95,pop:P(p,W('answered')-.15,.35)})}});
    rfChip(g,305,420,'answered in seconds',{c:rfGO,fs:22,mk:'v',pop:P(p,W('seconds')-.25,.35),hot:P(p,W('seconds'),.3)*(1-P(p,W('seconds')+.9,.4))});
    const ghost=(x,y,w,h,pop,draw)=>s8_panel(g,x,y,w,h,rfRED,{pop,body:(g,w,h)=>{draw(g,w,h);if(k>0){g.fillStyle=`rgba(14,24,46,${.55*k})`;g.beginPath();g.roundRect(0,0,w,h,18);g.fill();g.strokeStyle=`rgba(${rfRED},1)`;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(16,h/2);g.lineTo(16+(w-32)*k,h/2);g.stroke()}}});
    ghost(640,150,420,110,P(p,W('refund')-.2,.35),(g,w,h)=>{txt(g,24,34,'REFUND REQUEST',{fs:15,w:700,m:1,c:'176,188,214',al:'left'});txt(g,24,74,'a refund',{fs:22,w:700,al:'left'})});
    ghost(640,282,420,126,P(p,W('onestar')-.2,.35),(g,w,h)=>{txt(g,24,32,'★☆☆☆☆',{fs:24,c:rfGOLD,al:'left'});txt(g,w-24,32,'App Store review',{fs:14,c:'160,172,198',al:'right'});
      txt(g,24,80,'“Still Got Charged After Canceling…”',{fs:21,w:700,i:1,al:'left'})});
    rfStamp(g,850,452,'NEVER HAPPENS',{p:P(p,W('never')+.05,.35),c:rfGO,fs:34,r:-.06});
    s8_lineup(g,520,532,p,[W('developer'),W('answered'),W('can'),W('refund')],P(p,W('developer')-.15,.35));
    txt(g,610,276,'→',{fs:40,w:800,c:'176,188,214',a:P(p,W('can')-.2,.4)*(1-.5*k)})},
  /* 4 the rules: you decide what it does on its own */
  (g,p,d,T,W)=>{const a=P(p,0,.45);
    if(a>0){g.save();g.globalAlpha*=a;const gr=g.createLinearGradient(0,0,1180,0);gr.addColorStop(0,'rgba(8,12,26,.84)');gr.addColorStop(.42,'rgba(8,12,26,.78)');gr.addColorStop(.8,'rgba(8,12,26,.35)');gr.addColorStop(1,'rgba(8,12,26,0)');g.fillStyle=gr;g.fillRect(0,0,1280,720);g.restore()}
    const s1=P(p,W('automatic')-.12,.35),s2=P(p,W('or')-.05,.3),s3=P(p,Math.min(W('never')+.4,d-.75),.35);
    const sel=s3>0?2*(1-s3):s1+s2;
    const pulse=k=>P(p,k-.05,.2)*(1-P(p,k+.55,.4));
    s8_rules(g,512,122,512,436,{a,sel:Math.max(0,Math.min(2,sel)),hot:Math.max(pulse(W('ask')),pulse(W('automatic')),pulse(W('never'))),dayHot:pulse(W('few')),
      lock:P(p,W('does')-.1,.35),lockHot:pulse(W('own'))});
    {const ca=P(p,W('decide')-.25,.35);if(ca>0){g.save();g.globalAlpha*=ca*.8;g.shadowColor='rgba(8,12,26,.9)';g.shadowBlur=40;g.beginPath();g.roundRect(46,200,448,196,22);g.fillStyle='rgba(10,16,32,.78)';g.fill();g.restore()}}
    txt(g,270,236,'CASE DESK · CONSOLE',{fs:16,w:700,m:1,c:rfDESK,a:P(p,.1,.35)});
    txt(g,270,300,'You set the rules.',{fs:40,w:800,d:1,c:PA,a:P(p,W('decide')-.15,.35)});
    txt(g,270,356,'Code enforces them.',{fs:40,w:800,d:1,c:s8_TEAL,a:P(p,W('own')-.1,.35)})},
  /* 5 what Adapty sees */
  (g,p,d,T,W)=>{s8_panel(g,70,124,660,436,s8_AD,{pop:P(p,W('adapty')-.1,.35),body:(g,w,h)=>{
      txt(g,30,38,'WHAT ADAPTY SEES',{fs:20,w:800,m:1,c:s8_AD,al:'left'});
      txt(g,30,84,'already, on every subscriber',{fs:16,c:'176,188,214',al:'left',a:P(p,W('sees')-.3,.3)});
      ['charges','renewals','refunds'].forEach((s,k)=>rfChip(g,110+k*200,122,s,{c:rfGRY,fs:19,mk:'v',pop:P(p,W('sees')-.2+k*.12,.3)}));
      g.fillStyle='rgba(255,255,255,.12)';g.fillRect(30,160,w-60,1);
      const a2=P(p,W('complaint')-.25,.35);
      txt(g,30,190,'NEW · from Case Desk',{fs:16,w:800,m:1,c:rfDESK,al:'left',a:a2});
      rfChip(g,30+118,234,'the complaint itself',{c:rfDESK,fs:20,pop:a2,hot:P(p,W('complaint'),.3)*(1-P(p,W('complaint')+.9,.4))});
      txt(g,30,288,'what the subscriber said',{fs:15,c:'176,188,214',al:'left',a:P(p,W('subscriber')-.2,.3)});
      rfBub(g,30,304,w-60,'I cancelled on the app, but it still tried to charge me after.',{me:1,fs:18,maxW:.9,pop:P(p,W('said')-.2,.35)});
      txt(g,30,388,'what fixed it',{fs:15,c:'176,188,214',al:'left',a:P(p,W('fixed')-.35,.3)});
      rfChip(g,30+188,416,'explained · granted · escalated',{c:rfGO,fs:18,pop:P(p,W('fixed')-.25,.35),mk:'v'})}})},
  /* 6 the closer: 02:00, the review becomes a question and gets an answer; the founder sleeps */
  (g,p,d,T,W)=>{const sw=P(p,W('becomes')-.1,.5),fl=Math.abs(1-2*sw),ans=P(p,W('and')-.05,.35),e=P(p,W('it')-.15,.45);
    rfChip(g,180,150,'02:00',{c:rfLUMG,fs:20,pop:P(p,W('two')-.15,.35),hot:P(p,W('two'),.3)*(1-P(p,W('two')+.9,.4)),a:1-e});
    const ph={w:296,h:384},pcx=640,pcy=378;
    g.save();g.translate(pcx,0);g.scale(Math.max(.02,fl),1);g.translate(-pcx,0);
    s8_phone(g,pcx,pcy,ph.w,ph.h,{pop:P(p,.25,.45),glow:.6,body:(g,W2,H2)=>{
      if(sw<.5)s8_draft(g,W2,H2,P(p,.35,1.5),T);
      else{const u=W2/320;rfHelpPaint(g,W2,H2,{u,fs:16.5,lang:'EN',T,typing:P(p,W('question')+.15,.2)*(1-ans),
        msgs:[{me:1,text:s8_REV},{text:s8_ANS,a:ans,pop:ans}]})}}});
    g.restore();
    rfChip(g,pcx-250,330,'one-star review',{c:rfRED,fs:18,pop:P(p,W('onestar')-.2,.35),a:1-sw,k:0});
    rfChip(g,pcx-250,330,'a question',{c:rfLUM,fs:18,pop:P(p,W('question')-.2,.35),a:1-e});
    rfChip(g,pcx+246,440,'a true answer',{c:rfGO,fs:18,mk:'v',pop:ans,a:1});
    if(ON){const [fx,fy]=X3.at(S8N,ON.pt.founderHead());const z=P(p,.6,.5);
      for(let k=0;k<3;k++){const u=((T*.45+k/3)%1);txt(g,fx+18+u*30+k*6,fy-30-u*60,'z',{fs:18+k*5,d:1,w:800,c:'200,210,255',a:z*Math.sin(u*Math.PI)})}
      rfChip(g,Math.min(1120,fx+40),Math.max(200,fy-130),'founder · still asleep',{c:'200,210,255',fs:16,pop:P(p,W('morning')-.1,.35)})}
    s8_title(g,640,126,'Case Desk','',{a:e,fs:58})}
 ]},7)})()
