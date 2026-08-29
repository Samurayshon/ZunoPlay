(()=>{
if(window.__ZUNO_PULSO_PROFILE_ROUTE_V323__)return;window.__ZUNO_PULSO_PROFILE_ROUTE_V323__=true;
function onClick(e){
  const target=e.target?.closest?.('[data-profile]');
  if(!target)return;
  const id=target.dataset.profile;
  if(!id)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  try{window.posthog?.capture?.('pulso_profile_click',{profile_id:id,route_guard:'v323'})}catch(_){}
  location.href=`perfil.html?user=${encodeURIComponent(id)}`;
}
document.addEventListener('click',onClick,true);
})();
