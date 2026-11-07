/* "Two Finalists" (copied from "Build the Referee") — shared look for every scene (owned by the lead, scenes 1–2). Everything is prefixed rf.
   See SHARED.md for the list. Rules: pure functions of time, no Math.random, no g.filter. */

/* ---------- palette: verdict colours (rgb triplets like the engine's CY/MI/AM) */
const rfGO='124,227,198',rfAMB='240,180,92',rfKEEP='169,182,255',rfGRY='150,158,178',rfRED='238,92,104',rfGOLD='255,214,120';
const rfVERD={'SHIP':rfGO,'RE-RUN':rfAMB,'KEEP RUNNING':rfKEEP,'KILL':rfGRY,'BLOCKED':rfRED,'FALSE':rfRED,'WRONG':rfRED};
const rfCol=s=>rfVERD[String(s).toUpperCase()]||CY;

/* ---------- 2D: verdict pill — a solid rounded pill, navy bold text. centred at x,y */
function rfPill(g,x,y,label,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return 0;const c=o.c||rfCol(label),fs=o.fs||18;
  g.save();g.globalAlpha*=a;g.translate(x,y);if(o.r)g.rotate(o.r);const sc=(o.s||1)*bk(pop);g.scale(sc,sc);g.font=F({fs,w:700,m:1});
  const w=o.w||g.measureText(label).width+fs*1.6,h=fs+18;g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=14;g.shadowOffsetY=4;
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,h/2);g.fillStyle=`rgba(${c},1)`;g.fill();g.shadowColor='transparent';
  if(o.hot){g.shadowColor=`rgba(${c},.9)`;g.shadowBlur=20*o.hot;g.lineWidth=2;g.strokeStyle=`rgba(255,255,255,.7)`;g.stroke();g.shadowColor='transparent'}
  g.fillStyle=`rgba(${NV},1)`;g.textAlign='center';g.textBaseline='middle';g.fillText(label,0,1);
  if(o.k){g.strokeStyle=`rgba(${NV},.9)`;g.lineWidth=3;g.beginPath();g.moveTo(-w/2+10,1);g.lineTo(-w/2+10+(w-20)*cl(o.k),1);g.stroke()}
  g.restore();return w}

/* ---------- 2D: big-number stat card, centred at x,y. big = the number ("25.0%"), label under it, sub = small grey line */
function rfStat(g,x,y,big,label,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const c=o.c||CY,w=o.w||220,h=o.h||(o.sub?150:126),bf=o.fs||52;
  g.save();g.globalAlpha*=a;g.translate(x,y);const sc=(o.s||1)*bk(pop);g.scale(sc,sc);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=22;g.shadowOffsetY=8;const gr=g.createLinearGradient(0,-h/2,0,h/2);gr.addColorStop(0,'rgba(30,50,82,.97)');gr.addColorStop(1,'rgba(14,26,48,.97)');
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,16);g.fillStyle=gr;g.fill();g.shadowColor='transparent';g.lineWidth=2;g.strokeStyle=`rgba(${c},.95)`;g.stroke();
  g.fillStyle=`rgba(${c},1)`;g.fillRect(-w/2+16,-h/2,w-32,4);
  if(o.hot){g.shadowColor=`rgba(${c},.9)`;g.shadowBlur=22*o.hot;g.stroke();g.shadowColor='transparent'}
  const by=-h/2+18+bf*.55;txt(g,0,by,big,{fs:bf,w:700,m:1,c,glow:o.glow??10,type:o.type});
  txt(g,0,by+bf*.55+16,label,{fs:o.lfs||17,w:600,c:PA});if(o.sub)txt(g,0,by+bf*.55+40,o.sub,{fs:14,c:'176,188,214'});
  if(o.k){g.strokeStyle=`rgba(${rfRED},1)`;g.lineWidth=4;g.beginPath();g.moveTo(-w/2+14,by);g.lineTo(-w/2+14+(w-28)*cl(o.k),by);g.stroke()}
  g.restore()}

/* ---------- 2D: two stats with "vs" between them, centred at x,y. A=[big,label,colour], B likewise */
function rfVs(g,x,y,A,B,o={}){const gap=o.gap||260,pa=o.pop??1;rfStat(g,x-gap/2,y,A[0],A[1],{c:A[2]||CY,pop:pa,a:o.a,w:o.w,sub:A[3],hot:o.hotA,k:o.kA});
  txt(g,x,y,'vs',{fs:22,w:700,d:1,c:'176,188,214',a:(o.a??1)*cl(pa*1.5)});rfStat(g,x+gap/2,y,B[0],B[1],{c:B[2]||CY,pop:o.popB??pa,a:o.a,w:o.w,sub:B[3],hot:o.hotB,k:o.kB})}

/* ---------- 2D: chip — small glass pill with a coloured dot (promise chips, tags). centred at x,y; returns width */
function rfChip(g,x,y,text,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return 0;const c=o.c||CY,fs=o.fs||17;g.save();g.globalAlpha*=a;g.translate(x,y);const sc=(o.s||1)*bk(pop);g.scale(sc,sc);
  g.font=F({fs,w:600});const w=g.measureText(text).width+fs*2.4,h=fs+16;g.shadowColor='rgba(0,0,0,.4)';g.shadowBlur=12;g.shadowOffsetY=4;
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,h/2);g.fillStyle='rgba(19,32,58,.94)';g.fill();g.shadowColor='transparent';g.lineWidth=1.6;g.strokeStyle=`rgba(${c},.9)`;g.stroke();
  if(o.hot){g.shadowColor=`rgba(${c},.9)`;g.shadowBlur=18*o.hot;g.stroke();g.shadowColor='transparent'}
  g.beginPath();g.arc(-w/2+fs*.85,0,fs*.26,0,6.283);g.fillStyle=`rgba(${c},1)`;g.fill();
  g.fillStyle=`rgba(${PA},1)`;g.textAlign='left';g.textBaseline='middle';g.fillText(text,-w/2+fs*1.45,1);
  if(o.k){g.strokeStyle=`rgba(${rfRED},1)`;g.lineWidth=2.6;g.beginPath();g.moveTo(-w/2+8,1);g.lineTo(-w/2+8+(w-16)*cl(o.k),1);g.stroke()}
  if(o.mk){ic(g,o.mk=='x'?'cross':'check',w/2+14,0,9,o.mk=='x'?rfRED:rfGO)}
  g.restore();return w}

/* ---------- 2D: rubber stamp that slams in (p 0..1 over its arrival), rotated, coloured outline text */
function rfStamp(g,x,y,text,o={}){const p=cl(o.p??1);if(p<=0)return;const c=o.c||rfCol(text),fs=o.fs||40,r=o.r??-.12;g.save();g.globalAlpha*=(o.a??1)*cl(p*3);
  g.translate(x,y);g.rotate(r);const sc=L(2.2,1,sm(p))*(o.s||1);g.scale(sc,sc);g.font=F({fs,w:800,d:1});const w=g.measureText(text).width+fs*.9,h=fs*1.45;
  g.lineWidth=5;g.strokeStyle=`rgba(${c},1)`;g.beginPath();g.roundRect(-w/2,-h/2,w,h,10);g.stroke();g.lineWidth=2;g.beginPath();g.roundRect(-w/2+7,-h/2+7,w-14,h-14,6);g.stroke();
  g.fillStyle=`rgba(${c},1)`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,0,2);g.restore()}

/* ---------- 2D: card with a coloured header strip; top-left x,y. body(g, x, y, w, h) draws inside (optional) */
function rfCard(g,x,y,w,h,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const c=o.c||CY;g.save();g.globalAlpha*=a;
  const sc=bk(pop);g.translate(x+w/2,y+h/2);g.scale(sc,sc);g.translate(-w/2,-h/2);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=22;g.shadowOffsetY=8;g.beginPath();g.roundRect(0,0,w,h,14);g.fillStyle='rgba(16,30,54,.96)';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.6;g.strokeStyle=`rgba(${c},.8)`;g.stroke();if(o.title){g.save();g.beginPath();g.roundRect(0,0,w,40,[14,14,0,0]);g.fillStyle=`rgba(${c},.22)`;g.fill();g.restore();
    txt(g,18,21,o.title,{fs:o.tfs||16,w:700,m:1,c,al:'left'})}
  if(o.body)o.body(g,0,o.title?40:0,w,h-(o.title?40:0));g.restore()}

/* ---------- 2D: progress/score bar row: label left, bar, value right. v 0..1, p reveal 0..1 */
function rfBar(g,x,y,w,label,v,val,o={}){const a=o.a??1,p=cl(o.p??1);if(a<=0)return;const c=o.c||CY,lw=o.lw||200;g.save();g.globalAlpha*=a;
  txt(g,x,y,label,{fs:o.fs||17,w:600,al:'left',c:PA});const bx=x+lw,bw=w-lw-70;g.beginPath();g.roundRect(bx,y-9,bw,18,9);g.fillStyle='rgba(255,255,255,.08)';g.fill();
  g.beginPath();g.roundRect(bx,y-9,Math.max(18,bw*v*p),18,9);g.fillStyle=`rgba(${c},1)`;g.fill();txt(g,bx+bw+14,y,val,{fs:o.fs||17,w:700,m:1,c,al:'left',a:cl(p*2-1)});g.restore()}

/* ============================== 3D ============================== */
/* camera-space overlay: Bagley + labels that sit in the frame whatever the backdrop's camera does.
   rfOverlay(key, {name:[text, labelOpts]}, extra(K,cam,o)) -> stage; draw it after your backdrop:
     X3.draw(g, OV, o=>{rfReset(o); rfLab(o.lab.name, x, y, alpha); rfBag(o,T,{rings:1})}, t)
   Bagley defaults to the lower-right corner (camera space 2.15,-1.05,-5); move him with o.bag.position. */
function rfOverlay(key,labels={},extra){return X3.stage(key,K=>{const s=K.scene({fov:35}),cam=s.userData.cam;cam.position.set(0,0,0);cam.lookAt(0,0,-1);s.add(cam);K.rig(s,{amb:1});
  const o={scene:s,camera:cam,lab:{}};for(const n in labels){const [t,lo]=labels[n];const m=K.label(t,Object.assign({fs:28,bg:NV,edge:CY},lo||{}));m.material.depthTest=false;m.renderOrder=10;cam.add(m);o.lab[n]=m}
  o.bag=CHAR3.bagley(K,{r:.38});o.bag.position.set(2.15,-1.05,-5);cam.add(o.bag);if(extra)extra(K,cam,o);return o})}
/* label m at camera-space (x,y) at distance d, alpha a pops it (scale), s = size */
function rfLab(m,x,y,a,s=1,d=6){m.visible=a>0;m.position.set(x,y,-d);m.scale.setScalar(Math.max(1e-3,bk(cl(a))*s*.62))}
function rfReset(o){for(const k in o.lab)o.lab[k].visible=false}
/* pose Bagley with the voice: m = {rings, sq, tilt, dx, dy, tool, lamp, sleep ...} */
function rfBag(o,T,m={}){const [lv,sp]=CHAR3.level(T);(o.bag||o).userData.pose(T,{lv,speak:sp,...m})}
/* add Bagley to a stage camera in camera space (lower right by default) */
function rfBagIn(K,cam,o={}){const b=CHAR3.bagley(K,{r:o.r||.38});b.position.set(o.x??2.15,o.y??-1.05,o.z??-5);cam.add(b);return b}

/* a canvas texture you can repaint from a key: tx = rfTex(K,w,h); rfPaint(tx, key, (ctx,w,h)=>{...}) repaints only when key changes */
function rfTex(K,w,h){const t=K.canvasTex(w,h,(x,W,H)=>{x.fillStyle='#0b1430';x.fillRect(0,0,W,H)});t.userData={key:null};return t}
function rfPaint(t,key,paint){if(t.userData.key===key)return;t.userData.key=key;const c=t.image,x=c.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);paint(x,c.width,c.height);t.needsUpdate=true}

/* the "1 in 3" scoreboard (scenes 1 and 11): a giant low-poly board on two legs with an LED face.
   rfScoreboard(K,P,{w,h}) -> group; group.userData.tex is its face; paint with rfBoardFace(tx, n) where n 0..1 lights it */
function rfScoreboard(K,P,o={}){const w=o.w||6.4,h=o.h||3.2,g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const fr=new THREE.Mesh(G.box(w+.5,h+.5,.5),M(P.metal));fr.position.y=h/2+2.6;fr.castShadow=true;g.add(fr);
  for(const sx of[-1,1]){const leg=new THREE.Mesh(G.box(.36,2.6,.36),M(P.metal));leg.position.set(sx*w*.32,1.3,0);g.add(leg)}
  const top=new THREE.Mesh(G.box(w+.8,.22,.7),M(P.terraDk));top.position.y=h+2.6+.36;g.add(top);
  for(let k=0;k<6;k++){const bulb=new THREE.Mesh(G.sph(.09,6,4),LP3.glow(P.glow));bulb.position.set(-w/2+.3+k*(w-.6)/5,h+2.6+.52,0);g.add(bulb)}
  const tx=rfTex(K,1024,512);const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));face.position.set(0,h/2+2.6,.26);g.add(face);
  g.userData.tex=tx;g.userData.faceH=h/2+2.6;return g}
/* paint the board's face: big amber "1 in 3"; n 0..1 = how lit (quantised so it repaints rarely); sub = small line under it */
function rfBoardFace(tx,n=1,sub=''){const q=Math.round(cl(n)*8)/8;rfPaint(tx,'b'+q+sub,(x,W,H)=>{x.fillStyle='#0a1022';x.fillRect(0,0,W,H);
  for(let yy=0;yy<H;yy+=16)for(let xx=0;xx<W;xx+=16){x.fillStyle='rgba(255,255,255,.035)';x.fillRect(xx+5,yy+5,6,6)}
  x.globalAlpha=q;x.fillStyle='#ffc45a';x.shadowColor='#ffb040';x.shadowBlur=40;x.font='800 250px "IBM Plex Mono",monospace';x.textAlign='center';x.textBaseline='middle';x.fillText('1 in 3',W/2,H*(sub?.42:.5));
  if(sub){x.shadowBlur=12;x.font='600 54px "IBM Plex Sans",sans-serif';x.fillStyle='#ffe2b0';x.fillText(sub,W/2,H*.82)}x.globalAlpha=1})}

/* a stadium (scenes 1, 9, 11): pitch with mowing stripes, four tiers of stands with a seated low-poly crowd (instanced),
   four floodlight towers, the scoreboard at the far end. rfStadium(K, scene, P, {crowd:1, board:1}) -> o; pose with
   rfStadiumPose(o, T). Pitch centre at 0,0,0; length along z (-24..24), width along x (-16..16); the board at z -27. */
function rfStadium(K,s,P,o={}){const M=LP3.mat,G=LP3.geo,r={grp:new THREE.Group()};s.add(r.grp);const A=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;r.grp.add(m);return m};
  A(new THREE.Mesh(G.box(80,.2,80),M(P.pave2)),0,-.1,0);
  for(let k=0;k<12;k++)A(new THREE.Mesh(G.box(32,.02,4),M(k%2?P.grass:P.grassDk)),0,.01,-22+k*4);
  const line=(w,d,x,z)=>{const m=new THREE.Mesh(G.box(w,.03,d),M(P.trim));m.position.set(x,.03,z);r.grp.add(m)};
  line(32,.12,0,0);line(.12,48,-16,0);line(.12,48,16,0);line(32,.12,0,-24);line(32,.12,0,24);
  const cc=new THREE.Mesh(new THREE.TorusGeometry(4,.06,3,28),M(P.trim));cc.rotation.x=Math.PI/2;cc.position.y=.04;r.grp.add(cc);
  for(const sz of[-1,1]){line(14,.12,0,sz*18);line(.12,6,-7,sz*21);line(.12,6,7,sz*21);
    const gl=new THREE.Group();for(const sx of[-1,1]){const pst=new THREE.Mesh(G.box(.18,2.4,.18),M(P.white));pst.position.set(sx*3.6,1.2,0);gl.add(pst)}
    const bar=new THREE.Mesh(G.box(7.4,.18,.18),M(P.white));bar.position.y=2.4;gl.add(bar);gl.position.set(0,0,sz*24);r.grp.add(gl)}
  /* stands: tiers on both long sides and behind the near goal */
  const tierC=[P.teal,P.tealLt,P.teal,P.interior];r.crowd=[];
  const stand=(len,x,z,ry)=>{const st=new THREE.Group();st.position.set(x,0,z);st.rotation.y=ry;r.grp.add(st);
    for(let k=0;k<4;k++){const m=new THREE.Mesh(G.box(len,.7,1.6),M(tierC[k]));m.position.set(0,.35+k*.7,-k*1.6);m.castShadow=m.receiveShadow=true;st.add(m)}
    const roof=new THREE.Mesh(G.box(len,.2,7),M(P.metal));roof.position.set(0,5.4,-2.6);st.add(roof);return st};
  const sts=[stand(44,-20,0,Math.PI/2),stand(44,20,0,-Math.PI/2),stand(30,0,28,Math.PI)];
  if(o.crowd!==0){const cols=[P.awnA,P.cyan,P.trim,P.bike,P.rose,P.sage,P.white],geo=G.cyl(.13,.19,.44,6),hgeo=G.sph(.125,6,4),mats=cols.map(c=>M(c)),skins=[M(0xf3c39d),M(0xe9b48e)];
    sts.forEach((st,si)=>{const len=si<2?44:30;mats.forEach((mt,ci)=>{const pos=[];for(let k=0;k<4;k++)for(let x=-len/2+.5;x<len/2;x+=.62){const h=LP3.hash(si*977+k*131+Math.round(x*10));if(Math.floor(h*cols.length)!==ci||LP3.hash(h*91+x)<.18)continue;pos.push([x,.95+k*.7,-k*1.6-.2,h])}
      if(!pos.length)return;const im=new THREE.InstancedMesh(geo,mt,pos.length);const d=new THREE.Object3D();const hm=new THREE.InstancedMesh(hgeo,skins[ci%2],pos.length);pos.forEach((q,i)=>{d.position.set(q[0],q[1]-.03,q[2]);d.updateMatrix();im.setMatrixAt(i,d.matrix);d.position.y+=.36;d.updateMatrix();hm.setMatrixAt(i,d.matrix)});
      im.userData.noAudit=1;hm.userData.noAudit=1;st.add(im,hm);r.crowd.push({im,hm,pos,d})})})}
  /* floodlights */
  r.lamps=[];for(const[x,z]of[[-19,-22],[19,-22],[-19,22],[19,22]]){A(new THREE.Mesh(G.box(.4,13,.4),M(P.metal)),x,6.5,z);const hd=A(new THREE.Mesh(G.box(3,1.4,.4),M(P.metal)),x,13.4,z);hd.lookAt(0,0,0);
    for(let k=0;k<6;k++){const b=new THREE.Mesh(G.box(.36,.36,.1),LP3.glow(P.glow));b.position.set(-1.1+(k%3)*1.1,k<3?.32:-.32,.22);hd.add(b)}
    const h=K.halo(o.night?'255,226,160':'255,246,220',o.night?7:3,o.night?.55:.25);h.position.set(x,13.4,z);r.grp.add(h);r.lamps.push(h)}
  if(o.board!==0){r.board=rfScoreboard(K,P,{});r.board.position.set(0,0,-30.5);r.grp.add(r.board)}
  return r}
/* crowd bob: a few seats rise and fall (cheap: every 6th seated block), floodlight halos breathe */
function rfStadiumPose(r,T,cheer=0){for(const c of r.crowd){const{im,hm,pos,d}=c;let ch=0;for(let i=0;i<pos.length;i+=5){const q=pos[i];const j=Math.max(0,Math.sin(T*(3+q[3]*2)+q[3]*40))*(.05+cheer*.25);
      d.position.set(q[0],q[1]-.03+j,q[2]);d.updateMatrix();im.setMatrixAt(i,d.matrix);d.position.y+=.36;d.updateMatrix();hm.setMatrixAt(i,d.matrix);ch=1}if(ch){im.instanceMatrix.needsUpdate=true;hm.instanceMatrix.needsUpdate=true}}
  r.lamps.forEach((h,k)=>{h.material.opacity=(.42+.06*Math.sin(T*1.3+k))})}

/* a referee whistle (scenes 1, 9, 11): low-poly, silver body + mouthpiece + lanyard ring. ~.5 long at s 1 */
function rfWhistle(K,P,o={}){const g=new THREE.Group(),M=LP3.mat,s=o.s||1,c=o.c??0xd8dde8;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.16*s,.2*s,9),M(c));body.rotation.x=Math.PI/2;g.add(body);
  const mp=new THREE.Mesh(LP3.geo.box(.3*s,.1*s,.16*s),M(c));mp.position.set(.24*s,.08*s,0);g.add(mp);
  const hole=new THREE.Mesh(LP3.geo.box(.08*s,.03*s,.1*s),M(P.metal));hole.position.set(.06*s,.16*s,0);g.add(hole);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.07*s,.018*s,4,10),M(o.ring??P.awnA));ring.position.set(-.18*s,.1*s,0);g.add(ring);return g}

/* the Lumen app on a phone screen (scenes 2, 6, 7). rfLumenPaint(ctx,w,h,{sub}) paints the app's home/paywall look;
   rfLumenPhone(K,P,{s}) -> group (a phone ~1.2 tall at s 1, screen painted with Lumen) */
function rfLumenPaint(x,W,H,o={}){const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#2a1f5c');gr.addColorStop(1,'#0e1430');x.fillStyle=gr;x.fillRect(0,0,W,H);
  const cx=W/2;x.fillStyle='#ffcf6a';x.beginPath();x.arc(cx,H*.28,W*.16,0,6.283);x.fill();x.fillStyle='#2a1f5c';x.beginPath();x.arc(cx+W*.06,H*.26,W*.13,0,6.283);x.fill();
  x.fillStyle='#ffffff';x.textAlign='center';x.textBaseline='middle';x.font=`800 ${W*.15}px "Bricolage Grotesque",sans-serif`;x.fillText('Lumen',cx,H*.47);
  x.font=`500 ${W*.062}px "IBM Plex Sans",sans-serif`;x.fillStyle='#c9c4ff';x.fillText('AI Photo Editor',cx,H*.54);
  for(let k=0;k<3;k++){x.fillStyle=['#5fe6ff','#ff8fa3','#9cc16a'][k];x.beginPath();x.roundRect(W*.12+k*W*.27,H*.62,W*.22,W*.22,W*.03);x.fill()}
  if(o.sub){x.fillStyle='#ffcf6a';x.beginPath();x.roundRect(W*.1,H*.82,W*.8,H*.08,H*.04);x.fill();x.fillStyle='#1a1440';x.font=`700 ${W*.06}px "IBM Plex Sans",sans-serif`;x.fillText(o.sub,cx,H*.86)}}
function rfLumenPhone(K,P,o={}){const s=o.s||1,g=new THREE.Group(),M=LP3.mat;const b=new THREE.Mesh(LP3.geo.box(.62*s,1.2*s,.07*s),M(P.metal));g.add(b);
  const tx=K.canvasTex(300,580,(x,W,H)=>rfLumenPaint(x,W,H,o));const sc=new THREE.Mesh(new THREE.PlaneGeometry(.54*s,1.08*s),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));sc.position.z=.04*s;g.add(sc);g.userData.screen=sc;return g}

/* one scene = one RUN with a 3D backdrop. rfRun({bg, b, m, cam, p, base}) is RUN with Bagley's 2D presenter hidden
   (he lives in 3D) and empty beats filled in; n = sentence count when b is shorter */
function rfRun(D,n){const b=D.b||[];const nn=Math.max(n||0,b.length);const bb=Array.from({length:nn},(_,i)=>b[i]||(()=>{}));return RUN(Object.assign({m:()=>({hide:1})},D,{b:bb}))}

/* ============================== "Two Finalists" additions ==============================
   The two sides, in every scene: LEFT = Verdict-Accuracy Harness (teal), RIGHT = Case Desk (warm amber). */
const rfHAR='86,214,206',rfDESK='255,168,76';                    /* rgb triplets for 2D */
const rfHAR3=0x56d6ce,rfDESK3=0xffa84c,rfHAR3d=0x2e7f86,rfDESK3d=0xb8682a;  /* hex for 3D (bright, dark) */
const rfSIDE={L:{c:rfHAR,c3:rfHAR3,d3:rfHAR3d,name:'Verdict-Accuracy Harness',short:'Harness',icon:'harness'},
              R:{c:rfDESK,c3:rfDESK3,d3:rfDESK3d,name:'Case Desk',short:'Case Desk',icon:'desk'}};

/* ---------- 2D icon: the Harness — a gauge (needle at v 0..1) over a replay timeline with a moving playhead.
   rfIconHarness(g,x,y,R,{c,a,pop,v,T}) centred at x,y, fits radius R */
function rfIconHarness(g,x,y,R,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const c=o.c||rfHAR,T=o.T||0,v=o.v??(.5+.3*Math.sin(T*1.3));
  g.save();g.globalAlpha*=a;g.translate(x,y);const sc=bk(pop)*R/50;g.scale(sc,sc);g.lineCap='round';g.lineJoin='round';
  /* gauge: half-ring with ticks, needle */
  const gy=4,gr=34;g.lineWidth=7;g.strokeStyle=`rgba(${c},.28)`;g.beginPath();g.arc(0,gy,gr,Math.PI,0);g.stroke();
  g.strokeStyle=`rgba(${c},1)`;g.beginPath();g.arc(0,gy,gr,Math.PI,Math.PI+Math.PI*cl(v));g.stroke();
  g.lineWidth=2.4;for(let k=0;k<=6;k++){const an=Math.PI+k*Math.PI/6;g.beginPath();g.moveTo(Math.cos(an)*(gr-12),gy+Math.sin(an)*(gr-12));g.lineTo(Math.cos(an)*(gr-17),gy+Math.sin(an)*(gr-17));g.stroke()}
  const na=Math.PI+Math.PI*cl(v);g.strokeStyle=`rgba(${PA},1)`;g.lineWidth=4;g.beginPath();g.moveTo(0,gy);g.lineTo(Math.cos(na)*(gr-8),gy+Math.sin(na)*(gr-8));g.stroke();
  g.fillStyle=`rgba(${PA},1)`;g.beginPath();g.arc(0,gy,5,0,6.283);g.fill();
  /* replay timeline: bar with day ticks + playhead + a small replay arrow on the left */
  const ty=28,tx0=-30,tx1=40;g.lineWidth=4;g.strokeStyle=`rgba(${c},.45)`;g.beginPath();g.moveTo(tx0,ty);g.lineTo(tx1,ty);g.stroke();
  g.lineWidth=1.6;for(let k=0;k<=8;k++){const xx=tx0+k*(tx1-tx0)/8;g.beginPath();g.moveTo(xx,ty-5);g.lineTo(xx,ty+5);g.stroke()}
  const ph=tx0+(tx1-tx0)*((T*.25)%1);g.strokeStyle=`rgba(${c},1)`;g.lineWidth=4;g.beginPath();g.moveTo(tx0,ty);g.lineTo(ph,ty);g.stroke();
  g.fillStyle=`rgba(${PA},1)`;g.beginPath();g.moveTo(ph,ty-8);g.lineTo(ph+6,ty-14);g.lineTo(ph-6,ty-14);g.closePath();g.fill();g.fillRect(ph-1,ty-9,2,16);
  g.strokeStyle=`rgba(${c},1)`;g.lineWidth=3;g.beginPath();g.arc(-42,ty,7,-.6,4.2);g.stroke();
  g.fillStyle=`rgba(${c},1)`;g.beginPath();g.moveTo(-42+7*Math.cos(-.6)+5,ty+7*Math.sin(-.6)-1);g.lineTo(-42+7*Math.cos(-.6)-3,ty+7*Math.sin(-.6)-6);g.lineTo(-42+7*Math.cos(-.6)-1,ty+7*Math.sin(-.6)+5);g.closePath();g.fill();
  g.restore()}

/* ---------- 2D icon: Case Desk — an inbox tray with a support ticket sliding in, and a phone with a notification dot.
   rfIconDesk(g,x,y,R,{c,a,pop,T,n}) centred at x,y, fits radius R; n = badge count (default 1, 0 hides) */
function rfIconDesk(g,x,y,R,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return;const c=o.c||rfDESK,T=o.T||0;
  g.save();g.globalAlpha*=a;g.translate(x,y);const sc=bk(pop)*R/50;g.scale(sc,sc);g.lineCap='round';g.lineJoin='round';
  /* ticket (rounded with side notches + dashed tear line), bobbing into the tray */
  const by=-14+Math.sin(T*1.6)*3;g.save();g.translate(-8,by);g.rotate(-.12);g.fillStyle=`rgba(${c},1)`;
  g.beginPath();g.roundRect(-26,-16,52,30,5);g.fill();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(-26,-1,5,0,6.283);g.arc(26,-1,5,0,6.283);g.fill();g.globalCompositeOperation='source-over';
  g.strokeStyle=`rgba(${NV},.85)`;g.lineWidth=2;g.setLineDash([3,3]);g.beginPath();g.moveTo(10,-12);g.lineTo(10,10);g.stroke();g.setLineDash([]);
  g.fillStyle=`rgba(${NV},.85)`;g.fillRect(-18,-8,20,3.5);g.fillRect(-18,-1,16,3.5);g.fillRect(-18,6,12,3.5);g.restore();
  /* inbox tray */
  g.fillStyle='rgba(19,32,58,1)';g.strokeStyle=`rgba(${c},1)`;g.lineWidth=3.5;g.beginPath();g.moveTo(-40,4);g.lineTo(-34,30);g.lineTo(18,30);g.lineTo(24,4);g.lineTo(8,4);g.lineTo(4,12);g.lineTo(-20,12);g.lineTo(-24,4);g.closePath();g.fill();g.stroke();
  /* phone, right, slight tilt, lit screen + badge */
  g.save();g.translate(30,6);g.rotate(.14);g.fillStyle=`rgba(${PA},1)`;g.beginPath();g.roundRect(-10,-22,20,40,5);g.fill();
  g.fillStyle=`rgba(${c},${.55+.35*Math.max(0,Math.sin(T*3))})`;g.beginPath();g.roundRect(-7.5,-17,15,29,2.5);g.fill();
  g.fillStyle=`rgba(${NV},1)`;g.fillRect(-4,-12,8,2.4);g.fillRect(-4,-7,6,2.4);
  const n=o.n??1;if(n){g.fillStyle=`rgba(${rfRED},1)`;g.beginPath();g.arc(9,-21,7,0,6.283);g.fill();g.fillStyle='#fff';g.font=F({fs:10,w:700});g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),9,-20.5)}
  g.restore();g.restore()}
/* also as ic() icons: ic(g,'rfHarness',x,y,r) / ic(g,'rfDesk',x,y,r) (static pose) */
if(typeof ICONS!=='undefined'){ICONS.rfHarness=(g,R,col)=>rfIconHarness(g,0,0,R,{c:col&&col!==CY?col:rfHAR,v:.62,T:1.2});ICONS.rfDesk=(g,R,col)=>rfIconDesk(g,0,0,R,{c:col&&col!==CY?col:rfDESK,T:.3})}

/* ---------- 2D: side tag — icon disc + name, in the side's colour. side 'L' | 'R'. centred at x,y; returns width.
   rfSideTag(g,x,y,'L',{a,pop,fs,s,hot,short,T,label}) — `short:1` says "Harness" instead of the full name */
function rfSideTag(g,x,y,side,o={}){const S=rfSIDE[side],a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return 0;const fs=o.fs||20,lab=o.label||(o.short?S.short:S.name);
  g.save();g.globalAlpha*=a;g.translate(x,y);const sc=(o.s||1)*bk(pop);g.scale(sc,sc);g.font=F({fs,w:700,d:1});const tw=g.measureText(lab).width,h=fs+26,w=tw+h+fs*1.1;
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=14;g.shadowOffsetY=5;g.beginPath();g.roundRect(-w/2,-h/2,w,h,h/2);g.fillStyle='rgba(16,30,54,.96)';g.fill();g.shadowColor='transparent';
  g.lineWidth=2;g.strokeStyle=`rgba(${S.c},1)`;g.stroke();if(o.hot){g.shadowColor=`rgba(${S.c},.9)`;g.shadowBlur=22*o.hot;g.stroke();g.shadowColor='transparent'}
  g.beginPath();g.arc(-w/2+h/2,0,h/2-4,0,6.283);g.fillStyle=`rgba(${S.c},.2)`;g.fill();
  (S.icon=='harness'?rfIconHarness:rfIconDesk)(g,-w/2+h/2,0,h/2-7,{T:o.T||0});
  g.fillStyle=`rgba(${S.c},1)`;g.textAlign='left';g.textBaseline='middle';g.fillText(lab,-w/2+h+fs*.35,1);g.restore();return w}

/* ---------- 2D: split frame — the recurring two-sided layout. Faint teal wash on the left half, amber on the right, a
   thin centre seam, and a side tag at the top of each half. Content then goes in the columns:
   rfSplit(g,{a,pop,top,bot,tags,short,T,hotL,hotR,gap}) -> {L:[x0,x1,cx], R:[x0,x1,cx]} column bounds in px.
   top/bot = band (default 110..570); tags:0 hides the tags; gap = half-width of the seam (default 18). */
function rfSplit(g,o={}){const a=o.a??1,top=o.top??110,bot=o.bot??570,gap=o.gap??18,W=1280,cx=W/2,m=o.margin??60;
  const cols={L:[m,cx-gap,(m+cx-gap)/2],R:[cx+gap,W-m,(cx+gap+W-m)/2]};if(a<=0)return cols;
  g.save();g.globalAlpha*=a;
  for(const s of['L','R']){const [x0,x1]=cols[s],c=rfSIDE[s].c,gr=g.createLinearGradient(0,top,0,bot);gr.addColorStop(0,`rgba(${c},.13)`);gr.addColorStop(1,`rgba(${c},.03)`);
    g.beginPath();g.roundRect(x0,top,x1-x0,bot-top,18);g.fillStyle=gr;g.fill();g.lineWidth=1.4;g.strokeStyle=`rgba(${c},.35)`;g.stroke()}
  const sg=g.createLinearGradient(0,top,0,bot);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.5)');sg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=sg;g.fillRect(cx-1,top,2,bot-top);g.restore();
  if(o.tags!==0){const pp=o.pop??1;rfSideTag(g,cols.L[2],top+30,'L',{a,pop:pp,short:o.short,T:o.T,hot:o.hotL,fs:o.fs||18});rfSideTag(g,cols.R[2],top+30,'R',{a,pop:pp,short:o.short,T:o.T,hot:o.hotR,fs:o.fs||18})}
  return cols}

/* ============================== 3D split stage ==============================
   rfSplitStage(K,scene,P,{d,podium,shafts}) builds the two-sided arena into your stage: a teal podium at x=-d and an amber one
   at x=+d (default d 3), each a faceted hexagonal plinth with a glowing rim, a soft spotlight cone + halo from above, and a
   floor seam down the middle (x=0). Returns o = {grp, L, R, seam} where L/R = {grp, top (y of the podium top), rim, cone,
   halo, icon (the 3D icon standing on it, or null with icons:0)}. Pose with rfSplitPose(o,T,{l,r}) — l/r 0..1 light each side
   (default 1). Podium tops sit at y = .9 * podium (default 1). */
function rfSplitStage(K,s,P,o={}){const d=o.d??3,ph=.9*(o.podium??1),M=LP3.mat,G=LP3.geo,r={grp:new THREE.Group()};s.add(r.grp);
  const side=(k,sx)=>{const S=rfSIDE[k],q={grp:new THREE.Group()};q.grp.position.set(sx*d,0,0);r.grp.add(q.grp);
    const base=new THREE.Mesh(G.cyl(1.35,1.5,ph*.55,6),M(P.metal));base.position.y=ph*.275;base.castShadow=base.receiveShadow=true;q.grp.add(base);
    const mid=new THREE.Mesh(G.cyl(1.18,1.3,ph*.45,6),M(S.d3));mid.position.y=ph*.55+ph*.225;mid.castShadow=mid.receiveShadow=true;q.grp.add(mid);
    q.rim=new THREE.Mesh(new THREE.TorusGeometry(1.2,.045,3,6),LP3.glow(S.c3));q.rim.rotation.x=Math.PI/2;q.rim.rotation.z=Math.PI/6;q.rim.position.y=ph+.01;q.grp.add(q.rim);
    const cap=new THREE.Mesh(G.cyl(1.16,1.18,.04,6),M(P.trim));cap.position.y=ph;cap.receiveShadow=true;q.grp.add(cap);q.top=ph+.02;
    const cm=new THREE.MeshBasicMaterial({color:S.c3,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    q.cone=new THREE.Mesh(new THREE.ConeGeometry(1.5,7,10,1,true),cm);q.cone.position.y=ph+3.5;q.cone.userData.noAudit=1;q.grp.add(q.cone);
    q.halo=K.halo(S.c,3.2,.4);q.halo.position.y=ph+.25;q.grp.add(q.halo);
    q.icon=o.icons===0?null:(k=='L'?rfHarness3:rfDesk3)(K,P,{s:o.iconS||1});if(q.icon){q.icon.position.y=q.top;q.grp.add(q.icon)}
    return q};
  r.L=side('L',-1);r.R=side('R',1);
  r.seam=new THREE.Mesh(G.box(.06,.02,o.seamLen||10),LP3.glow(P.trim));r.seam.position.set(0,.012,o.seamZ||0);r.seam.userData.noAudit=1;r.grp.add(r.seam);
  return r}
function rfSplitPose(r,T,o={}){for(const k of['L','R']){const q=r[k],lv=cl(k=='L'?(o.l??1):(o.r??1)),br=.85+.15*Math.sin(T*1.7+(k=='L'?0:1.4));
    q.cone.material.opacity=.13*lv*br;q.cone.visible=lv>.01;q.halo.material.opacity=.42*lv*br;q.rim.material.color.setHex(lv>.5?rfSIDE[k].c3:rfSIDE[k].d3);
    if(q.icon&&q.icon.userData.pose)q.icon.userData.pose(T,lv)}}

/* ---------- 3D icon: the Harness — a standing gauge (dial + needle) behind a replay timeline rail with a sliding playhead.
   rfHarness3(K,P,{s}) -> group ~1.6 tall at s 1, base at y 0, faces +z; userData.pose(T,lv) swings the needle and slides the playhead */
function rfHarness3(K,P,o={}){const s=o.s||1,g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const post=new THREE.Mesh(G.box(.14*s,.7*s,.14*s),M(P.metal));post.position.y=.35*s;g.add(post);
  const dg=new THREE.Group();dg.position.y=.95*s;g.add(dg);
  const face=new THREE.Mesh(new THREE.CircleGeometry(.55*s,12,0,Math.PI),M(P.trim,{side:THREE.DoubleSide}));dg.add(face);
  const back=new THREE.Mesh(new THREE.CircleGeometry(.62*s,12,0,Math.PI),M(P.metal,{side:THREE.DoubleSide}));back.position.z=-.03*s;dg.add(back);
  const arc=new THREE.Mesh(new THREE.RingGeometry(.4*s,.5*s,12,1,0,Math.PI),LP3.glow(rfHAR3,{side:THREE.DoubleSide}));arc.position.z=.01*s;dg.add(arc);
  const nd=new THREE.Group();nd.position.z=.03*s;dg.add(nd);const needle=new THREE.Mesh(G.box(.05*s,.46*s,.03*s),M(P.metal));needle.position.y=.23*s;nd.add(needle);
  const hub=new THREE.Mesh(G.cyl(.07*s,.07*s,.06*s,8),M(P.awnA));hub.rotation.x=Math.PI/2;nd.add(hub);
  /* timeline rail in front, low */
  const rail=new THREE.Mesh(G.box(1.5*s,.06*s,.12*s),M(P.metal));rail.position.set(0,.12*s,.55*s);g.add(rail);
  for(let k=0;k<=8;k++){const tk=new THREE.Mesh(G.box(.02*s,.1*s,.13*s),LP3.glow(rfHAR3));tk.position.set(-.7*s+k*.175*s,.16*s,.55*s);g.add(tk)}
  const head=new THREE.Mesh(G.cone(.09*s,.16*s,4),LP3.glow(P.trim));head.rotation.x=Math.PI;const ph=new THREE.Group();ph.add(head);head.position.y=.3*s;
  const stem=new THREE.Mesh(G.box(.025*s,.22*s,.025*s),LP3.glow(P.trim));stem.position.y=.17*s;ph.add(stem);ph.position.z=.55*s;g.add(ph);
  g.traverse(m=>{if(m.isMesh)m.castShadow=true});
  g.userData.pose=(T,lv=1)=>{const v=.5+.32*Math.sin(T*1.1)+.08*Math.sin(T*3.7);nd.rotation.z=(.5-v)*Math.PI*.9*lv+(1-lv)*.8;ph.position.x=(-.7+1.4*((T*.22)%1))*s};
  return g}

/* ---------- 3D icon: Case Desk — an inbox tray with two tickets and a standing phone whose screen pulses.
   rfDesk3(K,P,{s}) -> group ~1.1 tall at s 1, base at y 0, faces +z; userData.pose(T,lv) bobs the top ticket, pulses the phone */
function rfDesk3(K,P,o={}){const s=o.s||1,g=new THREE.Group(),M=LP3.mat,G=LP3.geo;
  const tray=new THREE.Group();g.add(tray);tray.position.set(-.22*s,0,0);
  const fl=new THREE.Mesh(G.box(1.1*s,.06*s,.8*s),M(P.metal));fl.position.y=.03*s;tray.add(fl);
  for(const[w,d,x,z]of[[1.1,.06,0,.37],[1.1,.06,0,-.37],[.06,.8,.52,0],[.06,.8,-.52,0]]){const wl=new THREE.Mesh(G.box(w*s,.22*s,d*s),M(rfDESK3d));wl.position.set(x*s,.14*s,z*s);tray.add(wl)}
  const tk1=new THREE.Mesh(G.box(.86*s,.03*s,.5*s),M(P.trim));tk1.position.set(0,.09*s,0);tk1.rotation.y=.12;tray.add(tk1);
  const tk2=new THREE.Group();tray.add(tk2);const tb=new THREE.Mesh(G.box(.86*s,.035*s,.5*s),M(rfDESK3));tk2.add(tb);
  for(let k=0;k<3;k++){const ln=new THREE.Mesh(G.box((.42-k*.1)*s,.01*s,.05*s),M(P.metal));ln.position.set((-.14-k*.05)*s,.022*s,(-.12+k*.1)*s);tk2.add(ln)}
  const ph=new THREE.Group();ph.position.set(.62*s,0,.1*s);ph.rotation.y=-.35;g.add(ph);
  const body=new THREE.Mesh(G.box(.36*s,.7*s,.05*s),M(P.metal));body.position.y=.37*s;body.rotation.x=-.18;ph.add(body);
  const scr=new THREE.Mesh(G.box(.3*s,.6*s,.01*s),new THREE.MeshBasicMaterial({color:rfDESK3,toneMapped:false}));scr.position.set(0,.38*s,.03*s);scr.rotation.x=-.18;ph.add(scr);
  const dot=new THREE.Mesh(G.sph(.06*s,6,4),LP3.glow(0xee5c68));dot.position.set(.16*s,.72*s,-.03*s);ph.add(dot);
  const stand=new THREE.Mesh(G.box(.3*s,.05*s,.25*s),M(P.metal));stand.position.set(0,.025*s,-.06*s);ph.add(stand);
  g.traverse(m=>{if(m.isMesh)m.castShadow=true});
  g.userData.pose=(T,lv=1)=>{tk2.position.set(.02*s,(.16+.05*Math.max(0,Math.sin(T*1.6)))*s,.02*s);tk2.rotation.set(0,-.08+.05*Math.sin(T*.9),.03*Math.sin(T*1.6));
    const b=.55+.45*Math.max(0,Math.sin(T*3));scr.material.color.setHex(rfDESK3).multiplyScalar(.5+.5*b*lv);dot.scale.setScalar(Math.max(1e-3,(.8+.3*b)*lv))};
  return g}

/* ============================== "Case Desk, the pitch" additions (lead, 2026-11-07) ==============================
   Lumen Help = Case Desk white-labelled inside the Lumen app. Colours: rfLUM violet (the user's own bubbles, Lumen brand),
   rfLUMG Lumen gold, rfDESK amber stays Case Desk's colour (Lumen Help's replies, the console). */
const rfLUM='150,124,255',rfLUMG='255,207,106';

/* wrap text to lines that fit maxW with the context's current font */
function rfWrap(x,text,maxW){const out=[];for(const para of String(text).split('\n')){let line='';for(const w of para.split(' ')){const t=line?line+' '+w:w;
  if(line&&x.measureText(t).width>maxW){out.push(line);line=w}else line=t}out.push(line)}return out}

/* ---------- one chat bubble, top-left anchored inside its column (x0..x0+cw). Returns its height (incl. gap).
   o = {me (user, right, violet) | else Lumen Help (left, navy + amber edge), sub (small italic gloss under the text, e.g. an
   English translation), fs, a (alpha), pop (0..1 scale-in), maxW (fraction of cw, default .82), c (edge colour), measure (only
   measure, draw nothing)} */
function rfBub(x,x0,y,cw,text,o={}){const fs=o.fs||16,me=!!o.me,a=o.a??1,pop=o.pop??1,mw=cw*(o.maxW||.82),pad=fs*.75,lh=fs*1.32;
  x.save();x.font=`${me?500:400} ${fs}px "IBM Plex Sans",sans-serif`;const L1=rfWrap(x,text,mw-pad*2);let tw=Math.max(...L1.map(l=>x.measureText(l).width));
  let L2=[];const sfs=fs*.8;if(o.sub){x.font=`italic 400 ${sfs}px "IBM Plex Sans",sans-serif`;L2=rfWrap(x,o.sub,mw-pad*2);tw=Math.max(tw,...L2.map(l=>x.measureText(l).width))}
  const bw=Math.min(mw,tw+pad*2),bh=pad*1.6+L1.length*lh+(L2.length?fs*.5+L2.length*sfs*1.3:0),bx=me?x0+cw-bw:x0;
  if(!o.measure&&a>0&&pop>0){x.globalAlpha*=a;const sc=bk(cl(pop)),ox=me?bx+bw:bx;x.translate(ox,y);x.scale(sc,sc);x.translate(-ox,-y);
    const c=o.c||(me?rfLUM:rfDESK);x.beginPath();x.roundRect(bx,y,bw,bh,[fs*.9,fs*.9,me?fs*.25:fs*.9,me?fs*.9:fs*.25]);
    x.fillStyle=me?`rgba(${c},1)`:'rgba(22,34,62,1)';x.fill();if(!me){x.lineWidth=Math.max(1,fs*.09);x.strokeStyle=`rgba(${c},.85)`;x.stroke()}
    x.textAlign='left';x.textBaseline='top';x.fillStyle=me?'#ffffff':'#eef2fb';x.font=`${me?500:400} ${fs}px "IBM Plex Sans",sans-serif`;
    L1.forEach((l,k)=>x.fillText(l,bx+pad,y+pad*.8+k*lh));
    if(L2.length){x.font=`italic 400 ${sfs}px "IBM Plex Sans",sans-serif`;x.fillStyle=me?'rgba(255,255,255,.78)':'rgba(190,200,225,.9)';
      const y2=y+pad*.8+L1.length*lh+fs*.4;x.fillRect(bx+pad,y2-fs*.22,Math.min(bw-pad*2,fs*3),1);L2.forEach((l,k)=>x.fillText(l,bx+pad,y2+k*sfs*1.3))}}
  x.restore();return bh+fs*.6}

/* ---------- the Lumen Help screen (Case Desk inside the Lumen app). Paints into any 2D context in a W x H box at 0,0
   (designed at 360 x 740; everything scales with W). Use it for 3D phone textures and through rfHelpPhone2 in 2D.
   o = {msgs:[{me,text,sub,a,pop}], card:{title,rows:[[k,v],...],tag,c,a}, typing (0..1 shows the "…" dots as Lumen Help
   writes, animated by T), T, lang ('SR' etc., a small chip in the header), head (default 'Lumen Help')}.
   Bubbles stack under the header; when they outgrow the space above the card, the list scrolls so the newest shows. */
function rfHelpPaint(x,W,H,o={}){const u=o.u||W/360,T=o.T||0;x.save();
  const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#1d1748');gr.addColorStop(1,'#0c1230');x.fillStyle=gr;x.fillRect(0,0,W,H);
  /* header: back chevron, Lumen moon, title, online dot, language chip */
  x.fillStyle='rgba(255,255,255,.06)';x.fillRect(0,0,W,86*u);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(0,86*u,W,1*u);
  x.strokeStyle='#c9c4ff';x.lineWidth=3*u;x.lineCap='round';x.beginPath();x.moveTo(26*u,40*u);x.lineTo(17*u,51*u);x.lineTo(26*u,62*u);x.stroke();
  x.fillStyle='#ffcf6a';x.beginPath();x.arc(58*u,51*u,17*u,0,6.283);x.fill();x.fillStyle='#1d1748';x.beginPath();x.arc(65*u,47*u,13*u,0,6.283);x.fill();
  x.textAlign='left';x.textBaseline='middle';x.fillStyle='#ffffff';x.font=`700 ${21*u}px "IBM Plex Sans",sans-serif`;x.fillText(o.head||'Lumen Help',86*u,44*u);
  x.fillStyle='#7ce3c6';x.beginPath();x.arc(91*u,66*u,4*u,0,6.283);x.fill();x.fillStyle='#b8c0dc';x.font=`500 ${13*u}px "IBM Plex Sans",sans-serif`;x.fillText('replies in seconds',100*u,66*u);
  if(o.lang){x.font=`700 ${13*u}px "IBM Plex Mono",monospace`;const lw=x.measureText(o.lang).width+16*u;x.strokeStyle='#ffa84c';x.lineWidth=1.5*u;x.beginPath();x.roundRect(W-lw-16*u,38*u,lw,26*u,13*u);x.stroke();
    x.fillStyle='#ffa84c';x.textAlign='center';x.fillText(o.lang,W-lw/2-16*u,51.5*u)}
  /* status card at the bottom */
  let cardTop=H-24*u;const cd=o.card;if(cd&&(cd.a??1)>0){const rows=cd.rows||[],ch=(cd.title?44:14)*u+rows.length*30*u+14*u;cardTop=H-ch-22*u;const c=cd.c||'124,227,198';
    x.save();x.globalAlpha*=cd.a??1;x.beginPath();x.roundRect(14*u,cardTop,W-28*u,ch,16*u);x.fillStyle='rgba(16,30,54,.97)';x.fill();x.lineWidth=2*u;x.strokeStyle=`rgba(${c},.95)`;x.stroke();
    x.fillStyle=`rgba(${c},1)`;x.fillRect(30*u,cardTop,W-60*u,4*u);
    if(cd.title){x.textAlign='left';x.textBaseline='middle';x.fillStyle='#ffffff';x.font=`700 ${16*u}px "IBM Plex Sans",sans-serif`;x.fillText(cd.title,30*u,cardTop+26*u)}
    if(cd.tag){x.font=`700 ${12*u}px "IBM Plex Mono",monospace`;const tw=x.measureText(cd.tag).width+18*u;x.beginPath();x.roundRect(W-30*u-tw,cardTop+14*u,tw,24*u,12*u);x.fillStyle=`rgba(${c},1)`;x.fill();
      x.fillStyle='#0e1a33';x.textAlign='center';x.fillText(cd.tag,W-30*u-tw/2,cardTop+26.5*u)}
    rows.forEach(([k,v],j)=>{const yy=cardTop+(cd.title?44:14)*u+j*30*u+14*u;x.textBaseline='middle';x.textAlign='left';x.fillStyle='#aab4d0';x.font=`500 ${14*u}px "IBM Plex Sans",sans-serif`;x.fillText(k,30*u,yy);
      x.textAlign='right';x.fillStyle='#ffffff';x.font=`600 ${14*u}px "IBM Plex Sans",sans-serif`;x.fillText(v,W-30*u,yy)});x.restore()}
  /* bubble list, newest kept in view */
  const top=100*u,bot=cardTop-12*u,cw=W-32*u,ms=(o.msgs||[]).filter(m=>(m.a??1)>0&&(m.pop??1)>0),fs=o.fs?o.fs*u:15*u;
  const hs=ms.map(m=>rfBub(x,16*u,0,cw,m.text,{me:m.me,sub:m.sub,fs,measure:1}));const ty=(o.typing||0)>0?40*u:0;
  let tot=hs.reduce((s,h)=>s+h,0)+ty,y=top-Math.max(0,tot-(bot-top));x.save();x.beginPath();x.rect(0,top-6*u,W,bot-top+6*u);x.clip();
  ms.forEach((m,k)=>{rfBub(x,16*u,y,cw,m.text,{me:m.me,sub:m.sub,fs,a:m.a,pop:m.pop,c:m.c});y+=hs[k]});
  if(ty){x.globalAlpha*=cl(o.typing);x.beginPath();x.roundRect(16*u,y,70*u,32*u,16*u);x.fillStyle='rgba(22,34,62,1)';x.fill();x.strokeStyle='rgba(255,168,76,.8)';x.lineWidth=1.5*u;x.stroke();
    for(let k=0;k<3;k++){x.fillStyle=`rgba(255,168,76,${.35+.65*Math.max(0,Math.sin(T*6-k*.9))})`;x.beginPath();x.arc((36+k*15)*u,y+16*u,4.5*u,0,6.283);x.fill()}}
  x.restore();
  /* input bar (only when there's no card) */
  if(!cd){x.beginPath();x.roundRect(14*u,H-62*u,W-28*u,44*u,22*u);x.fillStyle='rgba(255,255,255,.08)';x.fill();x.fillStyle='#8790b0';x.textAlign='left';x.textBaseline='middle';
    x.font=`400 ${14*u}px "IBM Plex Sans",sans-serif`;x.fillText('Write in any language…',32*u,H-40*u)}
  x.restore()}

/* ---------- 2D phone showing Lumen Help: centred at cx,cy, h tall (width = h*.49). o = rfHelpPaint's options + {a,pop,r (tilt),
   glow (0..1 screen glow)}. Returns {x,y,w,h} of the screen in px (for X3.at-free anchoring of bridges and stamps). */
function rfHelpPhone2(g,cx,cy,h,o={}){const a=o.a??1,pop=o.pop??1,w=h*.49;if(a<=0||pop<=0)return{x:cx-w/2,y:cy-h/2,w,h};g.save();g.globalAlpha*=a;g.translate(cx,cy);if(o.r)g.rotate(o.r);
  const sc=bk(cl(pop));g.scale(sc,sc);g.shadowColor=o.glow?`rgba(${rfLUM},${.7*o.glow})`:'rgba(0,0,0,.5)';g.shadowBlur=o.glow?40*o.glow:26;g.shadowOffsetY=o.glow?0:10;
  g.beginPath();g.roundRect(-w/2,-h/2,w,h,w*.13);g.fillStyle='#1b2033';g.fill();g.shadowColor='transparent';g.lineWidth=2;g.strokeStyle='rgba(200,210,235,.35)';g.stroke();
  const m=w*.045,sw=w-2*m,sh=h-2*m;g.save();g.beginPath();g.roundRect(-sw/2,-sh/2,sw,sh,w*.1);g.clip();g.translate(-sw/2,-sh/2);const lw=360/(o.zoom||1.4),k=sw/lw;g.scale(k,k);rfHelpPaint(g,lw,sh/k,Object.assign({},o,{u:1}));g.restore();
  g.fillStyle='#0b0f1c';g.beginPath();g.roundRect(-w*.16,-h/2+m+5,w*.32,w*.075,w*.04);g.fill();g.restore();return{x:cx-sw/2,y:cy-sh/2,w:sw,h:sh}}

/* ---------- 3D phone showing Lumen Help. rfHelpPhone(K,P,{s}) -> group (~1.2 tall at s 1, centred, faces +z);
   repaint its screen with rfHelpShow(phone, key, opts) — key must change whenever opts do (quantise reveals). */
function rfHelpPhone(K,P,o={}){const s=o.s||1,g=new THREE.Group(),M=LP3.mat;const b=new THREE.Mesh(LP3.geo.box(.62*s,1.24*s,.07*s),M(o.c??P.metal));b.castShadow=true;g.add(b);
  const tx=rfTex(K,540,1110);const sc=new THREE.Mesh(new THREE.PlaneGeometry(.56*s,1.15*s),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));sc.position.z=.04*s;g.add(sc);
  g.userData.tex=tx;g.userData.screen=sc;return g}
function rfHelpShow(ph,key,o){rfPaint(ph.userData.tex,key,(x,W,H)=>rfHelpPaint(x,W,H,o))}

/* ---------- the developer's console card: one pending request with Approve / Deny.
   rfApprove(g,cx,cy,{w,who,what,why,click,a,pop,cur,denied}) centred at cx,cy (default 440 x 236).
   who = 'Ava · u00239', what = '3-day courtesy grant', why = small grey reason line. click 0..1: the cursor glides to Approve
   (0..0.8), presses (0.8..1); at 1 the request is approved (button solid green with a check, Deny greyed, a green footer
   "Approved · Premium given by the team" — override with o.done). cur:0 hides the cursor. Returns the Approve button rect. */
function rfApprove(g,cx,cy,o={}){const a=o.a??1,pop=o.pop??1,w=o.w||440,h=o.h||236,ck=cl(o.click||0),ok=ck>=1&&!o.denied;if(a<=0||pop<=0)return null;
  g.save();g.globalAlpha*=a;g.translate(cx,cy);const sc=bk(cl(pop));g.scale(sc,sc);g.translate(-w/2,-h/2);
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=24;g.shadowOffsetY=8;g.beginPath();g.roundRect(0,0,w,h,16);g.fillStyle='rgba(16,30,54,.97)';g.fill();g.shadowColor='transparent';
  g.lineWidth=1.8;g.strokeStyle=`rgba(${ok?rfGO:rfDESK},.9)`;g.stroke();g.save();g.beginPath();g.roundRect(0,0,w,40,[16,16,0,0]);g.fillStyle=`rgba(${rfDESK},.2)`;g.fill();g.restore();
  rfIconDesk(g,24,20,13,{T:o.T||0,n:ok?0:1});txt(g,44,21,'CASE DESK · CONSOLE',{fs:14,w:700,m:1,c:rfDESK,al:'left'});txt(g,w-18,21,ok?'done':'needs you',{fs:13,w:600,c:ok?rfGO:rfGOLD,al:'right'});
  txt(g,22,66,o.who||'Ava · u00239',{fs:15,c:'176,188,214',al:'left'});txt(g,22,98,o.what||'3-day courtesy grant',{fs:22,w:700,c:PA,al:'left'});
  if(o.why)txt(g,22,128,o.why,{fs:14,c:'176,188,214',al:'left'});
  const by=h-66,bw=(w-58)/2,A={x:22,y:by,w:bw,h:44},D={x:36+bw,y:by,w:bw,h:44},press=ck>.8&&ck<1?1-.06*Math.sin((ck-.8)/.2*Math.PI):1;
  g.save();g.translate(A.x+bw/2,by+22);g.scale(press,press);g.beginPath();g.roundRect(-bw/2,-22,bw,44,22);
  if(ok){g.fillStyle=`rgba(${rfGO},1)`;g.fill();txt(g,8,1,'Approved',{fs:17,w:700,c:NV});ic(g,'check',-bw/2+30,0,10,NV)}
  else{g.fillStyle=`rgba(${rfGO},${o.denied?.12:.18+.5*cl((ck-.5)/.3)})`;g.fill();g.lineWidth=2;g.strokeStyle=`rgba(${rfGO},${o.denied?.3:1})`;g.stroke();txt(g,0,1,'Approve',{fs:17,w:700,c:o.denied?rfGRY:rfGO})}g.restore();
  g.beginPath();g.roundRect(D.x,by,bw,44,22);g.lineWidth=2;g.strokeStyle=`rgba(${o.denied?rfRED:rfGRY},${ok?.3:.9})`;g.stroke();if(o.denied){g.fillStyle=`rgba(${rfRED},1)`;g.fill()}
  txt(g,D.x+bw/2,by+23,o.denied?'Denied':'Deny',{fs:17,w:700,c:o.denied?NV:rfGRY,a:ok?.35:1});
  if(ok){txt(g,w/2,h+22,o.done||'Approved · Premium given by the team',{fs:15,w:600,c:rfGO})}
  /* cursor: glides in from lower right to the Approve button, presses */
  if(o.cur!==0&&ck>0&&ck<1.0001){const q=sm(cl(ck/.8)),px=L(w+60,A.x+bw*.55,q),py=L(h+70,by+26,q),ca=cl(ck*6)*(ok?.0:1);
    if(ca>0){g.save();g.globalAlpha*=ca;g.translate(px,py);const ps=ck>.8?.88:1;g.scale(ps,ps);g.beginPath();g.moveTo(0,0);g.lineTo(0,26);g.lineTo(7,20);g.lineTo(12,31);g.lineTo(17,29);g.lineTo(12,18);g.lineTo(21,18);g.closePath();
      g.fillStyle='#ffffff';g.fill();g.lineWidth=2;g.strokeStyle='#0e1a33';g.stroke();g.restore()}}
  g.restore();const s0=bk(cl(pop));return{x:cx+(A.x-w/2)*s0,y:cy+(by-h/2)*s0,w:bw*s0,h:44*s0}}

/* ---------- 2D ticket pile: n support tickets heaped on a base line, centred at x (bottom at y). The big number sits above.
   rfTicketStack(g,x,y,{n (tickets drawn, default 9),f (0..1 how much of the pile has landed),num ('125'),label ('cancelled, still paid up'),c,a,pop,T,w})
   Tickets drop in one by one as f rises; the top one wobbles with T. Returns the pile's top y. */
function rfTicketStack(g,x,y,o={}){const a=o.a??1,pop=o.pop??1;if(a<=0||pop<=0)return y;const n=o.n||9,f=cl(o.f??1),c=o.c||rfDESK,tw=o.w||120,th=tw*.34,T=o.T||0;
  g.save();g.globalAlpha*=a;g.translate(x,y);const sc=bk(cl(pop));g.scale(sc,sc);let topY=0;
  for(let k=0;k<n;k++){const q=cl(f*n-k);if(q<=0)break;const h1=typeof LP3!=="undefined"&&LP3?LP3.hash(k*13.7+n):(.5+.5*Math.sin(k*91.7)),yy=-th*.55*k-th/2,
    dy=-(1-sm(q))*120,r=(h1-.5)*.16+(k==n-1||q<1?Math.sin(T*2+k)*.03:0),dx=(h1-.5)*tw*.14;
    g.save();g.globalAlpha*=cl(q*2);g.translate(dx,yy+dy);g.rotate(r);g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=8;g.shadowOffsetY=3;
    g.beginPath();g.roundRect(-tw/2,-th/2,tw,th,6);g.fillStyle=k%2?`rgba(${c},1)`:'rgba(238,233,222,1)';g.fill();g.shadowColor='transparent';
    g.globalCompositeOperation='destination-out';g.beginPath();g.arc(-tw/2,0,th*.18,0,6.283);g.arc(tw/2,0,th*.18,0,6.283);g.fill();g.globalCompositeOperation='source-over';
    g.fillStyle=k%2?`rgba(${NV},.7)`:'rgba(120,130,150,.8)';g.fillRect(-tw*.36,-th*.18,tw*.4,th*.12);g.fillRect(-tw*.36,th*.06,tw*.28,th*.12);
    g.setLineDash([3,3]);g.strokeStyle=k%2?`rgba(${NV},.6)`:'rgba(120,130,150,.7)';g.lineWidth=1.5;g.beginPath();g.moveTo(tw*.22,-th*.4);g.lineTo(tw*.22,th*.4);g.stroke();g.setLineDash([]);g.restore();
    topY=yy-th/2}
  if(o.num)txt(g,0,topY-44,o.num,{fs:o.fs||46,w:800,m:1,c,glow:10,a:cl(f*3-1.2)});if(o.label)txt(g,0,34,o.label,{fs:o.lfs||16,w:600,c:PA,a:cl(f*3-1.5)});
  g.restore();return y+topY*sc}

/* ---------- 3D ticket stack: a pile of support tickets (paper slabs with a perforation stripe and text lines).
   rfTickets3(K,P,{n (max tickets, default 16), s, c (accent hex, default Case Desk amber)}) -> group, base at y 0, faces +z.
   userData.pose(T,f) shows the first round(f*n) tickets (f 0..1; the newest drops in from above), the top one flutters.
   userData.topY(f) = height of the pile's top at that f (to stand a label on it). Each slab is .9 x .035 x .5 at s 1. */
function rfTickets3(K,P,o={}){const s=o.s||1,n=o.n||16,g=new THREE.Group(),M=LP3.mat,G=LP3.geo,cA=o.c??rfDESK3,th=.035*s;
  const gp=G.box(.9*s,th,.5*s),gl=G.box(.36*s,.004*s,.05*s),gs=G.box(.02*s,.004*s,.44*s),mP=M(P.trim),mA=M(cA),mL=M(P.metal);const sl=[];
  for(let k=0;k<n;k++){const t=new THREE.Group(),h=LP3.hash(k*7.3+n*.17);const slab=new THREE.Mesh(gp,k%3==2?mA:mP);slab.castShadow=slab.receiveShadow=true;t.add(slab);
    for(let j=0;j<2;j++){const ln=new THREE.Mesh(gl,mL);ln.position.set((-.12-j*.04)*s,th/2+.002*s,(-.08+j*.1)*s);ln.scale.x=1-j*.3;t.add(ln)}
    const st=new THREE.Mesh(gs,mL);st.position.set(.26*s,th/2+.002*s,0);t.add(st);t.userData.h=h;g.add(t);sl.push(t)}
  g.userData.topY=f=>Math.round(cl(f)*n)*th;
  g.userData.pose=(T,f=1)=>{const m=cl(f)*n;sl.forEach((t,k)=>{const q=cl(m-k);t.visible=q>0;if(!q)return;const h=t.userData.h,top=k==Math.ceil(m)-1;
    t.position.set((h-.5)*.12*s,th/2+k*th+(1-sm(q))*1.2*s+(top?Math.max(0,Math.sin(T*2.2+k))*.015*s:0),(LP3.hash(h*31)-.5)*.08*s);
    t.rotation.set(top?Math.sin(T*1.7)*.03:0,(h-.5)*.5,top?Math.sin(T*1.3+1)*.02:0)})};
  g.userData.pose(0,1);return g}

/* ============================== the Belgrade night (scenes 1, 2 and 8's closer) ==============================
   One stage, key 'cd-night', two cutaway rooms under a night skyline:
     Marko's living room (left, centre x -4.2, z 0): sofa with Marko on it, his phone glowing in his hand, a window on the
       night city, a floor lamp, a coffee table with a mug, a plant, a picture, a sleeping cat on the rug.
     the founder's home office (right, centre x 4.4, z -1.2): desk turned three-quarters, the founder typing, a monitor
       (inbox), desk lamp, bookshelf, a plant, a wall clock at eleven; dark until lit (litB).
   const ST=rfNight(); X3.draw(g,ST,o=>{rfNightPose(o,T,{...}); K3.look(o.camera,...)},t)
   rfNightPose(o,T,{litB 0..1, litA 0..1 (default 1), fillA/fillB (cool face fill light on Marko / the founder, default 0), phone 0..1 (screen glow), marko:{pose,face,look}, founder:{pose,face,look},
     piles:[f125,f58,f50] (0..1 each; hidden at 0), mon:{n (inbox count shown, 0 = plain inbox), hot 0..1}, help:{rfHelpPaint opts, key}})
   Bagley lives in its camera space as o.bag (pose him with rfBag(o.bag,T,{...}); move with o.bag.position).
   Useful world points (for X3.at): o.pt.phone(), o.pt.monitor(), o.pt.markoHead(), o.pt.founderHead(), o.pt.pile(k) top of pile k. */
function rfNightMon(x,W,H,n=0,hot=0){x.fillStyle='#0e1730';x.fillRect(0,0,W,H);x.fillStyle='#1d2a4c';x.fillRect(0,0,W*.24,H);
  x.fillStyle='#ffcf6a';x.beginPath();x.arc(W*.07,H*.09,H*.035,0,6.283);x.fill();x.fillStyle='#1d2a4c';x.beginPath();x.arc(W*.08,H*.08,H*.03,0,6.283);x.fill();
  x.fillStyle='#ffffff';x.font=`700 ${H*.055}px "IBM Plex Sans",sans-serif`;x.textAlign='left';x.textBaseline='middle';x.fillText('Lumen',W*.11,H*.09);
  x.fillStyle='rgba(255,168,76,.9)';x.fillRect(W*.03,H*.2,W*.18,H*.06);x.fillStyle='#13203a';x.font=`700 ${H*.04}px "IBM Plex Sans",sans-serif`;x.fillText('Support',W*.045,H*.23);
  for(let i=0;i<7;i++){x.fillStyle=`rgba(238,243,250,${i===0?.8:.28})`;x.fillRect(W*.29,H*(.12+i*.12),W*(.3+LP3.hash(i*7)*.3),H*.045);x.fillStyle='rgba(238,243,250,.12)';x.fillRect(W*.29,H*(.18+i*.12),W*.55,H*.025);
    x.fillStyle=i<3?'#ee5c68':'rgba(238,243,250,.2)';x.beginPath();x.arc(W*.27,H*(.145+i*.12),H*.012,0,6.283);x.fill()}
  if(n){const s=String(n);x.font=`800 ${H*.12}px "IBM Plex Mono",monospace`;const bw=x.measureText(s).width+H*.12;x.fillStyle=`rgba(238,92,104,${.85+.15*hot})`;x.beginPath();x.roundRect(W*.96-bw,H*.03,bw,H*.16,H*.08);x.fill();
    x.fillStyle='#fff';x.textAlign='center';x.fillText(s,W*.96-bw/2,H*.115)}}
function rfNight(){return X3.stage('cd-night',K=>{const s=K.scene({fov:34}),lp=LP3.world(K,s,{mood:'night',skyline:[{z:-26,h0:6,h1:12,seed:11},{z:-38,h0:9,h1:17,seed:37,c:LP3.MOODS.night.haze1}],clouds:3,shadow:14,sunDir:[-3,9,7]}),P=lp.P,M=LP3.mat,G=LP3.geo;
  const o={scene:s,lp,P,camera:s.userData.cam,alive:[]};const R=(f,x,y,z,ry=0)=>{const m=K.add(s,f,x,y,z);m.rotation.y=ry;return m};
  const box=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(G.box(w,h,d),M(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;s.add(m);return m};
  const gnd=box(80,.1,60,P.road,0,-.36,-10);gnd.userData.pl_name='ground';
  /* street lamps and a few low buildings between and behind the rooms, so the gap reads as a city at night */
  for(const[x,z]of[[-8.2,2.2],[8.6,2.4]]){const lpst=R(PROPS3.lampPost(K,P,{kind:'classic',h:3.4,light:1}),x,-.31,z);o.alive.push(lpst)}
  for(const[x,z,st,sd]of[[-1.2,-9,4,3],[2.6,-11,6,7],[-7.5,-12,5,11],[9,-12,7,5]]){const b=R(PROPS3.building(K,P,{storeys:st,w:3.2,lit:.55,seed:sd,roof:'flat'}),x,-.31,z)}
  /* ---- room A: Marko */
  const ax=-4.2;box(5.2,.3,4.2,P.woodDk,ax,-.15,0);box(5.2,3.3,.2,P.interior,ax,1.65,-2.1);box(.2,3.3,4.2,P.interior,ax-2.6,1.65,0);box(5.2,.12,.06,P.trim,ax,.06,-1.98);
  o.rugA=R(PROPS3.rug(K,P,{kind:'rect',w:2.6,d:1.8,c:'rose'}),ax,0,.1);
  o.sofa=R(PROPS3.sofa(K,P,{w:1.9,c:'teal'}),ax,0,-1.45);
  o.ctab=R(PROPS3.table(K,P,{kind:'coffee'}),ax+.2,0,.55);o.mugA=R(PROPS3.mug(K,P,{steam:1,c:'trim'}),0,0,0);o.alive.push(o.mugA);
  o.flampA=R(PROPS3.lamp(K,P,{kind:'floor',light:1,c:'awnA'}),ax-1.75,0,-1.45);o.alive.push(o.flampA);
  o.win=R(PROPS3.window(K,P,{w:1.3,h:1.4,curtains:1}),ax+1.55,1.0,-1.93);o.alive.push(o.win);
  o.plantA=R(PROPS3.plant(K,P,{kind:'monstera',s:1.1}),ax+2.1,0,-1.4);
  {const fr=box(.8,.6,.04,P.wood,ax-.3,2.2,-1.98);const pic=box(.68,.48,.02,P.sage,ax-.3,2.2,-1.955);}
  o.cat=K.add(s,CHAR3.cat(K,{P}));
  o.marko=K.add(s,CHAR3.person(K,{skin:0xf3c39d,P,seed:9,kind:'tee',c:P.sand,hairStyle:'short'}));
  o.phA=rfHelpPhone(K,P,{s:.13});s.add(o.phA);o.phHalo=K.halo(rfLUM,1.0,.4);s.add(o.phHalo);
  o.lightA=new THREE.PointLight(0xffd29a,0,7,1.6);o.lightA.position.set(ax-1.5,1.9,-.6);s.add(o.lightA);
  /* ---- room B: the founder */
  const bx=4.4,bz=-1.2;box(5.2,.3,4.2,P.woodDk,bx,-.15,bz);box(5.2,3.3,.2,P.interior,bx,1.65,bz-2.1);box(.2,3.3,4.2,P.interior,bx+2.6,1.65,bz);box(5.2,.12,.06,P.trim,bx,.06,bz-1.98);
  o.rugB=R(PROPS3.rug(K,P,{kind:'rect',w:2.4,d:1.8,c:'awnA'}),bx-.2,0,bz+.1,-.12);
  o.desk=R(PROPS3.desk(K,P,{kind:'office',w:1.5}),bx-.2,0,bz-.3,Math.PI+.55);
  o.chair=R(PROPS3.chair(K,P,{kind:'office'}),bx-.4,0,bz-1.1);
  o.founder=K.add(s,CHAR3.person(K,{skin:0xf3c39d,P,seed:21,kind:'long',c:P.teal,glasses:1}));
  o.monTx=rfTex(K,640,372);o.mon=R(PROPS3.monitor(K,P,{tex:o.monTx,w:.66}),0,0,0);
  o.kb=R(PROPS3.keyboard(K,P,{}),0,0,0);o.mugB=R(PROPS3.mug(K,P,{steam:1,c:'terra'}),0,0,0);o.alive.push(o.mugB);
  o.dl=R(PROPS3.lamp(K,P,{kind:'desk',light:1,c:'awnA'}),0,0,0);
  o.shelf=R(PROPS3.bookshelf(K,P,{w:1.1,h:2}),bx+1.8,0,bz-1.75);o.plantB=R(PROPS3.plant(K,P,{kind:'snake'}),bx-2,0,bz-1.6);
  o.clock=new THREE.Group();s.add(o.clock);o.clock.position.set(bx-.9,2.35,bz-1.98);
  {const f=new THREE.Mesh(G.cyl(.26,.26,.05,20),M(P.trim));f.rotation.x=Math.PI/2;o.clock.add(f);const rim=new THREE.Mesh(new THREE.TorusGeometry(.26,.03,4,20),M(P.metal));o.clock.add(rim);
   for(let k=0;k<12;k++){const t=new THREE.Mesh(G.box(.02,.05,.01),M(P.metal));const a=k/12*Math.PI*2;t.position.set(Math.sin(a)*.2,Math.cos(a)*.2,.03);t.rotation.z=-a;o.clock.add(t)}
   o.hHand=new THREE.Mesh(G.box(.03,.13,.012),M(P.interior));o.hHand.geometry.translate(0,.055,0);o.hHand.position.z=.04;o.clock.add(o.hHand);
   o.mHand=new THREE.Mesh(G.box(.02,.18,.012),M(P.interior));o.mHand.geometry.translate(0,.08,0);o.mHand.position.z=.045;o.clock.add(o.mHand)}
  o.lightB=new THREE.PointLight(0xffc27a,0,6,1.6);o.lightB.position.set(bx-.6,1.6,bz-.2);s.add(o.lightB);
  /* optional cool face fills (rev 3): the phone's light on Marko's face, the monitor's on the founder's; off unless asked (fillA/fillB) */
  o.fillA=new THREE.PointLight(0xdfe8ff,0,2.4,1.8);s.add(o.fillA);o.fillB=new THREE.PointLight(0xc4d6ff,0,2.6,1.8);s.add(o.fillB);
  o.monHalo=K.halo('120,170,255',1.6,0);s.add(o.monHalo);o.lampHalo=K.halo('255,200,120',1.2,0);s.add(o.lampHalo);
  /* three ticket piles in front of the desk (scene 2) */
  o.piles=[0,1,2].map(k=>{const p=rfTickets3(K,P,{n:[25,12,10][k],s:.62,c:[rfDESK3,0xee5c68,0xa9b6ff][k]});p.position.set(bx-1.5+k*1.25,0,bz+1.35);p.rotation.y=-.15+k*.1;s.add(p);return p});
  LP3.shadows(s);
  const wp=(m,y=0)=>{const v=new THREE.Vector3();m.getWorldPosition(v);v.y+=y;return[v.x,v.y,v.z]};
  o.pt={phone:()=>wp(o.phA),monitor:()=>{const v=wp(o.mon);return[v[0],v[1]+.38,v[2]]},markoHead:()=>{const v=wp(o.marko);return[v[0],v[1]+1.3,v[2]]},founderHead:()=>{const v=wp(o.founder);return[v[0],v[1]+1.3,v[2]]},
    pile:k=>{const p=o.piles[k];return[p.position.x,p.userData.topY(p.userData.f||0)+.05,p.position.z]}};
  s.add(o.camera);o.bag=rfBagIn(K,o.camera,{x:1.34,y:-.64,z:-3.2,r:.24});return o})}
function rfNightPose(o,T,q={}){o.lp.pose(T);for(const a of o.alive)if(a.userData.pose)a.userData.pose(T);
  const litA=q.litA??1,litB=cl(q.litB??0),mk=q.marko||{},fd=q.founder||{};
  /* room A */
  PLACE3.onSurface(o.mugA,o.ctab,[-.35,.1]);PLACE3.lie(o.cat,o.rugA,[.75,.6],{ry:-.5});o.cat.userData.pose(T,{pose:'sleep'});
  o.marko.userData.pose(T,{pose:mk.pose||'sit',w:1,look:mk.look??-.15,face:mk.face||'neutral',hand:1});PLACE3.sit(o.marko,o.sofa,{seat:0});
  o.marko.updateMatrixWorld(true);const b=o.marko.userData.bones||{},hL=b.handL,hR=b.handR,v=new THREE.Vector3(),v2=new THREE.Vector3();
  if(hL&&hR){hL.getWorldPosition(v);hR.getWorldPosition(v2);v.add(v2).multiplyScalar(.5)}else{o.marko.getWorldPosition(v);v.y+=.5;v.z+=.3}
  o.phA.position.set(v.x,v.y+.1,v.z+.07);o.phA.rotation.set(-.45,.15,0);
  const ph=cl(q.phone??1);o.phHalo.position.copy(o.phA.position);o.phHalo.position.z+=.05;o.phHalo.material.opacity=(.25+.1*Math.sin(T*2.1))*ph;
  o.phA.userData.screen.material.color.setScalar(.25+.75*ph);
  if(q.help)rfHelpShow(o.phA,q.help.key||'h',q.help);else rfHelpShow(o.phA,'home',{msgs:[{me:1,text:'Naplatili ste mi nakon što sam otkazao!'}],lang:'SR'});
  o.lightA.intensity=1.6*litA;
  /* room B */
  PLACE3.onSurface(o.mon,o.desk,[.05,-.55],{ry:.55});PLACE3.onSurface(o.kb,o.desk,[.05,.1],{ry:.55});PLACE3.onSurface(o.dl,o.desk,[-.8,-.5],{ry:Math.PI+.2});
  PLACE3.onSurface(o.mugB,o.desk,[.78,.25]);
  o.founder.userData.pose(T,{pose:fd.pose||(litB>.5?'type':'sit'),w:1,look:fd.look||0,face:fd.face||'neutral',hand:fd.hand||1});PLACE3.atDesk(o.founder,o.desk,o.chair);
  o.mHand.rotation.z=-(T*.004)%(Math.PI*2);o.hHand.rotation.z=-(11/12)*Math.PI*2-(T*.004)/12;
  const mn=q.mon||{};rfPaint(o.monTx,litB>.05?'m'+(mn.n||0)+':'+Math.round((mn.hot||0)*4):'off',(x,W,H)=>{if(litB>.05)rfNightMon(x,W,H,mn.n||0,mn.hot||0);else{x.fillStyle='#05080f';x.fillRect(0,0,W,H)}});
  if(o.mon.userData.screen)o.mon.userData.screen.material.color&&o.mon.userData.screen.material.color.setScalar(.15+.85*litB);
  o.lightB.intensity=1.8*litB;const mp=o.pt.monitor();o.monHalo.position.set(mp[0],mp[1],mp[2]+.15);o.monHalo.material.opacity=.32*litB;
  o.dl.updateMatrixWorld(true);const lv=new THREE.Vector3(.25,.32,.13);o.dl.localToWorld(lv);o.lampHalo.position.copy(lv);o.lampHalo.material.opacity=.5*litB;
  /* optional face fills (default 0 = unchanged look) */
  {const fa=q.fillA||0,fb=q.fillB||0;o.fillA.intensity=fa;o.fillB.intensity=fb;
   if(fa){const h=o.pt.markoHead();o.fillA.position.set(h[0]+.25,h[1]+.05,h[2]+.75)}
   if(fb){const h=o.pt.founderHead(),m=o.pt.monitor();o.fillB.position.set(L(h[0],m[0],.55),h[1]+.15,L(h[2],m[2],.55)+.25)}}
  /* piles */
  const pf=q.piles||[0,0,0];o.piles.forEach((p,k)=>{const f=cl(pf[k]||0);p.visible=f>0;p.userData.f=f;p.userData.pose(T,f)})}

/* RevenueCat's mark (coral rounded square, white "RC", the cat-tail swoop under it), redrawn as vector from the
   official favicon (revenuecat.com/favicon/favicon-512x512.png); x,y = top-left, s = side */
function rfRCLogo(g,x,y,s,a=1){if(a<=0)return;g.save();g.globalAlpha*=a;g.translate(x,y);
  g.fillStyle='#f2545b';g.beginPath();g.roundRect(0,0,s,s,s*.2);g.fill();
  g.fillStyle='#fff';g.font=F({fs:s*.52,w:800});g.textAlign='center';g.textBaseline='alphabetic';g.fillText('RC',s*.5,s*.62);
  g.strokeStyle='#fff';g.lineCap='round';g.lineWidth=s*.075;g.beginPath();
  g.moveTo(s*.80,s*.56);g.bezierCurveTo(s*.84,s*.66,s*.78,s*.70,s*.62,s*.68);g.bezierCurveTo(s*.42,s*.65,s*.24,s*.66,s*.24,s*.74);
  g.bezierCurveTo(s*.24,s*.80,s*.36,s*.76,s*.40,s*.80);g.stroke();g.restore()}
/* the logo plus the "RevenueCat" wordmark; returns the width */
function rfRCBrand(g,x,y,s,a=1,o={}){rfRCLogo(g,x,y,s,a);txt(g,x+s+s*.3,y+s*.52,'RevenueCat',{fs:o.fs||s*.62,w:800,al:'left',c:o.c||'255,255,255',a});
  g.save();g.font=F({fs:o.fs||s*.62,w:800});const w=g.measureText('RevenueCat').width;g.restore();return s*1.3+w}
/* a small flat low-poly cat sitting with its tail curled round (a nod to RevenueCat's tail); x,y = where it sits,
   s = height; the tail swishes and it blinks, all from T */
function rfCat(g,x,y,s,T=0,a=1,o={}){if(a<=0)return;const k=s/100,c=o.c||'#2b2f3d',hi=o.hi||'#3a4054',eye=o.eye||'#ffcf5a';
  g.save();g.globalAlpha*=a;g.translate(x,y);g.scale(k,k);
  const sw=Math.sin(T*1.6)*.25;g.save();g.translate(22,-8);g.rotate(sw);g.strokeStyle=c;g.lineCap='round';g.lineWidth=9;
  g.beginPath();g.moveTo(0,0);g.bezierCurveTo(26,6,38,-10,30,-30);g.stroke();g.restore();
  const poly=(pts,f)=>{g.fillStyle=f;g.beginPath();pts.forEach(([u,v],i)=>i?g.lineTo(u,v):g.moveTo(u,v));g.closePath();g.fill()};
  poly([[-26,0],[26,0],[22,-38],[0,-52],[-22,-38]],c);poly([[-22,-38],[0,-52],[-4,-30],[-18,-6]],hi);
  poly([[-20,-50],[20,-50],[24,-78],[0,-90],[-24,-78]],c);poly([[-24,-78],[-30,-104],[-12,-86]],c);poly([[24,-78],[30,-104],[12,-86]],c);
  poly([[-26,-99],[-20,-90],[-15,-86]],'#f2545b');poly([[26,-99],[20,-90],[15,-86]],'#f2545b');
  const bl=(T%4.2)<.14?.15:1;g.fillStyle=eye;g.beginPath();g.ellipse(-9,-70,4,5*bl,0,0,6.283);g.ellipse(9,-70,4,5*bl,0,0,6.283);g.fill();
  poly([[-3,-62],[3,-62],[0,-58]],'#f29aa0');poly([[-14,0],[-6,0],[-8,-10]],hi);poly([[6,0],[14,0],[8,-10]],hi);g.restore()}
