(()=>{
'use strict';
if(window.__ZUNO_CORE_FREEZE_GUARD__)return;window.__ZUNO_CORE_FREEZE_GUARD__=1;
const TIMEOUT=3200;
function timed(promise,label,onTimeout){let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>{try{onTimeout?.()}catch(_){}reject(new Error(label+' timeout'))},TIMEOUT)})]).finally(()=>clearTimeout(timer))}
function wrapScope(scope,label){if(!scope||scope.__zunoCoreGuarded||typeof scope.subscribe!=='function')return scope;scope.__zunoCoreGuarded=1;const original=scope.subscribe.bind(scope);scope.subscribe=()=>timed(original(),label,()=>scope.close?.());return scope}
function install(rt){if(!rt||rt.__zunoCoreFreezeGuard)return;rt.__zunoCoreFreezeGuard=1;if(typeof rt.start==='function'){const originalStart=rt.start.bind(rt);rt.start=()=>timed(originalStart(),'Realtime')}
 if(rt.presence?.scope){const originalPresence=rt.presence.scope.bind(rt.presence);rt.presence.scope=(...args)=>wrapScope(originalPresence(...args),'Presence')}
 if(rt.broadcast?.scope){const originalBroadcast=rt.broadcast.scope.bind(rt.broadcast);rt.broadcast.scope=(...args)=>wrapScope(originalBroadcast(...args),'Broadcast')}
}
install(window.ZunoRealtime);
addEventListener('zuno:realtime-installed',event=>install(event.detail));
let tries=0,poll=setInterval(()=>{install(window.ZunoRealtime);if(window.ZunoRealtime||++tries>60)clearInterval(poll)},100);
function watchdog(){const banner=document.getElementById('banner'),text=document.getElementById('overlayText'),start=document.getElementById('start');if(banner?.textContent?.toLowerCase().includes('conectando'))banner.textContent='⚡ Conexão demorou · modo solo liberado automaticamente.';if(text?.textContent?.includes('2–8 jogadores reais'))text.textContent='Se a sala não responder, o Zuno Core continua jogável com bots automaticamente.';if(start)start.disabled=false}
(document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(watchdog,4300),{once:true}):setTimeout(watchdog,4300));
const engine=document.createElement('script');engine.src='zuno-core-v05-engine.js?v=1981';engine.async=false;engine.onerror=()=>{const banner=document.getElementById('banner');if(banner)banner.textContent='⚠️ Falha ao carregar o motor. Reabra o Zuno Core.'};document.body.appendChild(engine);
})();