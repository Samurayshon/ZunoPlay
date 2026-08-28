(()=>{
if(window.__ZUNO_STACK_LOBBY_V2__)return;window.__ZUNO_STACK_LOBBY_V2__=true;
const $=s=>document.querySelector(s);
function sync(){const overlay=$('#overlay');const playing=!!overlay?.classList.contains('hide');document.body.classList.toggle('zstack-playing',playing);document.body.classList.toggle('zstack-lobby-v2',!playing)}
function enhance(){const start=$('#start');if(start&&!start.dataset.v2){start.dataset.v2='1';const update=()=>{const text=start.textContent.trim();if(!start.querySelector('.zsl-v2-cta'))start.innerHTML=`<span class="zsl-v2-cta">${text}</span>`};update()}sync()}
function boot(){enhance();const overlay=$('#overlay');if(!overlay)return;new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});$('#start')?.addEventListener('click',()=>requestAnimationFrame(sync));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();