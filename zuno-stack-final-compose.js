(()=>{
if(window.__ZUNO_STACK_FINAL_COMPOSE__)return;window.__ZUNO_STACK_FINAL_COMPOSE__=true;
const $=s=>document.querySelector(s);
let orderObserver=null,lastOrder='0/12';
function stabilizeOrder(){const box=$('.zso-order'),strong=$('#zsoOrder');if(!box||!strong)return;const raw=(strong.textContent||'').trim();if(/^\d+\/\d+$/.test(raw))lastOrder=raw;else if(/^\d+$/.test(raw)){if(!lastOrder||!/^\d+\/\d+$/.test(lastOrder))lastOrder=`0/${raw||12}`;strong.textContent=lastOrder}if(!orderObserver){orderObserver=new MutationObserver(()=>{const s=$('#zsoOrder');if(!s)return;const v=(s.textContent||'').trim();if(/^\d+\/\d+$/.test(v)){lastOrder=v;return}if(/^\d+$/.test(v)&&s.textContent!==lastOrder)s.textContent=lastOrder});orderObserver.observe(box,{subtree:true,childList:true,characterData:true})}}
function cleanRedundant(){document.querySelectorAll('.zso-relay-status,.zso-power-dock-head').forEach(e=>e.style.display='none')}
function syncPressure(){const src=$('#zsoPressure b'),dst=$('.zso-pressure-inline b'),slot=$('.zso-pressure-inline');if(!src||!dst||!slot)return;const level=(src.textContent||'BAIXA').trim();if(dst.textContent!==level)dst.textContent=level;slot.dataset.level=level}
function sync(){if(!document.body.classList.contains('zstack-playing'))return;stabilizeOrder();cleanRedundant();syncPressure()}
function boot(){sync();setInterval(sync,350);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
