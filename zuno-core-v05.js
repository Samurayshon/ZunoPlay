(()=>{
'use strict';
if(window.__ZUNO_CORE_FREEZE_GUARD__)return;window.__ZUNO_CORE_FREEZE_GUARD__=1;
const TIMEOUT=3200,LOBBY_MS=15000;
const params=new URLSearchParams(location.search),mode=params.get('mode')||'menu';
const queryRoom=params.get('room')||'',storedRoom=sessionStorage.getItem('zunoplay_room_id')||'',roomCandidate=queryRoom||storedRoom||sessionStorage.getItem('zuno_core_invite_room')||'';
if(roomCandidate)sessionStorage.setItem('zuno_core_invite_room',roomCandidate);
if(mode!=='invite'){
  sessionStorage.removeItem('zunoplay_room_id');
  if(params.has('room')){params.delete('room');history.replaceState(null,'',location.pathname+(params.toString()?'?'+params.toString():'')+location.hash)}
}
function timed(promise,label,onTimeout){let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>{try{onTimeout?.()}catch(_){}reject(new Error(label+' timeout'))},TIMEOUT)})]).finally(()=>clearTimeout(timer))}
function wrapScope(scope,label){if(!scope||scope.__zunoCoreGuarded||typeof scope.subscribe!=='function')return scope;scope.__zunoCoreGuarded=1;const original=scope.subscribe.bind(scope);scope.subscribe=()=>timed(original(),label,()=>scope.close?.());return scope}
function install(rt){if(!rt||rt.__zunoCoreFreezeGuard)return;rt.__zunoCoreFreezeGuard=1;if(typeof rt.start==='function'){const originalStart=rt.start.bind(rt);rt.start=()=>timed(originalStart(),'Realtime')}
 if(rt.presence?.scope){const originalPresence=rt.presence.scope.bind(rt.presence);rt.presence.scope=(...args)=>wrapScope(originalPresence(...args),'Presence')}
 if(rt.broadcast?.scope){const originalBroadcast=rt.broadcast.scope.bind(rt.broadcast);rt.broadcast.scope=(...args)=>wrapScope(originalBroadcast(...args),'Broadcast')}
}
install(window.ZunoRealtime);
addEventListener('zuno:realtime-installed',event=>install(event.detail));
let tries=0,poll=setInterval(()=>{install(window.ZunoRealtime);if(window.ZunoRealtime||++tries>60)clearInterval(poll)},100);
function watchdog(){const banner=document.getElementById('banner'),text=document.getElementById('overlayText'),start=document.getElementById('start');if(banner?.textContent?.toLowerCase().includes('conectando'))banner.textContent='⚡ Conexão demorou · bots serão usados automaticamente.';if(text?.textContent?.includes('2–8 jogadores reais'))text.textContent='Você pode jogar solo imediatamente ou esperar até 15 segundos por amigos.';if(start)start.disabled=false}
function humanCount(){const room=document.getElementById('room'),m=room?.textContent?.match(/Multiplayer\s+(\d+)\/8/i);return m?Math.max(1,+m[1]||1):1}
function inviteUrl(room){const u=new URL(location.href);u.search='';u.searchParams.set('mode','invite');u.searchParams.set('room',room);u.searchParams.set('from','sala');u.searchParams.set('autolobby','1');return u.href}
async function shareInvite(room){const url=inviteUrl(room),data={title:'Zuno Core',text:'Entre comigo no Zuno Core. A partida começa em até 15 segundos.',url};try{if(navigator.share){await navigator.share(data);return true}await navigator.clipboard?.writeText?.(url);const banner=document.getElementById('banner');if(banner)banner.textContent='🔗 Convite copiado · aguardando jogadores.';return true}catch(_){return false}}
function waitForStart(timeout=7000){return new Promise(resolve=>{const started=Date.now(),tick=()=>{const b=document.getElementById('start');if(b&&typeof b.onclick==='function')return resolve(b);if(Date.now()-started>=timeout)return resolve(b||null);setTimeout(tick,80)};tick()})}
let lobbyTimer=null,lobbyEnd=0,launched=false;
async function launchOriginal(){if(launched)return;launched=true;clearInterval(lobbyTimer);const start=await waitForStart();if(!start||typeof start.onclick!=='function'){const banner=document.getElementById('banner');if(banner)banner.textContent='⚠️ Não foi possível iniciar. Reabra o Zuno Core.';launched=false;return}start.onclick()}
function renderLobby(){const left=Math.max(0,Math.ceil((lobbyEnd-Date.now())/1000)),humans=humanCount(),bots=Math.max(0,8-humans),banner=document.getElementById('banner'),title=document.getElementById('overlayTitle'),text=document.getElementById('overlayText'),invite=document.getElementById('coreInviteBtn');if(title)title.textContent='Lobby Zuno Core';if(text)text.textContent=humans+'/8 jogadores · início em '+left+'s · '+bots+' vaga'+(bots===1?'':'s')+' será'+(bots===1?'':'ão')+' preenchida'+(bots===1?'':'s')+' por bots.';if(banner)banner.textContent='🌐 Aguardando jogadores · '+humans+'/8 · '+left+'s';if(invite)invite.textContent=left>0?'Convidar mais amigos':'Iniciando...';if(humans>=8||left<=0)launchOriginal()}
function startLobby(){if(lobbyEnd)return;lobbyEnd=Date.now()+LOBBY_MS;renderLobby();lobbyTimer=setInterval(renderLobby,250)}
function styleButtons(){const original=document.getElementById('start');if(!original||document.getElementById('coreModeButtons'))return;original.style.display='none';const box=document.createElement('div');box.id='coreModeButtons';box.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px';const solo=document.createElement('button');solo.id='coreSoloBtn';solo.className='start';solo.textContent='Jogar Solo';solo.style.minHeight='52px';const invite=document.createElement('button');invite.id='coreInviteBtn';invite.className='start';invite.textContent='Convidar Amigos';invite.style.cssText='min-height:52px;background:linear-gradient(135deg,#16213c,#1a7a92);border:1px solid #62e7ff88';box.append(solo,invite);original.parentNode.insertBefore(box,original);
 solo.onclick=async()=>{if(mode==='invite'){const u=new URL(location.href);u.search='?mode=solo';location.href=u.href;return}const banner=document.getElementById('banner');if(banner)banner.textContent='🤖 Modo Solo · iniciando com 7 bots.';await launchOriginal()};
 invite.onclick=async()=>{const room=roomCandidate||sessionStorage.getItem('zuno_core_invite_room')||'';if(!room){const banner=document.getElementById('banner');if(banner)banner.textContent='👥 Crie ou entre em uma sala para convidar amigos.';setTimeout(()=>location.href='salas.html?game=zuno-core&invite=1',900);return}if(mode!=='invite'){await shareInvite(room);const u=inviteUrl(room);location.href=u;return}await shareInvite(room);startLobby()};
 const text=document.getElementById('overlayText');if(mode==='invite'){if(text)text.textContent='Convide amigos e aguarde até 15 segundos. Vagas restantes serão preenchidas por bots.';if(params.get('autolobby')==='1')startLobby()}else if(text)text.textContent='Escolha: jogar agora com bots ou convidar amigos para uma partida de até 8 jogadores.';
}
function mountButtons(){styleButtons();if(!document.getElementById('coreModeButtons'))setTimeout(mountButtons,100)}
(document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{setTimeout(watchdog,4300);mountButtons()},{once:true}):(setTimeout(watchdog,4300),mountButtons()));
const engine=document.createElement('script');engine.src='zuno-core-v05-engine.js?v=1992';engine.async=false;engine.onerror=()=>{const banner=document.getElementById('banner');if(banner)banner.textContent='⚠️ Falha ao carregar o motor. Reabra o Zuno Core.'};document.body.appendChild(engine);
})();