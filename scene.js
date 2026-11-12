'use strict';
(() => {
 const scene=document.querySelector('#scene'), rotor=document.querySelector('#rotor'), assembly=document.querySelector('#assembly'), air=document.querySelector('#air'), near=document.querySelector('#near'), a=air.getContext('2d'), n=near.getContext('2d');
 const slider=document.querySelector('#day'), pause=document.querySelector('#pause'), evening=document.querySelector('#evening'), sunlight=document.querySelector('#sunlight');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,innerWidth<600?1.15:1.5),paused=reduced.matches,clock=0,last=0,angle=0,wind=.85,impulse=0,day=0,manualDay=false,frame=0,oldX=null,oldY=null,pointerTime=0,emitter=0,dirty=true;
 const ROTOR_RPS=.95, PAPER_SPEED=1.8;
 const particles=[], field=[], grasses=[],rain=[];let seed=91;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
 function resize(){dirty=true;W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,innerWidth<600?1.15:1.5);for(const c of [air,near]){c.width=Math.round(W*DPR);c.height=Math.round(H*DPR);c.getContext('2d').setTransform(DPR,0,0,DPR,0,0)}const size=W<600?Math.min(W*.78,H*.46):Math.min(W*.42,H*.7,650);assembly.style.setProperty('--size',size+'px');rain.length=0;for(let i=0;i<(W<600?48:80);i++)rain.push({u:random(),v:random(),speed:.7+random()*.6,len:5+random()*9});grasses.length=0;for(let i=0;i<46;i++)grasses.push({x:random()*W,y:H*(.91+random()*.14),len:20+random()*80,k:random()*5,bend:15+random()*23});}
 const smooth=x=>x*x*(3-2*x);
 const clouds=document.querySelector("#clouds"),shade=document.querySelector("#weatherShade");let cloudCover=0,rainfall=0;
 let rotorSize=500, originX=0,originY=0;const material=[];
 const source=document.querySelector('#paperSource'),surface=document.querySelector('#paperRotor');
 function preparePaper(){
  const tmp=document.createElement('canvas');tmp.width=tmp.height=360;const c=tmp.getContext('2d',{willReadFrequently:true});c.drawImage(source,0,0,360,360);const pixels=c.getImageData(0,0,360,360).data;
  surface.width=surface.height=720;const r=surface.getContext('2d');
  // Individual paper tesserae preserve the original folds and palette.
  for(let y=0;y<360;y+=3)for(let x=0;x<360;x+=3){const k=(y*360+x)*4;if(pixels[k+3]<220)continue;r.drawImage(tmp,x,y,3,3,x*2,y*2,5.8,5.8);const dx=x/360-.4935,dy=y/360-.4945,rr=Math.hypot(dx,dy);if(rr>.19&&rr<.43&&Math.max(pixels[k],pixels[k+1],pixels[k+2])-Math.min(pixels[k],pixels[k+1],pixels[k+2])>22)material.push({x:dx,y:dy,col:`rgb(${[pixels[k],pixels[k+1],pixels[k+2]].map(v=>Math.round(Math.max(0,Math.min(255,(v-160)*1.2+140)))).join(',')})`});}
  source.style.visibility='hidden';
  for(let i=0;i<(W<600?540:720);i++){
   const m=material[Math.floor(random()*material.length)];
   const end=random()<.985?.13+random()*.09:.38+random()*.12;
   field.push({end,pace:.8+random()*.4,u:Math.pow(random(),1.35)*end,sx:random()<.35?-.15:-.25+random()*1.65,sy:-.25+random()*1.5,size:random()<.88?5+random()*11:18+random()*15,col:m.col,curl:(random()-.5)*2,flutterHz:4+random()*5,spin:(random()<.5?-1:1)*(1.2+random()*2.8),drift:random(),phase:random()*6.28,roll:random()*6.28,twist:.5+random(),shape:1+Math.floor(random()*2)});
  }dirty=true;
 }
 if(source.complete&&source.naturalWidth)preparePaper();else source.addEventListener('load',preparePaper,{once:true});
 function spawn(initial=false,boost=false){if(!material.length)return;const m=material[Math.floor(random()*material.length)],cos=Math.cos(angle),sin=Math.sin(angle);particles.push({x:originX+(m.x*cos-m.y*sin)*rotorSize,y:originY+(m.x*sin+m.y*cos)*rotorSize,end:random()<.985?.16+random()*.1:.4+random()*.12,pace:.8+random()*.4,age:0,life:7+random()*5,size:(5+random()*8)*(W<600?.85:1),col:m.col,curl:(random()-.5)*2,flutterHz:4+random()*5,spin:(random()<.5?-1:1)*(1.2+random()*2.8),drift:random(),phase:random()*6.28,roll:random()*6.28,twist:.5+random(),spread:(random()-.5)*2.1,lift:.04+random()*.19,reach:.8+random()*.95,foreground:random()<.06,shape:1+Math.floor(random()*2)});}
 function setDay(v){day=Math.max(0,Math.min(1,v));evening.style.opacity=(day*.82).toFixed(3);sunlight.style.opacity=day.toFixed(3);rotor.style.filter=`sepia(${day*.03}) saturate(${1-day*.08}) brightness(${1-day*.035})`;slider.value=Math.round(day*100);scene.dataset.day=day.toFixed(2);}
 function gust(amount=1){if(paused){paused=false;updatePause()}impulse=Math.min(2.8,impulse+amount);for(let i=0;i<70;i++)if(particles.length<(W<600?560:760))spawn(false,true);document.body.classList.add('quiet');}
 function updatePause(){dirty=true;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'继续动画':'暂停动画');document.querySelector('#pauseIcon').innerHTML=paused?'<path d="M9 5l10 7-10 7z"/>':'<path d="M9 6v12M15 6v12"/>';scene.dataset.paused=String(paused);}
 const stamps=new Map();
 function paperStamp(col,shape){
  // Quantized sampled colors share a small set of prepainted paper silhouettes.
  const rgb=col.match(/\d+/g).map(v=>Math.min(255,Math.round(Number(v)/32)*32));
  const color='rgb('+rgb.join(',')+')',key=color+':'+shape;
  if(stamps.has(key))return stamps.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=72;
  const ctx=canvas.getContext('2d'),z=30;ctx.translate(36,36);ctx.fillStyle=color;
  ctx.beginPath();if(shape===1){ctx.moveTo(-z,0);ctx.bezierCurveTo(-z*.3,-z*.7,z*.55,-z*.5,z,0);ctx.bezierCurveTo(z*.2,z*.65,-z*.6,z*.45,-z,0);}else{ctx.moveTo(-z,0);ctx.bezierCurveTo(-z*.4,-z*.65,z*.7,-z*.6,z*.9,-z*.1);ctx.quadraticCurveTo(z*.15,-z*.1,-z*.4,z*.45);ctx.quadraticCurveTo(-z*.8,z*.55,-z,0);}ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff55';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-z*.8,0);ctx.quadraticCurveTo(0,z*.15,z*.7,0);ctx.stroke();
  stamps.set(key,canvas);return canvas;
 }
 function drawPaper(ctx,p,x,y,t,scale,alpha){
  const extent=p.size*scale*1.3;if(alpha<.015||x<-extent||x>W+extent||y<-extent||y>H+extent)return;
  if(!p.stamp)p.stamp=paperStamp(p.col,p.shape);
  const turn=p.roll+t*p.spin*.22+Math.sin(t*p.flutterHz*.39+p.phase)*.48+Math.sin(t*.73+p.drift*8)*.18;
  const flutter=.38+.62*Math.abs(Math.sin(t*p.flutterHz*.52+p.phase+Math.sin(t*.71+p.roll)*.4));
  const s=scale*p.size/30,cs=Math.cos(turn)*s,sn=Math.sin(turn)*s;
  ctx.setTransform(DPR*cs,DPR*sn,-DPR*sn*flutter,DPR*cs*flutter,DPR*x,DPR*y);
  ctx.globalAlpha=alpha;ctx.drawImage(p.stamp,-36,-36);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;
 }
 // Individual curved slips ride a shared breeze; offsets diminish with depth.
 function driftOffset(p,u,depth){
  const progress=Math.min(1,u/p.end),envelope=Math.sin(Math.PI*progress)*depth;
  const slip=Math.sin(progress*(3+p.drift*4)+p.phase)-Math.sin(p.phase);
  const breeze=Math.sin(clock*.8-u*3)*.32;
  return {x:W*.035*envelope*(p.curl+slip*.8+breeze),y:H*.045*envelope*(p.curl*.6+Math.sin(progress*5+p.phase)*(.4+p.drift*.5)-breeze)};
 }
 function render(dt){a.clearRect(0,0,W,H);n.clearRect(0,0,W,H);rotorSize=parseFloat(assembly.style.getPropertyValue("--size"));originX=W*(W<600?.49:.46)-rotorSize*.0065;originY=H*(W<600?.48:.42)-rotorSize*.0055;if(!paused){clock+=dt;impulse*=Math.exp(-dt*.48);const cycle=Math.pow(Math.max(0,Math.sin(clock*.27-.8)),3);const weatherPhase=clock%72;const cloudTarget=smooth(Math.min(1,Math.max(0,(weatherPhase-12)/12)))*(1-smooth(Math.min(1,Math.max(0,(weatherPhase-54)/14))));const rainTarget=smooth(Math.min(1,Math.max(0,(weatherPhase-31)/7)))*(1-smooth(Math.min(1,Math.max(0,(weatherPhase-48)/8))));cloudCover+=(cloudTarget-cloudCover)*Math.min(1,dt*.65);rainfall+=(rainTarget-rainfall)*Math.min(1,dt*.7);clouds.style.opacity=(cloudCover*.8).toFixed(3);shade.style.opacity=(cloudCover*.65).toFixed(3);clouds.style.transform=`translateX(${Math.sin(clock*.021)*7}%)`;scene.dataset.weather=rainfall>.25?"light-rain":cloudCover>.3?"cloudy":"sunny";scene.dataset.rain=rainfall.toFixed(2);const target=.85+cycle*1.05+impulse+cloudCover*.35;wind+=(target-wind)*Math.min(1,dt*2.2);angle+=ROTOR_RPS*Math.PI*2*dt;rotor.style.transform=`rotate(${angle}rad)`;const sway=Math.sin(clock*.43)*.42+Math.sin(clock*.71+1.2)*Math.min(wind,1.8)*.22+Math.sin(clock*.19)*.16;assembly.style.transform=`translate(-50%,-50%) rotate(${sway}deg)`;if(!manualDay&&frame%6===0)setDay(smooth(Math.min(1,clock/150)));emitter+=dt*PAPER_SPEED*(176+wind*84)*(.7+.65*Math.pow(.5+.5*Math.sin(clock*.52),2));while(emitter>1){if(particles.length<(W<600?560:760))spawn();emitter--}}
 // Recede into the meadow: depth compresses both paper size and flutter.
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(!paused)p.age+=dt*PAPER_SPEED*(.9+wind*.5)*p.pace*(1+.15*Math.sin(clock*(.55+p.drift*.6)+p.phase)+.07*Math.sin(clock*1.37+p.roll))*(.45+2.1*Math.exp(-p.age/p.life*6));const u=p.age/p.life;if(u>=p.end){particles[i]=particles[particles.length-1];particles.pop();continue}const depth=1/(1+u*6),travel=1-depth;
 // Near paper opens into a broad fan across the viewer; distant paper converges.
 const vx=W*(.92+p.curl*.07),vy=H*(.80+(p.drift-.5)*.12),drift=driftOffset(p,u,depth);
 const x=vx+(p.x-vx)*depth+drift.x;
 const y=vy+(p.y-vy)*depth+drift.y;
 const alpha=Math.min(1,p.age*8)*(1-smooth(Math.max(0,(u-p.end*.55)/(p.end*.45))))*.9;
 drawPaper(depth>.5?n:a,p,x,y,clock,depth,alpha*Math.pow(depth,.65));}

 if(rainfall>.01){a.strokeStyle=`rgba(107,143,165,${rainfall*.32})`;a.lineWidth=.8;for(const drop of rain){if(!paused){drop.v=(drop.v+dt*.43*drop.speed)%1;drop.u=(drop.u+dt*.055*drop.speed)%1;}const x=drop.u*W,y=drop.v*H;a.beginPath();a.moveTo(x,y);a.lineTo(x+drop.len*.45,y+drop.len);a.stroke();}}
 // A windborne veil already fills the opening; every 24 seconds it swells across the frame.
 const phase=clock%24,peak=Math.max(Math.max(0,1-clock/5),Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-7)/11))));
 for(const p of field){
  if(!paused){p.u+=dt*PAPER_SPEED*(.095+wind*.025)*p.pace*(1+.15*Math.sin(clock*(.55+p.drift*.6)+p.phase)+.07*Math.sin(clock*1.37+p.roll))*(.4+2.2*Math.exp(-p.u*7));if(p.u>=p.end){p.u=0;p.curl=(random()-.5)*2;p.pace=.8+random()*.4;p.phase=random()*6.28;p.sx=random()<.35?-.15:-.25+random()*1.65;p.sy=-.25+random()*1.5;}}
  // Every fleck travels away along the same perspective field, including the left border.
  const depth=1/(1+p.u*7),vx=W*(.92+p.curl*.07),vy=H*(.80+(p.drift-.5)*.12),drift=driftOffset(p,p.u,depth);
  const x=vx+(p.sx*W-vx)*depth+drift.x;
  const y=vy+(p.sy*H-vy)*depth+drift.y;


  const fade=Math.min(1,p.u*48)*(1-smooth(Math.max(0,(p.u-p.end*.58)/(p.end*.42))));
  const wave=.93+.07*Math.sin(clock*.41+p.phase);
  drawPaper(depth>.5?n:a,p,x,y,clock,depth*1.35,fade*wave*.9*Math.pow(depth,.4));
 }
 scene.dataset.fullscreenGust=peak.toFixed(2);
 n.globalAlpha=.34;for(const g of grasses){const bend=g.bend+Math.sin(clock*.75+g.k)*wind*9;n.strokeStyle='#9aab7b';n.lineWidth=.7;n.beginPath();n.moveTo(g.x,g.y);n.quadraticCurveTo(g.x+bend*.2,g.y-g.len*.65,g.x+bend,g.y-g.len);n.stroke();}n.globalAlpha=1;
 if(frame++%30===0){scene.dataset.wind=wind.toFixed(2);scene.dataset.angle=angle.toFixed(2);scene.dataset.rotorRps=String(ROTOR_RPS);scene.dataset.particles=String(particles.length);scene.dataset.fieldCount=String(field.length)} }
 function tick(ms){const dt=Math.min(.04,(ms-(last||ms))/1000);last=ms;if(!document.hidden&&(!paused||dirty)){render(dt);dirty=false;}requestAnimationFrame(tick)}
 scene.addEventListener('pointermove',e=>{if(e.target.closest('footer'))return;const now=performance.now();if(oldX!==null&&now-pointerTime<150){const dist=Math.hypot(e.clientX-oldX,e.clientY-oldY);if(dist>4){impulse=Math.min(2.5,impulse+Math.min(.11,dist*.0015));document.body.classList.add('quiet')}}oldX=e.clientX;oldY=e.clientY;pointerTime=now;},{passive:true});scene.addEventListener('pointerdown',e=>{if(!e.target.closest('footer'))gust(1.3)});
 document.querySelector('#gust').addEventListener('click',()=>gust(1.8));pause.addEventListener('click',()=>{paused=!paused;updatePause()});slider.addEventListener('input',e=>{manualDay=true;setDay(Number(e.target.value)/100)});document.addEventListener('visibilitychange',()=>{last=0});addEventListener('resize',resize);reduced.addEventListener('change',e=>{paused=e.matches;updatePause()});resize();setDay(0);updatePause();requestAnimationFrame(tick);
})();
