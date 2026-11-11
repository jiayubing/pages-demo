/* Texture-assisted nebula and procedural double-star light. No framework or external requests. */
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('universe'),ctx=canvas.getContext('2d',{alpha:false}),media=matchMedia('(prefers-reduced-motion: reduce)');
if(!ctx){$('notice').textContent='当前浏览器无法绘制动画';return;}
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
let W=1,H=1,U=1,dpr=1,time=media.matches?40:0,paused=media.matches,low=false,raf=0,last=0,lastDraw=0,adaptive=1,slow=0,frames=0;
let mobile=matchMedia('(pointer: coarse)').matches||innerWidth<700;
const scene=$('scene'),pointer={x:0,y:0,tx:0,ty:0,strength:0,active:false,kind:'mouse',touchId:null};
let sceneRect={left:0,top:0};
function clearPointer(immediate=false){pointer.active=false;pointer.touchId=null;if(immediate)pointer.strength=0;}
function readPointer(e){
 if(paused||media.matches||document.hidden||e.isPrimary===false)return;
 if(e.target?.closest?.('.controls')){clearPointer();return;}
 const kind=e.pointerType||'mouse';if(kind!=='mouse'&&pointer.touchId!==e.pointerId)return;
 pointer.tx=(clamp(e.clientX-sceneRect.left,0,W)-W*.5)/U;pointer.ty=(clamp(e.clientY-sceneRect.top,0,H)-H*.5)/U;
 if(pointer.strength<.005){pointer.x=pointer.tx;pointer.y=pointer.ty;}pointer.kind=kind;pointer.active=true;
}
function pointerDown(e){
 if(e.isPrimary===false||e.target?.closest?.('.controls')||paused||media.matches)return;
 sceneRect=canvas.getBoundingClientRect();if(e.pointerType&&e.pointerType!=='mouse'){pointer.touchId=e.pointerId;try{scene.setPointerCapture?.(e.pointerId);}catch{}}
 readPointer(e);
}
function pointerUp(e){if(e.pointerType!=='mouse'&&e.pointerId===pointer.touchId){try{scene.releasePointerCapture?.(e.pointerId);}catch{}clearPointer();}}
function stepPointer(dt){const follow=1-Math.exp(-dt*11),fade=1-Math.exp(-dt*6);pointer.x+=(pointer.tx-pointer.x)*follow;pointer.y+=(pointer.ty-pointer.y)*follow;pointer.strength+=((pointer.active?1:0)-pointer.strength)*fade;if(pointer.strength<.001)pointer.strength=0;}
function fieldAt(x,y){const dx=pointer.x-x,dy=pointer.y-y,q=clamp(1-(dx*dx+dy*dy)/(.23*.23));return q*q*pointer.strength;}
function interactivePoint(p,u){const influence=fieldAt(p.x,p.y),envelope=smooth(0,.06,u)*(1-smooth(.94,1,u));let dx=(pointer.x-p.x)*influence*.16*envelope,dy=(pointer.y-p.y)*influence*.16*envelope;const length=Math.hypot(dx,dy),cap=.010;if(length>cap){dx*=cap/length;dy*=cap/length;}return{x:p.x+dx,y:p.y+dy,influence};}
scene.addEventListener('pointerdown',pointerDown);scene.addEventListener('pointermove',readPointer);scene.addEventListener('pointerup',pointerUp);scene.addEventListener('pointercancel',()=>clearPointer());scene.addEventListener('lostpointercapture',()=>clearPointer());scene.addEventListener('pointerleave',()=>{if(pointer.kind==='mouse')clearPointer();});addEventListener('blur',()=>clearPointer(true));

function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t;}
function fbm(x,y){let v=0,f=.54;for(let i=0;i<5;i++){v+=noise(x,y)*f;x=x*2.03+9.2;y=y*2.03+5.3;f*=.5;}return v;}
const random=rng(93),dust=Array.from({length:1500},()=>({u:random(),n:random()*2-1,m:random()*2-1,s:random(),a:random()*TAU})),stars=Array.from({length:110},()=>({x:random(),y:random(),s:random(),a:random()*TAU}));
const art=new Image();let artReady=false;art.onload=()=>{artReady=true;draw();};art.onerror=()=>{$('notice').textContent='星云背景暂未载入';};
function surface(k){const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d'),im=g.createImageData(160,160),d=im.data;for(let y=0;y<160;y++)for(let x=0;x<160;x++){const px=(x-80)/74,py=(y-80)/74,r=Math.hypot(px,py),i=(y*160+x)*4;if(r>1.03)continue;const n=fbm(x*.061+k*14,y*.061),v=Math.pow(clamp(1-Math.abs(n-.49)*5.2),2),core=Math.exp(-((px+.13)**2+(py+.16)**2)*5),rim=Math.exp(-Math.pow((r-.94)*25,2)),light=clamp(.12+v*.55+core*.45+rim*.44);d[i]=k?125+light*125:169+light*85;d[i+1]=k?175+light*80:107+light*130;d[i+2]=255;d[i+3]=255*(1-smooth(.985,1.03,r));}g.putImageData(im,0,0);return c;}
function halo(k){const c=document.createElement('canvas');c.width=c.height=384;const g=c.getContext('2d'),col=k?'116,179,255':'185,105,255',r=g.createRadialGradient(192,192,0,192,192,192);r.addColorStop(0,'rgba(255,255,255,.98)');r.addColorStop(.065,`rgba(${col},.88)`);r.addColorStop(.17,`rgba(${col},.42)`);r.addColorStop(.38,`rgba(${col},.16)`);r.addColorStop(.7,`rgba(${col},.035)`);r.addColorStop(1,`rgba(${col},0)`);g.fillStyle=r;g.fillRect(0,0,384,384);return c;}
function corona(k){const c=document.createElement('canvas');c.width=c.height=384;const g=c.getContext('2d'),random=rng(15+k),col=k?'174,216,255':'226,177,255';g.translate(192,192);g.globalCompositeOperation='lighter';for(let j=0;j<38;j++){const a=random()*TAU,len=36+random()*95,bend=(random()-.5)*.65;for(const [width,alpha]of[[12,.012],[5,.023],[1,.12]]){g.strokeStyle=`rgba(${col},${alpha})`;g.lineWidth=width;g.beginPath();g.moveTo(Math.cos(a)*29,Math.sin(a)*29);g.bezierCurveTo(Math.cos(a+bend)*len*.7,Math.sin(a+bend)*len*.7,Math.cos(a+bend*.6)*len,Math.sin(a+bend*.6)*len,Math.cos(a+bend)*len,Math.sin(a+bend)*len);g.stroke();}}g.globalCompositeOperation='destination-in';const fade=g.createRadialGradient(0,0,26,0,0,150);fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(.3,'rgba(255,255,255,.8)');fade.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=fade;g.fillRect(-192,-192,384,384);return c;}
const surfaces=[surface(0),surface(1)],halos=[halo(0),halo(1)],coronas=[corona(0),corona(1)];
const pointerGlow=(()=>{const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d'),r=g.createRadialGradient(96,96,0,96,96,96);r.addColorStop(0,'rgba(179,139,255,.25)');r.addColorStop(.3,'rgba(139,145,255,.14)');r.addColorStop(1,'rgba(112,137,255,0)');g.fillStyle=r;g.fillRect(0,0,192,192);return c;})();
function turn(x,y){return{x:x*.94+y*.342,y:-x*.342+y*.94};}
// A deterministic sequence: approach, recognition, gravitational dance, encounter, afterglow.
function storyStage(t){return t<6?'approach':t<9?'discover':t<19?'weave':t<25?'encounter':t<34?'afterglow':'orbit';}
function orbit(t,k){
 let a,r;
 if(t<6){const g=smooth(0,6,t);r=.42-.14*g;a=-2.76+.24*g;}
 else if(t<9){const g=smooth(6,9,t);r=.28-.02*g;a=-2.52+.08*g;}
 else if(t<19){const g=smooth(9,19,t);r=.26-.17*g;a=-2.44+4.60*g;}
 else if(t<25){a=2.16+smooth(19,25,t);r=.09+.015*smooth(20,28,t);}
 else{const u=t-25;a=3.16+.14*(u-3*(1-Math.exp(-u/3)));r=.09+.015*smooth(20,28,t)+.005*Math.sin(u*.11)*smooth(28,38,t);}
 a+=k*Math.PI;return{...turn(Math.cos(a)*r,Math.sin(a)*r*.68),z:Math.sin(a)};
}
function position(t,k){const o=orbit(t,k);return{...o,scale:.30+.70*smooth(0,14,t)};}
function trailSpan(t){return Math.min(t,20+22*smooth(25,65,t));}
function trailPoint(u,k){
 // Every strand samples where its star actually was. Old light gently spreads into the shared orbit.
 const span=trailSpan(time),age=u*span,born=Math.max(0,time-age),p=position(born,k),spread=1+2.4*smooth(5,Math.max(6,span),age)*smooth(17,32,born),drift=age*.012*smooth(20,36,born),co=Math.cos(drift),si=Math.sin(drift);
 return{x:(p.x*co-p.y*si)*spread,y:(p.x*si+p.y*co)*spread};
}
function recognition(t,k){const center=k?7.75:6.75;return Math.exp(-Math.pow((t-center)/.68,2));}
function tenderness(t){return Math.exp(-Math.pow((t-22)/3.5,2));}
function project(p){return{x:W*.5+p.x*U,y:H*.5+p.y*U};}
function ui(){$('scene').dataset.phase=storyStage(time);$('scene').dataset.interaction=pointer.active?'following':pointer.strength>.002?'settling':'resting';$('pause-icon').hidden=paused;$('resume-icon').hidden=!paused;$('play').setAttribute('aria-label',paused?'播放动画':'暂停动画');$('play').setAttribute('aria-pressed',String(paused));$('replay').disabled=media.matches;$('power').setAttribute('aria-label',low?'关闭省电模式':'开启省电模式');$('power').setAttribute('aria-pressed',String(low));}
function resize(){mobile=matchMedia('(pointer: coarse)').matches||innerWidth<700;const r=canvas.getBoundingClientRect();sceneRect=r;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,low?1:mobile?1.4:1.7,Math.sqrt((low?700000:1500000)/(W*H)))*adaptive;canvas.width=Math.max(1,Math.floor(W*dpr));canvas.height=Math.max(1,Math.floor(H*dpr));U=Math.min(W*1.20,H*1.34);draw();}
function sky(){ctx.fillStyle='#080610';ctx.fillRect(0,0,W,H);if(artReady){const zoom=1.04+Math.sin(time*.024)*.015,cw=Math.max(W,H*art.width/art.height)*zoom,ch=cw*art.height/art.width,bx=(W-cw)/2+clamp(pointer.x*U*.018,-8,8)*pointer.strength,by=(H-ch)/2+clamp(pointer.y*U*.014,-6,6)*pointer.strength,rows=low?20:38;ctx.globalAlpha=1;for(let i=0;i<rows;i++){const sy=i*art.height/rows,dy=by+i*ch/rows,dx=Math.sin(i*.27+time*.13)*3.5+Math.sin(i*.11-time*.09)*4;ctx.drawImage(art,0,sy,art.width,art.height/rows,bx+dx,dy,cw,ch/rows+1/dpr);}}
ctx.globalCompositeOperation='screen';for(let i=0;i<stars.length;i++){const s=stars[i],size=(s.s>.92?11:4)+s.s*6;ctx.globalAlpha=.15+(.5+.5*Math.sin(time*.5+s.a))*.35;ctx.drawImage(halos[i%2],s.x*W-size/2,s.y*H-size/2,size,size);}ctx.globalAlpha=1;}
function ribbon(k){if(time<.05)return;const reveal=smooth(0,3,time),col=k?'132,190,255':'208,135,255',count=low?80:130,path=[];for(let i=0;i<=count;i++)path.push(interactivePoint(trailPoint(i/count,k),i/count));
// Broad scattered light under a bundle of fine luminous threads.
for(const [width,alpha]of[[.055,.052],[.028,.08],[.011,.16],[.002,.42]])for(let part=0;part<10;part++){const a=part/10,b=(part+1)/10,fade=1-smooth(.55,1,b);ctx.strokeStyle=`rgba(${col},${alpha*fade*reveal})`;ctx.lineWidth=U*width*(.55+.45*a);ctx.beginPath();const lo=Math.floor(a*count),hi=Math.ceil(b*count);for(let i=lo;i<=hi;i++){const q=project(path[i]);i===lo?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);}ctx.stroke();}
for(let j=0;j<(low?5:9);j++){ctx.beginPath();for(let i=0;i<=count;i++){const u=i/count,p=path[i],spread=Math.sin(u*Math.PI)*.014,q=project({x:p.x+Math.sin(u*13+time*.24+j*.8)*spread,y:p.y+Math.cos(u*15-time*.19+j*1.4)*spread*.7});i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}ctx.strokeStyle=`rgba(${col},${(.06+j*.012)*reveal})`;ctx.lineWidth=.45+(j%3)*.25;ctx.stroke();}
const n=low?550:mobile?1100:1500;
for(let i=0;i<n;i++){const s=dust[i],u=(s.u+time*.013)%1,v=u*count,idx=Math.min(count-1,Math.floor(v)),f=v-idx,spread=(.002+Math.sin(u*Math.PI)*.025)*reveal,x=W*.5+(path[idx].x*(1-f)+path[idx+1].x*f+s.n*spread)*U,y=H*.5+(path[idx].y*(1-f)+path[idx+1].y*f+s.m*spread*.65)*U,fade=(1-smooth(.7,1,u))*(.4+.6*Math.sin(s.a+time*.55)**2)*reveal*(1+.7*(path[idx].influence*(1-f)+path[idx+1].influence*f));ctx.globalAlpha=clamp(fade);const size=.5+s.s*1.4;ctx.fillStyle=k?'#d8ecff':'#eed2ff';ctx.fillRect(x,y,size,size);if(i%13===0){const d=7+s.s*11;ctx.globalAlpha=clamp(fade*.65);ctx.drawImage(halos[k],x-d/2,y-d/2,d,d);}}ctx.globalAlpha=1;}
function sun(k){const p=position(time,k),q=project(p),r=U*.028*p.scale*(1+p.z*.06),pulse=1+Math.sin(time*.85+k*2)*.025+recognition(time,k)*.07+tenderness(time)*.04;ctx.save();ctx.translate(q.x,q.y);ctx.scale(pulse,pulse);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(.7+recognition(time,k)*.45+tenderness(time)*.25+fieldAt(p.x,p.y)*.20);ctx.drawImage(halos[k],-r*9,-r*9,r*18,r*18);ctx.globalAlpha=1;ctx.drawImage(halos[k],-r*6,-r*6,r*12,r*12);ctx.save();ctx.rotate(time*.06*(k?-1:1));ctx.drawImage(coronas[k],-r*5.8,-r*5.8,r*11.6,r*11.6);ctx.restore();ctx.globalCompositeOperation='source-over';ctx.drawImage(surfaces[k],-r*1.08,-r*1.08,r*2.16,r*2.16);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.48;ctx.save();ctx.rotate(time*.1*(k?-1:1));ctx.drawImage(surfaces[k],-r,-r,r*2,r*2);ctx.restore();ctx.globalAlpha=1;
// Hot central light, a luminous limb and short optical rays.
ctx.drawImage(halos[k],-r*1.8,-r*1.8,r*3.6,r*3.6);ctx.beginPath();ctx.arc(0,0,r*.99,0,TAU);ctx.strokeStyle=k?'rgba(216,239,255,.8)':'rgba(245,216,255,.8)';ctx.lineWidth=r*.045;ctx.stroke();ctx.globalAlpha=.3;ctx.drawImage(halos[k],-r*4,-r*.18,r*8,r*.36);ctx.drawImage(halos[k],-r*.18,-r*3,r*.36,r*6);ctx.restore();}
function pointerLight(){if(pointer.strength<.002)return;const q=project(pointer),size=clamp(U*.20,70,200);ctx.save();ctx.globalAlpha=pointer.strength*.8;ctx.drawImage(pointerGlow,q.x-size*.5,q.y-size*.5,size,size);ctx.restore();}
function sharedLight(){
 const first=smooth(6.3,7.5,time)*(1-smooth(7.5,8.8,time));
 if(first>.002){const a=project(position(time,0)),b=project(position(time,1)),u=smooth(6.3,8.8,time),x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u-Math.sin(u*Math.PI)*U*.035;ctx.save();ctx.globalAlpha=first*.34;ctx.drawImage(halos[0],x-U*.045,y-U*.045,U*.09,U*.09);ctx.restore();}
 const warm=tenderness(time);if(warm>.005){ctx.save();ctx.globalAlpha=warm*.16;const size=U*(.40+smooth(19,27,time)*.28);ctx.drawImage(halos[0],W*.5-size*.5,H*.5-size*.5,size,size);ctx.globalAlpha=warm*.12;ctx.drawImage(halos[1],W*.5-size*.45,H*.5-size*.45,size*.9,size*.9);ctx.restore();}
}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';sky();ctx.globalCompositeOperation='lighter';pointerLight();sharedLight();ribbon(0);ribbon(1);for(const k of (position(time,0).z>0?[1,0]:[0,1]))sun(k);ctx.globalCompositeOperation='source-over';ui();}
function schedule(){if(!raf&&!paused&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(paused||document.hidden)return;const dt=last?Math.min((now-last)/1000,.08):0;last=now;time+=dt;stepPointer(dt);const fps=low||mobile?30:60;if(now-lastDraw>=1000/fps-1){const start=performance.now();draw();const cost=performance.now()-start;lastDraw=now;if(!low){frames++;if(cost>1000/fps*.75)slow++;if(frames>=90){if(slow>30&&adaptive>.65){adaptive*=.86;resize();}frames=slow=0;}}}schedule();}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=lastDraw=0;}
$('play').addEventListener('click',()=>{paused=!paused;if(paused){clearPointer();stop();}else schedule();ui();});$('replay').addEventListener('click',()=>{if(media.matches)return;time=0;paused=false;clearPointer(true);stop();draw();schedule();});$('power').addEventListener('click',()=>{low=!low;adaptive=1;frames=slow=0;resize();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearPointer(true);stop();}else schedule();});addEventListener('resize',resize);media.addEventListener('change',()=>{if(media.matches){clearPointer(true);paused=true;time=Math.max(time,40);stop();draw();}ui();});if(!document.documentElement.requestFullscreen)$('fullscreen').hidden=true;else $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('notice').textContent='当前浏览器未允许全屏';}});document.addEventListener('fullscreenchange',()=>$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'进入全屏'));
resize();art.src='nebula.png';schedule();
})();
