(()=>{
if(window.__ZUNO_STACK_RELAY_V2__)return;window.__ZUNO_STACK_RELAY_V2__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lastRelay='',lastTray='',lastMatches=0,lastSendAt=0,lastTakeAt=0,relayUses=0,relaySends=0,relayTrios=0,scheduled=false;
function sigRelay(){return $$('#relaySlots .relay-slot').map(x=>x.classList.contains('filled')?(x.getAttribute('aria-label')||x.textContent||'x').trim():'-').join('|')}
function sigTray(){return $$('#tray .slot.filled').map(x=>(x.textContent||x.getAttribute('aria-label')||'x').trim()).join('|')}
function matches(){return parseInt($('#matches')?.textContent||'0',10)||0}
function ensureBadge(){const relay=$('.relay');if(!relay)return null;let b=relay.querySelector('.zrv-badge');if(!b){b=document.createElement('div');b.className='zrv-badge';b.innerHTML='<span>⇄</span><b>RELAY</b><i></i>';relay.appendChild(b)}return b}
function updateBadge(){const b=ensureBadge();if(!b)return;const count=$$('#relaySlots .relay-slot.filled').length;b.querySelector('i').textContent=`${count}/3`;b.dataset.active=count?'1':'0'}
function pulse(msg,kind='info'){let e=$('#zrvPulse');if(!e){e=document.createElement('div');e.id='zrvPulse';e.className='zrv-pulse';document.querySelector('.shell')?.appendChild(e)}if(!e)return;e.dataset.kind=kind;e.textContent=msg;e.classList.remove('show');void e.offsetWidth;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1100)}
function bind(){$$('#tray [data-tray]').forEach(b=>{if(b.dataset.zrv)return;b.dataset.zrv='1';b.addEventListener('pointerdown',()=>lastSendAt=Date.now(),{passive:true})});$$('#relaySlots [data-relay]').forEach(b=>{if(b.dataset.zrv)return;b.dataset.zrv='1';b.addEventListener('pointerdown',()=>lastTakeAt=Date.now(),{passive:true})})}
function syncRelay(){const sig=sigRelay();if(!lastRelay){lastRelay=sig;updateBadge();return}if(sig===lastRelay)return;const prev=lastRelay.split('|').filter(x=>x&&x!=='-').length,next=sig.split('|').filter(x=>x&&x!=='-').length,now=Date.now();if(next>prev&&now-lastSendAt<1000){relaySends++;pulse('PEÇA ENVIADA · +20','send')}else if(next<prev&&now-lastTakeAt<1000){relayUses++;pulse('PEÇA RECEBIDA · +10','take')}lastRelay=sig;updateBadge()}
function syncMatch(){const m=matches();if(!lastMatches){lastMatches=m;return}if(m>lastMatches&&Date.now()-lastTakeAt<1200){relayTrios++;pulse('TRIO VIA RELAY','trio');const r=$('.relay');r?.classList.remove('zrv-trio');void r?.offsetWidth;r?.classList.add('zrv-trio');setTimeout(()=>r?.classList.remove('zrv-trio'),650)}lastMatches=m}
function syncTray(){const s=sigTray();if(s!==lastTray){lastTray=s;bind()}}
function sync(){if(!document.body.classList.contains('zstack-playing'))return;ensureBadge();syncRelay();syncTray();syncMatch();bind()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
function boot(){lastRelay=sigRelay();lastTray=sigTray();lastMatches=matches();sync();new MutationObserver(schedule).observe(document.querySelector('.shell')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();