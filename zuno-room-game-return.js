(()=>{
if(window.__ZUNO_ROOM_GAME_RETURN__)return;window.__ZUNO_ROOM_GAME_RETURN__=true;
const q=new URLSearchParams(location.search),roomId=q.get('room')||sessionStorage.getItem('zuno_return_room_id'),fromRoom=q.get('from')==='sala'||!!sessionStorage.getItem('zuno_return_room_id');
if(!fromRoom||!roomId)return;
function roomUrl(){return'sala.html?room='+encodeURIComponent(roomId)}
function ensureReturn(){if(document.querySelector('[data-zuno-return-room]'))return;const btn=document.createElement('button');btn.type='button';btn.dataset.zunoReturnRoom='1';btn.className='zuno-return-room';btn.innerHTML='← <span>Voltar para a sala</span>';btn.onclick=()=>location.href=roomUrl();const host=document.querySelector('.header,.head,.app')||document.body;host.insertBefore(btn,host.firstChild)}
function patchLinks(){document.querySelectorAll('button[onclick],a[href]').forEach(el=>{const text=(el.textContent||'').trim().toLowerCase();if(text==='⌂'||text.includes('tela inicial')){el.addEventListener('click',e=>{if(!fromRoom)return;e.preventDefault();e.stopImmediatePropagation();location.href=roomUrl()},{capture:true})}})}
const style=document.createElement('style');style.textContent='.zuno-return-room{width:100%;height:42px;margin:0 0 12px;border:1px solid rgba(37,223,242,.22);border-radius:13px;background:linear-gradient(135deg,rgba(155,61,255,.13),rgba(37,223,242,.08));color:#dbe7ff;font-weight:850;display:flex;align-items:center;justify-content:center;gap:7px}.zuno-return-room span{font-size:11px}';document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureReturn();patchLinks()},{once:true});else{ensureReturn();patchLinks()}
})();