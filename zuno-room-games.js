(()=>{
if(window.__ZUNO_ROOM_GAMES__)return;window.__ZUNO_ROOM_GAMES__=true;
const params=new URLSearchParams(location.search);
const roomId=params.get('room')||params.get('room_id')||params.get('id')||sessionStorage.getItem('zunoplay_room_id')||'';
function openStack(){
  if(roomId){
    sessionStorage.setItem('zuno_return_room_id',roomId);
    sessionStorage.setItem('zuno_return_room_url','sala.html?room='+encodeURIComponent(roomId));
  }
  const target=new URL('zuno-stack.html',location.href);
  if(roomId)target.searchParams.set('room',roomId);
  target.searchParams.set('from','sala');
  location.href=target.href;
}
function installPlayIntercept(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-action="play"]');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openStack();
  },{capture:true});
}
function init(){
  if(!document.body.classList.contains('zuno-page-sala'))return;
  installPlayIntercept();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();