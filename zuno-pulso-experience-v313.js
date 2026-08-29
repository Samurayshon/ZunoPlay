(()=>{
if(window.__ZUNO_PULSO_EXPERIENCE_V313__)return;window.__ZUNO_PULSO_EXPERIENCE_V313__=true;
const $=(s,r=document)=>r.querySelector(s);
let pendingPublish=false,publishStarted=false;
function ensureModeUI(){
 const mine=$('[data-pulse-mode="mine"]'),friends=$('[data-pulse-mode="friends"]');
 if(mine&&!mine.querySelector('.zp-pulse-mode-avatar')){
  mine.removeAttribute('title');
  mine.innerHTML='<span id="myAvatarMini" class="zp-pulse-mode-avatar" aria-hidden="true">Z</span>';
 }
 friends?.removeAttribute('title');
 syncAvatar();
}
function syncAvatar(){
 const target=$('#myAvatarMini'),source=$('#composerAvatar');if(!target||!source)return;
 const img=source.querySelector('img');
 if(img?.src){
  const current=target.querySelector('img');
  if(current?.src===img.src&&target.childElementCount===1)return;
  target.replaceChildren();
  const clone=document.createElement('img');clone.src=img.src;clone.alt='';target.appendChild(clone);return;
 }
 const value=((source.textContent||'Z').trim()[0]||'Z').toUpperCase();
 if(!target.querySelector('img')&&target.textContent===value)return;
 target.textContent=value;
}
function publishSucceeded(){
 const text=$('#postText'),file=$('#postMedia'),preview=$('#mediaPreview');
 return !text?.value.trim()&&!(file?.files?.length)&&(!preview||preview.hidden||!preview.children.length);
}
function finishPublish(){
 if(!pendingPublish||!publishStarted)return;
 pendingPublish=false;publishStarted=false;
 requestAnimationFrame(()=>{
  if(!publishSucceeded())return;
  const mine=$('[data-pulse-mode="mine"]');
  if(mine&&mine.getAttribute('aria-pressed')!=='true')mine.click();
  $('.zp-compose-close')?.click();
  try{window.posthog?.capture?.('pulso_publish_experience_complete',{destination:'mine'})}catch(_){ }
 });
}
function bindPublish(){
 const btn=$('#publishButton');if(!btn||btn.dataset.zp313Bound==='1')return;btn.dataset.zp313Bound='1';
 btn.addEventListener('click',()=>{
  const text=$('#postText')?.value.trim(),file=$('#postMedia')?.files?.length,preview=$('#mediaPreview');
  pendingPublish=!!(text||file||preview&&!preview.hidden&&preview.children.length);publishStarted=false;
  queueMicrotask(()=>{if(pendingPublish&&btn.disabled)publishStarted=true});
 },true);
 new MutationObserver(()=>{if(btn.disabled){if(pendingPublish)publishStarted=true;return}finishPublish()}).observe(btn,{attributes:true,attributeFilter:['disabled']});
}
function boot(){
 ensureModeUI();bindPublish();
 const composer=$('#composerAvatar');if(composer)new MutationObserver(syncAvatar).observe(composer,{childList:true,subtree:true,characterData:true});
 window.addEventListener('pageshow',()=>{ensureModeUI();syncAvatar()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();