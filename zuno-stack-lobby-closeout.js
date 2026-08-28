(()=>{
if(window.__ZUNO_STACK_CLOSEOUT__)return;window.__ZUNO_STACK_CLOSEOUT__=true;
const $=s=>document.querySelector(s);
function normalizeRecord(){const el=$('#zstackRecord');if(!el)return;const t=(el.textContent||'').trim();if(/Recorde\s*[—-]$/.test(t)||/Recorde\s*0$/.test(t))el.textContent='◷ Sem recorde'}
function protectStart(){const b=$('#start');if(!b||b.dataset.closeout)return;b.dataset.closeout='1';b.addEventListener('click',()=>{if(b.classList.contains('is-loading')){b.setAttribute('aria-busy','true');b.setAttribute('disabled','disabled')}setTimeout(()=>{b.removeAttribute('disabled');b.removeAttribute('aria-busy')},3600)},{capture:false})}
function auditViewport(){document.documentElement.dataset.zstackViewport='closeout';document.body.style.webkitTextSizeAdjust='100%';normalizeRecord();protectStart()}
function boot(){auditViewport();const root=$('#overlay');if(root)new MutationObserver(()=>{normalizeRecord();protectStart()}).observe(root,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();