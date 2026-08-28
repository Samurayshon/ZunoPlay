(()=>{
if(window.__ZUNO_STACK_PERFORMANCE__)return;window.__ZUNO_STACK_PERFORMANCE__=true;
const boot=()=>{
 const board=document.getElementById('board');if(!board)return;
 document.documentElement.classList.add('zsp-performance-ready');
 const lowMemory=Number(navigator.deviceMemory||8)<=4;
 const fewCores=Number(navigator.hardwareConcurrency||8)<=4;
 if(lowMemory||fewCores)document.documentElement.classList.add('zsp-lite');
 const style=document.createElement('style');style.id='zunoStackPerformanceStyles';style.textContent=`
 .board{contain:layout paint style;touch-action:manipulation}.tile,.slot button,.relay-slot,.tool,.start,.exit{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.tile{will-change:transform,opacity}.tray,.relay,.hud,.team{contain:layout style}.zsp-page-hidden .tray,.zsp-page-hidden .tile{animation-play-state:paused!important}.zsp-lite .tile{box-shadow:0 4px 8px #0005!important}.zsp-lite .tile.active{box-shadow:0 4px 9px #0006!important}.zsp-lite .tray.tray-risk,.zsp-lite .tray.tray-critical{filter:none!important}.zsp-lite .board{background:linear-gradient(160deg,#10152b,#090b17)!important}@media(max-width:430px){.tile{transition:transform .1s,opacity .1s,border-color .1s}.zsp-lite .tile{will-change:auto}}
 `;document.head.appendChild(style);
 const nativeQuery=board.querySelector.bind(board);let tileCache=new Map();
 const rebuildCache=()=>{tileCache=new Map();board.querySelectorAll('[data-tile]').forEach(el=>tileCache.set(el.dataset.tile,el));};
 board.querySelector=(selector)=>{const m=typeof selector==='string'&&selector.match(/^\[data-tile="([^"]+)"\]$/);if(m){const cached=tileCache.get(m[1]);if(cached&&cached.isConnected)return cached}return nativeQuery(selector)};
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))requestAnimationFrame(rebuildCache)});observer.observe(board,{childList:true});rebuildCache();
 const setHidden=()=>document.documentElement.classList.toggle('zsp-page-hidden',document.hidden);document.addEventListener('visibilitychange',setHidden,{passive:true});setHidden();
 let longTasks=0,totalLongTaskMs=0;
 try{const po=new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks++;totalLongTaskMs+=e.duration}localStorage.setItem('zunoplay_zuno_stack_perf',JSON.stringify({longTasks,totalLongTaskMs:Math.round(totalLongTaskMs),lowMemory,fewCores,at:Date.now()}))});po.observe({type:'longtask',buffered:true});window.addEventListener('pagehide',()=>{observer.disconnect();po.disconnect()},{once:true})}catch(_){window.addEventListener('pagehide',()=>observer.disconnect(),{once:true})}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();