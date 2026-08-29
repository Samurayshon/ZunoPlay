(()=>{if(window.__ZUNO_ROOM_MICROINTERACTIONS_V1__)return;window.__ZUNO_ROOM_MICROINTERACTIONS_V1__=true;
const markSeat=el=>{if(!el||!(el.matches('.avatar-slot,.seat-empty')))return;el.classList.remove('zuno-seat-enter');void el.offsetWidth;el.classList.add('zuno-seat-enter');setTimeout(()=>el.classList.remove('zuno-seat-enter'),320)};
const markMessage=el=>{if(!el||!el.matches('.chat-row'))return;el.classList.add('zuno-message-enter');setTimeout(()=>el.classList.remove('zuno-message-enter'),260)};
function init(){const stage=document.getElementById('roomStage'),messages=document.getElementById('messages');
if(stage){stage.querySelectorAll(':scope>.avatar-slot,:scope>.seat-empty').forEach((el,i)=>setTimeout(()=>markSeat(el),i*18));const so=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('.avatar-slot,.seat-empty'))markSeat(n)}});so.observe(stage,{childList:true});window.addEventListener('pagehide',()=>so.disconnect(),{once:true})}
if(messages){const mo=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches?.('.chat-row'))markMessage(n);n.querySelectorAll?.('.chat-row').forEach(markMessage)}});mo.observe(messages,{childList:true,subtree:true});window.addEventListener('pagehide',()=>mo.disconnect(),{once:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
