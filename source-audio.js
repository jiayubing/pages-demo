'use strict';
(()=>{
 const button=document.querySelector('#sound'),icon=document.querySelector('#soundIcon');
 const audio=new Audio('assets/reference-ambience.m4a');
 audio.loop=true;audio.preload='none';audio.volume=.65;
 let enabled=false;
 function update(){
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?'关闭原片声音':'开启原片声音');
  icon.innerHTML='<path d="M4 9h4l5-4v14l-5-4H4z"/>'+(enabled?'<path d="M17 8c2 2 2 6 0 8M20 5c4 4 4 10 0 14"/>':'<path d="m17 9 5 6m0-6-5 6"/>');
 }
 button.addEventListener('click',async()=>{
  if(enabled){audio.pause();enabled=false;update();return;}
  try{await audio.play();enabled=true;}catch{enabled=false;}
  update();
 });
 audio.addEventListener('timeupdate',()=>{button.dataset.playbackTime=audio.currentTime.toFixed(2);button.dataset.audioPaused=String(audio.paused);});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)audio.pause();
  else if(enabled)audio.play().catch(()=>{enabled=false;update();});
 });
 update();
})();
