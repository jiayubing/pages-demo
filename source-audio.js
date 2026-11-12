'use strict';
(()=>{
 const button=document.querySelector('#sound'),icon=document.querySelector('#soundIcon');
 const audio=new Audio('assets/reference-ambience.m4a');
 audio.loop=true;audio.preload='auto';audio.volume=.65;
 let enabled=true;
 function update(){
  const playing=enabled&&!audio.paused;
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?(playing?'关闭原片声音':'关闭声音（等待点击页面后播放）'):'开启原片声音');
  button.dataset.audioState=playing?'playing':enabled?'waiting':'off';
  button.dataset.audioPaused=String(audio.paused);
  icon.innerHTML='<path d="M4 9h4l5-4v14l-5-4H4z"/>'+(playing?'<path d="M17 8c2 2 2 6 0 8M20 5c4 4 4 10 0 14"/>':enabled?'<path d="M18 8v5m0 3v1"/>':'<path d="m17 9 5 6m0-6-5 6"/>');
 }
 async function start(){
  if(!enabled||document.hidden)return;
  try{await audio.play();if(!enabled||document.hidden)audio.pause();}catch{/* Browser autoplay restrictions: retry on the next user gesture. */}
  update();
 }
 button.addEventListener('click',()=>{
  enabled=!enabled;
  if(enabled)start();else audio.pause();
  update();
 });
 function unlock(event){
  if(button.contains(event.target))return;
  if(enabled&&audio.paused)start();
 }
 document.addEventListener('pointerdown',unlock);
 document.addEventListener('keydown',unlock);
 audio.addEventListener('play',update);
 audio.addEventListener('pause',update);
 audio.addEventListener('timeupdate',()=>{button.dataset.playbackTime=audio.currentTime.toFixed(2);});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)audio.pause();else start();
 });
 update();start();
})();
