'use strict';
(()=>{
 const button=document.querySelector('#sound'),icon=document.querySelector('#soundIcon');
 let enabled=true,context,volume,source,loading;
 function update(){
  const playing=enabled&&!!source&&context.state==='running';
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?(playing?'关闭原片声音':'关闭声音（等待点击页面后播放）'):'开启原片声音');
  button.dataset.audioState=playing?'playing':enabled?'waiting':'off';
  button.dataset.audioPaused=String(!playing);
  icon.innerHTML='<path d="M4 9h4l5-4v14l-5-4H4z"/>'+(playing?'<path d="M17 8c2 2 2 6 0 8M20 5c4 4 4 10 0 14"/>':enabled?'<path d="M18 8v5m0 3v1"/>':'<path d="m17 9 5 6m0-6-5 6"/>');
 }
 async function start(){
  if(!enabled)return;
  if(!context){context=new (window.AudioContext||window.webkitAudioContext)();volume=context.createGain();volume.gain.value=.48;volume.connect(context.destination);context.addEventListener('statechange',update);}
  // Resume is called directly in the gesture handler, before any network await.
  const resumed=context.resume();
  if(!loading)loading=fetch('assets/paper-opening-loop.wav').then(r=>{if(!r.ok)throw new Error('Audio download failed');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(buffer=>{
   source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(volume);source.start();update();
  });
  volume.gain.setTargetAtTime(enabled?.48:0,context.currentTime,.04);
  try{await Promise.all([resumed,loading]);}catch{ /* Autoplay may require a user gesture. */ }
  update();
 }
 button.addEventListener('click',()=>{
  enabled=!enabled;
  if(enabled)start();else if(volume)volume.gain.setTargetAtTime(0,context.currentTime,.04);
  update();
 });
 function unlock(event){if(button.contains(event.target))return;if(enabled&&(!context||context.state!=='running'))start();}
 document.addEventListener('pointerdown',unlock);
 document.addEventListener('keydown',unlock);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&enabled)start();});
 update();start();
})();
