(()=>{
if(window.__ZUNO_STACK_GAMEPLAY_STATE__)return;window.__ZUNO_STACK_GAMEPLAY_STATE__=true;
const sync=()=>{const overlay=document.getElementById('overlay');if(!overlay)return;const playing=overlay.classList.contains('hide')||overlay.hidden===true||getComputedStyle(overlay).display==='none';document.body.classList.toggle('zstack-playing',playing);document.documentElement.classList.toggle('zstack-playing',playing)};
function boot(){const overlay=document.getElementById('overlay');if(!overlay)return;sync();new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class','hidden','style']});document.getElementById('start')?.addEventListener('click',()=>{requestAnimationFrame(()=>setTimeout(sync,0));setTimeout(sync,120);setTimeout(sync,500)});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();