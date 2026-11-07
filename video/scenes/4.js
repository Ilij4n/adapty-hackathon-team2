/* Scene 4 — "Marko" (demo). Builder: scenes 3–4. One LP3 stage (night mood): Marko's living room in Belgrade (sofa, his
   glowing phone, window onto the city, floor lamp, coffee table, sleeping cat). On top, THE APP: a 2D Lumen Help phone drawn
   after the real screens (light, "Lumen Help" header + "Marko · 00009" pill, the "What we found on your account" card,
   blue user bubble, white reply bubble, chips, input), plus big readable copies of what matters on each beat:
   beats: 0 Marko writes in Serbian (big bubble + English gloss) · 1 the status card (Lumen Pro Annual · App Store ·
          66.99 EUR · until 13 Jul 2027 · cancelled 23 Sep 2026) and the timeline 13 Jul → 23 Sep → 13 Jul 2027 ·
          2 the exact real Claude reply in Serbian with the English gloss, key phrases lit on their words ·
          3 stamps: no refund promised · no invented policy · real Claude, live. Gag: Marko's "?!" → "…oh. OK." */
(()=>{
const s4_E=(a,b,x)=>sm(cl((x-a)/(b-a)));
function s4_pop(o,a,s=1){o.visible=a>0.001;o.scale.setScalar(Math.max(1e-3,bk(cl(a))*s))}

/* ---- the Lumen Help screen after the real app (same painter as scene 3, s3_lh) */
const s4_FNT=(w,fs)=>`${w} ${fs}px "IBM Plex Sans",sans-serif`;
function s4_lh(x,W,H,o={}){const dw=o.dw||300,u=W/dw,w=dw,h=H/u;x.save();x.scale(u,u);x.textBaseline='middle';
  x.fillStyle='#f3f4f7';x.fillRect(0,0,w,h);
  /* header */
  x.fillStyle='#ffffff';x.fillRect(0,0,w,50);x.fillStyle='#e2e5ea';x.fillRect(0,50,w,1);
  x.fillStyle='#1c2230';x.beginPath();x.roundRect(10,11,28,28,7);x.fill();x.lineWidth=2.6;
  x.strokeStyle='#f08a4b';x.beginPath();x.arc(24,25,7.5,-2.6,.6);x.stroke();x.strokeStyle='#5b86f2';x.beginPath();x.arc(24,25,7.5,.8,3.4);x.stroke();
  x.fillStyle='#ffffff';x.beginPath();x.arc(24,25,2.6,0,6.283);x.fill();
  x.textAlign='left';x.fillStyle='#121826';x.font=s4_FNT(700,15);x.fillText('Lumen Help',46,20);x.fillStyle='#6b7280';x.font=s4_FNT(400,11);x.fillText('Subscription',46,36);
  x.font=s4_FNT(600,11);const who=o.who||'Marko · 00009',pw=x.measureText(who).width+30;x.beginPath();x.roundRect(w-10-pw,13,pw,24,12);x.fillStyle='#eef0f4';x.fill();x.strokeStyle='#d5d9e1';x.lineWidth=1;x.stroke();
  x.fillStyle='#1f2430';x.fillText(who,w-pw,25.5);x.beginPath();x.moveTo(w-24,23);x.lineTo(w-17,23);x.lineTo(w-20.5,27.5);x.closePath();x.fill();
  /* status card */
  let top=60;const ca=o.card??1;if(ca>0){x.save();x.globalAlpha*=ca;const cw=w-20,cx=10,cy=60,col=(cw-24)/2;
    const rows=[[['Package','Lumen Pro Annual (AI Studio)'],['Bought on','App Store']],[['Price','66.99 EUR'],['Access until','13 Jul 2027']],[['Cancelled','23 Sep 2026'],null]];
    x.font=s4_FNT(600,12);const rh=rows.map(r=>Math.max(...r.filter(Boolean).map(([k,v])=>rfWrap(x,v,col-4).length))*15+16);const chh=58+rh.reduce((s,a)=>s+a,0)+4;
    x.shadowColor='rgba(20,30,60,.08)';x.shadowBlur=6;x.shadowOffsetY=1;x.beginPath();x.roundRect(cx,cy,cw,chh,10);x.fillStyle='#ffffff';x.fill();x.shadowColor='transparent';x.strokeStyle='#e2e5ea';x.stroke();
    x.fillStyle='#6b7280';x.font=s4_FNT(600,9);x.letterSpacing='1px';x.fillText('WHAT WE FOUND ON YOUR ACCOUNT',cx+12,cy+15);x.letterSpacing='0px';
    x.font=s4_FNT(600,10);const st='Cancelled — active until end of period',sw=x.measureText(st).width+24;x.beginPath();x.roundRect(cx+12,cy+26,sw,19,9.5);x.fillStyle='#e9ebf0';x.fill();
    x.fillStyle='#374151';x.beginPath();x.arc(cx+20,cy+35.5,2.2,0,6.283);x.fill();x.fillText(st,cx+27,cy+36);
    let yy=cy+56;rows.forEach((r,j)=>{r.forEach((c,k)=>{if(!c)return;const xx=cx+12+k*(col+4);x.fillStyle='#6b7280';x.font=s4_FNT(400,9.5);x.fillText(c[0],xx,yy+5);
      x.fillStyle='#111827';x.font=s4_FNT(600,12);rfWrap(x,c[1],col-4).forEach((l,n)=>x.fillText(l,xx,yy+19+n*15))});yy+=rh[j]});
    x.restore();top=cy+chh*ca+10}
  /* bottom: chips + input */
  const chipY=h-90,inY=h-50;x.fillStyle='#f6f7f9';x.fillRect(0,chipY-12,w,h-chipY+12);x.fillStyle='#e2e5ea';x.fillRect(0,chipY-12,w,1);
  let cxp=10;x.font=s4_FNT(500,10.5);for(const c of(o.chips||['Charged after cancelling','I paid but have no premium'])){const cw=x.measureText(c).width+22;x.beginPath();x.roundRect(cxp,chipY,cw,26,13);x.fillStyle='#eceef2';x.fill();x.strokeStyle='#d8dbe2';x.stroke();
    x.fillStyle='#1f2430';x.fillText(c,cxp+11,chipY+13.5);cxp+=cw+6}
  x.beginPath();x.roundRect(10,inY,w-60,36,18);x.fillStyle='#ffffff';x.fill();x.lineWidth=o.focus?1.6:1;x.strokeStyle=o.focus?'#2f5be7':'#d8dbe2';x.stroke();
  x.save();x.beginPath();x.rect(12,inY,w-66,36);x.clip();x.font=s4_FNT(400,12);
  if(o.input){const tw=x.measureText(o.input).width,ox=Math.min(0,w-82-tw);x.fillStyle='#1f2430';x.fillText(o.input,22+ox,inY+18.5);if(((o.T||0)*2|0)%2==0){x.fillStyle='#2f5be7';x.fillRect(23+ox+tw,inY+10,1.4,17)}}
  else{x.fillStyle='#9aa1ad';x.fillText('Describe the problem…',22,inY+18.5)}x.restore();
  x.fillStyle='#2f5be7';x.beginPath();x.arc(w-28,inY+18,17,0,6.283);x.fill();x.strokeStyle='#ffffff';x.lineWidth=2;x.lineCap='round';x.beginPath();x.moveTo(w-35,inY+18);x.lineTo(w-21,inY+18);x.moveTo(w-27,inY+12);x.lineTo(w-21,inY+18);x.lineTo(w-27,inY+24);x.stroke();
  /* chat area: greeting (empty chat) or bubbles, newest kept in view */
  const bot=chipY-18;x.save();x.beginPath();x.rect(0,top-4,w,bot-top+4);x.clip();
  const ga=o.greet??0;if(ga>0){x.globalAlpha=ga;x.fillStyle='#121826';x.font=s4_FNT(700,17);x.fillText('Hi! What’s going on',12,top+16);x.fillText('with your subscription?',12,top+37);
    x.fillStyle='#4b5563';x.font=s4_FNT(400,11);rfWrap(x,'I can see your Lumen purchases, so I can tell you exactly what’s true — and what the next step is. Write in any language.',w-30).forEach((l,n)=>x.fillText(l,12,top+60+n*16));x.globalAlpha=1}
  const fs=o.fs||12.5,lh=fs*1.32,ms=(o.msgs||[]).filter(m=>(m.a??1)>0),mw=(w-20)*.8;
  const lay=ms.map(m=>{x.font=s4_FNT(m.me?500:400,fs);const L1=rfWrap(x,m.text,mw-20);return{m,L1,bw:Math.min(mw,Math.max(...L1.map(l=>x.measureText(l).width))+20),bh:L1.length*lh+14}});
  const tot=lay.reduce((s,q)=>s+q.bh+8,0)+(o.typing?36:0);let y=top+4-Math.max(0,tot-(bot-top-4));
  for(const q of lay){x.save();x.globalAlpha*=q.m.a??1;const bx=q.m.me?w-10-q.bw:10;x.beginPath();x.roundRect(bx,y,q.bw,q.bh,12);x.fillStyle=q.m.me?'#2f5be7':'#ffffff';x.fill();if(!q.m.me){x.strokeStyle='#dfe2e8';x.lineWidth=1;x.stroke()}
    x.fillStyle=q.m.me?'#ffffff':'#1f2430';x.font=s4_FNT(q.m.me?500:400,fs);q.L1.forEach((l,n)=>x.fillText(l,bx+10,y+7+lh/2+n*lh));x.restore();y+=q.bh+8}
  if(o.typing){x.beginPath();x.roundRect(10,y,54,28,12);x.fillStyle='#ffffff';x.fill();x.strokeStyle='#dfe2e8';x.stroke();
    for(let k=0;k<3;k++){x.fillStyle=`rgba(107,114,128,${.35+.65*Math.max(0,Math.sin((o.T||0)*6-k*.9))})`;x.beginPath();x.arc(24+k*13,y+14,3.4,0,6.283);x.fill()}}
  x.restore();x.restore()}

/* the 2D phone frame around s4_lh: centred at cx,cy, h tall (w = h*.49) */
function s4_phone(g,cx,cy,h,o){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const w=h*.49;g.save();g.globalAlpha*=a;g.translate(cx,cy);const sc=bk(cl(pop));g.scale(sc,sc);
  g.shadowColor=o.glow?`rgba(140,170,255,${.6*o.glow})`:'rgba(0,0,0,.5)';g.shadowBlur=o.glow?36*o.glow:26;g.shadowOffsetY=o.glow?0:10;
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,w*.15);g.fillStyle='#0d0f14';g.fill();g.shadowColor='transparent';g.lineWidth=2;g.strokeStyle='rgba(200,210,235,.3)';g.stroke();
  const m=w*.04,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.12);g.clip();g.translate(-sw/2,-sh/2+sh*.045);
  g.fillStyle='#ffffff';g.fillRect(0,-sh*.045,sw,sh*.045);s4_lh(g,sw,sh*.955,o);g.restore();
  g.fillStyle='#0d0f14';g.beginPath();g.roundRect(-w*.17,-h/2+m+4,w*.34,w*.07,w*.035);g.fill();g.restore()}

/* a big app-style bubble (white reply / blue user), top-left x,y, width w; segs = [[text,seg]] with highlights; returns height */
const s4_HC={1:'255,190,90',2:'124,227,198',3:'150,170,255'};
function s4_wrapSeg(g,segs,maxW){const words=[];for(const[s,sg]of segs)for(const w of s.split(/( )/))if(w!=='')words.push([w,sg]);
  const lines=[[]];let lw=0;for(const[w,sg]of words){const ww=g.measureText(w).width;if(w!==' '&&lw+ww>maxW&&lines[lines.length-1].length){lines.push([]);lw=0}if(w===' '&&lw===0)continue;lines[lines.length-1].push([w,sg,ww]);lw+=ww}return lines}
function s4_big(g,x,y,w,segs,o={}){const fs=o.fs||21,lh=fs*1.36,me=!!o.me,a=o.a??1,pop=o.pop??1;g.save();g.font=`${me?500:400} ${fs}px "IBM Plex Sans",sans-serif`;
  const L1=s4_wrapSeg(g,segs,w-40);let L2=[];const sfs=o.sfs||fs*.78;if(o.sub){g.font=`italic 400 ${sfs}px "IBM Plex Sans",sans-serif`;L2=s4_wrapSeg(g,o.sub,w-40)}
  const tw=me?Math.max(...L1.map(l=>l.reduce((s,q)=>s+q[2],0)))+40:w,bh=24+L1.length*lh+(L2.length?14+L2.length*sfs*1.36:0),bx=me?x+w-tw:x;
  if(a>0&&pop>0){g.globalAlpha*=a;const sc=bk(cl(pop)),ox=me?bx+tw:bx;g.translate(ox,y);g.scale(sc,sc);g.translate(-ox,-y);
    g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=20;g.shadowOffsetY=6;g.beginPath();g.roundRect(bx,y,tw,bh,18);g.fillStyle=me?'#2f5be7':'#ffffff';g.fill();g.shadowColor='transparent';
    if(!me){g.lineWidth=1.2;g.strokeStyle='#dfe2e8';g.stroke()}
    g.textBaseline='middle';g.textAlign='left';let n=o.n??1e9;g.font=`${me?500:400} ${fs}px "IBM Plex Sans",sans-serif`;
    L1.forEach((ln,r)=>{let xx=bx+20;const yy=y+12+lh/2+r*lh;for(const[wd,sg,ww]of ln){if(n<=0)break;const h=sg?(o.hl&&o.hl[sg]||0):0;
      if(h>0&&wd!==' '){g.fillStyle=`rgba(${s4_HC[sg]},${.42*h})`;g.fillRect(xx-1,yy-lh*.42,ww+2,lh*.84)}
      g.fillStyle=me?'#ffffff':'#1f2430';g.fillText(wd.length<=n?wd:wd.slice(0,n),xx,yy);n-=wd.length;xx+=ww}});
    if(L2.length){const ga=o.subA??1,y2=y+12+L1.length*lh+10;g.globalAlpha*=ga;g.fillStyle=me?'rgba(255,255,255,.5)':'#d5d9e1';g.fillRect(bx+20,y2-4,w*.25,1.5);
      g.font=`italic 400 ${sfs}px "IBM Plex Sans",sans-serif`;L2.forEach((ln,r)=>{let xx=bx+20;const yy=y2+sfs*.75+r*sfs*1.36;for(const[wd,sg,ww]of ln){const h=sg?(o.hl&&o.hl[sg]||0):0;
        if(h>0&&wd!==' '){g.fillStyle=`rgba(${s4_HC[sg]},${.36*h})`;g.fillRect(xx-1,yy-sfs*.6,ww+2,sfs*1.2)}g.fillStyle=me?'rgba(255,255,255,.85)':'#4b5563';g.fillText(wd,xx,yy);xx+=ww}})}}
  g.restore();return bh}

/* the exact real reply (FACTS) and its gloss, segmented: 1 charged before cancelling, 2 nothing more, 3 access until */
const s4_SR=[['Zapravo je tako: ',0],['poslednja naplata od 66.99 EUR bila je 13. jula 2026, pre nego što ste 23. septembra 2026. isključili obnavljanje.',1],
  [' Zato ',0],['ništa dodatno neće biti naplaćeno',2],[', a vaš Lumen Pro (AI Studio) ',0],['ostaje aktivan do 13. jula 2027.',3]];
const s4_EN=[['Actually: ',0],['your last charge of 66.99 EUR was on 13 July 2026, before you turned off renewal on 23 September 2026.',1],
  [' So ',0],['nothing more will be charged',2],[', and your Lumen Pro (AI Studio) ',0],['stays active until 13 July 2027.',3]];
const s4_SRtxt=s4_SR.map(s=>s[0]).join(''),s4_LEN=s4_SRtxt.length;
const s4_MSG='Naplatili ste mi nakon što sam otkazao!';

/* the big status card, app style (white, "WHAT WE FOUND ON YOUR ACCOUNT") */
function s4_card(g,x,y,w,o){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const h=196;g.save();g.globalAlpha*=a;const sc=bk(cl(pop));g.translate(x,y);g.scale(sc,sc);
  g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=20;g.shadowOffsetY=6;g.beginPath();g.roundRect(0,0,w,h,16);g.fillStyle='#ffffff';g.fill();g.shadowColor='transparent';g.strokeStyle='#e2e5ea';g.stroke();
  g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6b7280';g.font='600 13px "IBM Plex Sans",sans-serif';g.letterSpacing='1.5px';g.fillText('WHAT WE FOUND ON YOUR ACCOUNT',20,24);g.letterSpacing='0px';
  g.font='600 14px "IBM Plex Sans",sans-serif';const st='Cancelled — active until end of period',sw=g.measureText(st).width+30;g.beginPath();g.roundRect(20,40,sw,26,13);g.fillStyle='#e9ebf0';g.fill();
  g.fillStyle='#374151';g.beginPath();g.arc(31,53,3,0,6.283);g.fill();g.fillText(st,40,53.5);
  const cells=[['Package','Lumen Pro Annual',0],['Store','App Store',0],['Price','66.99 EUR',0],['Access until','13 Jul 2027',3],['Cancelled','23 Sep 2026',1]],cw=(w-40)/3;
  cells.forEach(([k,v,hc],j)=>{const cx=20+(j%3)*cw,cy=86+Math.floor(j/3)*56,hh=hc&&o.hl?o.hl[hc]||0:0;
    if(hh>0){g.fillStyle=`rgba(${hc===1?'238,92,104':s4_HC[hc]},${.25*hh})`;g.beginPath();g.roundRect(cx-8,cy-4,cw-6,50,8);g.fill()}
    g.fillStyle='#6b7280';g.font='400 13px "IBM Plex Sans",sans-serif';g.fillText(k,cx,cy+8);g.fillStyle='#111827';g.font='600 18px "IBM Plex Sans",sans-serif';g.fillText(v,cx,cy+30)});
  g.restore()}

/* the timeline: 13 Jul 2026 charge → 23 Sep 2026 renewal off → 13 Jul 2027 access end (positioned by date) */
function s4_timeline(g,o){const x0=600,x1=1110,y=440,a=o.a??1;if(a<=0)return;const X=d=>x0+(x1-x0)*d/365;g.save();g.globalAlpha*=a;
  g.beginPath();g.roundRect(552,350,620,170,16);g.fillStyle='rgba(16,30,54,.9)';g.fill();g.lineWidth=1.4;g.strokeStyle='rgba(255,168,76,.5)';g.stroke();
  g.lineCap='round';g.lineWidth=6;g.strokeStyle='rgba(255,255,255,.14)';g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();
  const f=o.fill??0;if(f>0){g.strokeStyle=`rgba(${rfGO},.9)`;g.beginPath();g.moveTo(x0,y);g.lineTo(L(x0,x1,f),y);g.stroke()}
  const pin=(x,q,top,bot,c,icn,up,al)=>{if(q<=0)return;g.save();g.globalAlpha*=cl(q*2);const s=bk(cl(q));g.translate(x,y);g.scale(s,s);
    g.beginPath();g.arc(0,0,13,0,6.283);g.fillStyle=`rgba(${c},1)`;g.fill();g.lineWidth=3;g.strokeStyle='rgba(16,30,54,1)';g.stroke();ic(g,icn,0,0,7,NV);g.restore();
    txt(g,x,y+(up?-48:36),top,{fs:19,w:700,c:PA,a:cl(q*2-.5),al});txt(g,x,y+(up?-26:58),bot,{fs:14,c,a:cl(q*2-.8),al})};
  pin(X(0),o.p1??0,'13 Jul 2026','last charge · 66.99 EUR',rfGOLD,'coin',1,'center');
  pin(X(72),o.p2??0,'23 Sep 2026','renewal turned off',rfRED,'cross',0,'center');
  pin(X(365),o.p3??0,'13 Jul 2027','access ends',rfGO,'check',1,'center');
  g.restore()}

const S4=X3.stage('s4-marko-room2',K=>{const s=K.scene({fov:35}),lp=LP3.world(K,s,{mood:'night',clouds:0,shadow:9}),C=lp.P,o={scene:s,lp,camera:s.userData.cam},M=LP3.mat,G=LP3.geo;
  const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const floor=new THREE.Mesh(G.box(24,.1,24),M(C.woodDk));floor.position.y=-.05;floor.receiveShadow=true;floor.userData.pl_name='ground';s.add(floor);
  const wall=new THREE.Mesh(G.box(24,8,.2),M(C.interior));wall.position.set(0,4,-3.1);wall.receiveShadow=true;s.add(wall);
  const skirt=new THREE.Mesh(G.box(24,.14,.06),M(C.trim));skirt.position.set(0,.07,-2.98);s.add(skirt);
  const sideL=new THREE.Mesh(G.box(.2,8,12),M(C.interior));sideL.position.set(-5.2,4,2.8);s.add(sideL);
  o.win=R(PROPS3.window(K,LP3.MOODS.night,{w:1.7,h:1.6,curtains:1}),1.55,1.0,-2.93);
  for(const[x,w,h,c]of[[-1.75,.7,.5,C.teal],[-.85,.45,.6,C.terra]]){const f=new THREE.Mesh(G.box(w+.08,h+.08,.04),M(C.trim));f.position.set(x,2.05,-2.98);s.add(f);const pc=new THREE.Mesh(G.box(w,h,.05),M(c));pc.position.set(x,2.05,-2.97);s.add(pc)}
  o.rug=R(PROPS3.rug(K,C,{kind:'rect',w:3.0,d:2.0,c:'rose'}),-1.2,0,-.9);
  o.sofa=R(PROPS3.sofa(K,C,{w:2.1,c:'teal'}),-1.3,0,-2.35);
  o.table=R(PROPS3.table(K,C,{kind:'coffee'}),-1.25,0,-.95);
  o.mug=R(PROPS3.mug(K,C,{steam:1,c:'terra'}),0,0,0);o.book=R(PROPS3.notebook(K,C,{}),0,0,0);
  o.marko=K.add(s,CHAR3.person(K,{skin:0xf3c39d,P:C,seed:9,kind:'tee',c:C.sand,hairStyle:'short'}),0,0,0);
  o.phTx=rfTex(K,120,240);rfPaint(o.phTx,'p',(x,W,H)=>{x.fillStyle='#f3f4f7';x.fillRect(0,0,W,H);x.fillStyle='#ffffff';x.fillRect(0,0,W,H*.08);
    x.fillStyle='#e2e5ea';x.fillRect(W*.06,H*.11,W*.88,H*.24);x.fillStyle='#2f5be7';x.beginPath();x.roundRect(W*.35,H*.42,W*.58,H*.08,6);x.fill();x.fillStyle='#ffffff';x.beginPath();x.roundRect(W*.06,H*.55,W*.66,H*.2,6);x.fill()});
  o.phone=new THREE.Group();s.add(o.phone);{const b=new THREE.Mesh(G.box(.085,.165,.012),M(0x16181d));b.userData.noAudit=1;o.phone.add(b);const sc=new THREE.Mesh(new THREE.PlaneGeometry(.075,.15),new THREE.MeshBasicMaterial({map:o.phTx,toneMapped:false}));sc.position.z=.007;sc.userData.noAudit=1;o.phone.add(sc)}
  o.phHalo=K.halo('190,205,255',.9,.3);s.add(o.phHalo);
  o.flamp=R(PROPS3.lamp(K,C,{kind:'floor',light:1}),-2.85,0,-2.45);
  o.plant=R(PROPS3.plant(K,C,{kind:'monstera'}),-4.2,0,-2.2);
  o.shelf=R(PROPS3.bookshelf(K,C,{w:1.0,h:2.0}),3.35,0,-2.75);
  o.plant2=R(PROPS3.plant(K,C,{kind:'snake'}),2.55,0,-2.6);
  o.cat=K.add(s,CHAR3.cat(K,{P:C}),0,0,0);
  o.fgPlant=R(PROPS3.plant(K,C,{kind:'round'}),-3.3,0,2.3);o.arm=R(PROPS3.chair(K,C,{kind:'dining'}),2.6,0,2.0,-2.3);
  o.alive=[o.mug,o.flamp,o.plant,o.plant2,o.fgPlant,o.win];
  o.bubA=CHAR3.bub(K,'?!',{fs:30});s.add(o.bubA);o.bubB=CHAR3.bub(K,'…oh. OK.',{fs:24,left:1});s.add(o.bubB);
  s.add(o.camera);o.bag=rfBagIn(K,o.camera,{r:.36});
  LP3.shadows(s);return o});

/* shots [px,py,pz, tx,ty,tz]: Marko sits near screen centre-left, between the 2D phone and the right-hand cards */
const s4_SH=[[.2,2.0,5.6, -1.2,1.0,-1.6],[.6,2.2,6.3, -.9,1.2,-1.6],[.5,1.7,5.0, -1.2,1.0,-1.9],[.3,2.1,6.4, -1.1,1.1,-1.6]];
function s4_shot(cam,i,p,T){const a=s4_SH[Math.max(0,i-1)],b=s4_SH[i]||a,q=i===0?1:sm(cl(p/1.8)),v=a.map((x,k)=>L(x,b[k],q));
  if(i===0){v[2]-=p*.08}
  cam.position.set(v[0]+Math.sin(T*.21)*.05,v[1]+Math.sin(T*.17)*.02,v[2]);cam.lookAt(v[3],v[4],v[5]);cam.updateMatrixWorld()}

const s4_V=new THREE.Vector3();
function s4_pose(o,t,c,i,T,A){const p=t-c(i);o.lp.pose(T);s4_shot(o.camera,i,p,T);
  for(const a of o.alive)if(a.userData.pose)a.userData.pose(T);
  PLACE3.onSurface(o.mug,o.table,[.35,.1]);PLACE3.onSurface(o.book,o.table,[-.35,-.1],{ry:.4});
  const wTr=A(3,'truth'),happy=i>=3&&t>A(3,'refund')+.3;
  o.marko.userData.pose(T,{pose:'type',w:1,face:i===0?'surprised':happy?'smile':'neutral',look:i===0?Math.sin(T*.7)*.15:0});
  PLACE3.sit(o.marko,o.sofa,{seat:1});
  const ta=o.marko.userData.typeAt||[.62,.38];o.marko.updateWorldMatrix(true,false);s4_V.set(.0,ta[0]+.05,ta[1]-.04);o.marko.localToWorld(s4_V);
  o.phone.position.copy(s4_V);const q=new THREE.Vector3(0,0,1).applyQuaternion(o.marko.getWorldQuaternion(new THREE.Quaternion()));const yaw=Math.atan2(q.x,q.z);
  o.phone.rotation.set(-.75,yaw+Math.PI,0,'YXZ');o.phHalo.position.copy(s4_V);o.phHalo.position.y+=.05;o.phHalo.material.opacity=.3+.06*Math.sin(T*2.2);
  PLACE3.lie(o.cat,o.rug,[.75,.55],{ry:-.8});o.cat.userData.pose(T,{pose:'sleep'});
  o.marko.updateWorldMatrix(true,true);const hb=o.marko.userData.bones&&o.marko.userData.bones.head;if(hb)hb.getWorldPosition(s4_V);else{s4_V.copy(o.marko.position);s4_V.y+=1.3}
  o.bubA.position.set(s4_V.x+.12,s4_V.y+.3,s4_V.z+.05);o.bubB.position.set(s4_V.x+.42,s4_V.y+.42,s4_V.z+.2);o.bubB.scale.setScalar(.75);
  const wM=A(0,'marko');o.bubA.userData.pose(T,{pop:i===0?s4_E(wM-.1,wM+.3,t)*(1-s4_E(c(1)-.4,c(1),t)):0});
  o.bubB.userData.pose(T,{pop:i===3?s4_E(wTr-.3,wTr+.2,t):0});
  const wS=A(2,'serbian');
  rfBag(o.bag,T,{rings:(i===0&&t>wM&&t<wM+1.2)||(i===2&&t>wS&&t<wS+1.2)?1:0,tool:i===1?1:0,tilt:i===3&&t>A(3,'refund')&&t<A(3,'refund')+1.4?.18:0,
    sq:i===3&&t>wTr&&t<wTr+.35?.25:0})}

/* the phone's state at time p of beat i (quantised enough for a stable look; it is 2D so redrawn every frame anyway) */
function s4_phoneOpts(i,p,W,T){const o={dw:250,card:1,who:'Marko · 00009',T,chips:['Charged after cancelling','I paid but have no premium']};
  if(i===0){const ws=W('serbian'),ty=s4_E(ws-1.0,ws+.15,p),n=Math.round(ty*s4_MSG.length),sent=p>ws+.25;
    o.greet=sent?0:1;o.msgs=sent?[{me:1,text:s4_MSG}]:[];o.input=sent?'':s4_MSG.slice(0,n);o.focus=!sent&&n>0;return o}
  o.msgs=[{me:1,text:s4_MSG}];
  if(i===1)return o;
  if(i===2){const wc=W('claude'),tIn=wc+.5;o.typing=p>wc-.2&&p<tIn?1:0;if(p>=tIn)o.msgs.push({text:s4_SRtxt});return o}
  o.msgs.push({text:s4_SRtxt});return o}

return rfRun({base:(g,t,c,T,i,A)=>X3.draw(g,S4,o=>s4_pose(o,t,c,i,T,A),t),
 b:[
  /* 0: Marko writes in Serbian */
  (g,p,d,T,W)=>{s4_phone(g,215,345,470,Object.assign(s4_phoneOpts(0,p,W,T),{pop:P(p,.05,.45),glow:.4}));
    rfChip(g,215,96+0,'Marko · Serbian · iPhone',{c:'150,170,255',fs:15,pop:P(p,W('marko')-.1,.4)});
    const ws=W('serbian');s4_big(g,620,190,540,[[s4_MSG,0]],{me:1,fs:26,pop:P(p,ws+.3,.4),sub:[['“You charged me after I cancelled!”',0]],subA:P(p,W('charged')-.1,.4)})},
  /* 1: the status card + the timeline */
  (g,p,d,T,W)=>{const w1=W('thirteenth'),w2=W('twentythird'),ws=W('sees');
    s4_phone(g,215,345,470,Object.assign(s4_phoneOpts(1,p,W,T),{glow:.4}));
    s4_big(g,620,190,540,[[s4_MSG,0]],{me:1,fs:26,a:1-P(p,ws-.6,.3),sub:[['“You charged me after I cancelled!”',0]]});
    const wsep=W('september');s4_card(g,560,124,610,{pop:P(p,ws-.15,.45),hl:{1:P(p,w2-.1,.35),3:P(p,wsep+.3,.35)}});
    s4_timeline(g,{a:P(p,w1-.5,.35),p1:P(p,w1-.15,.45),p2:P(p,w2-.15,.45),fill:s4_E(w2+.1,wsep+.4,p),p3:P(p,wsep+.25,.45)})},
  /* 2: Claude answers in Serbian */
  (g,p,d,T,W)=>{const wc=W('claude'),tIn=wc+.5,wb=W('before'),wn=W('nothing'),wa=W('access'),out=1-P(p,0,.35);
    s4_phone(g,215,345,470,Object.assign(s4_phoneOpts(2,p,W,T),{glow:.4}));
    s4_card(g,560,124,610,{a:out});s4_timeline(g,{a:out,p1:1,p2:1,fill:1,p3:1});
    const n=Math.round(L(0,s4_LEN,s4_E(tIn,tIn+1.6,p)));
    s4_big(g,560,128,620,s4_SR,{fs:21,n,pop:P(p,tIn-.1,.4),hl:{1:P(p,wb-.1,.35),2:P(p,wn-.1,.35),3:P(p,wa-.1,.35)},sub:s4_EN,sfs:16,subA:P(p,tIn+1.6,.5)});
    rfChip(g,860,96,'real Claude reply, word for word',{c:'217,119,87',fs:14,pop:P(p,tIn,.4)})},
  /* 3: stamps */
  (g,p,d,T,W)=>{s4_phone(g,215,345,470,Object.assign(s4_phoneOpts(3,p,W,T),{glow:.4}));
    s4_big(g,560,128,620,s4_SR,{fs:21,hl:{1:.5,2:.5,3:.5},sub:s4_EN,sfs:16,a:1-P(p,0,.4)});
    rfStamp(g,960,200,'NO REFUND PROMISED',{p:P(p,W('refund')-.05,.3),c:rfGO,fs:26,r:-.05});
    rfStamp(g,960,290,'NO INVENTED POLICY',{p:P(p,W('invented')-.05,.3),c:rfGO,fs:26,r:.04});
    rfStamp(g,960,385,'REAL CLAUDE, LIVE',{p:P(p,W('truth')-.05,.3),c:rfGOLD,fs:30,r:-.05});
    rfChip(g,960,455,'in seconds',{c:PA,fs:16,pop:P(p,W('seconds')-.2,.4)})}
 ]},4)
})()
