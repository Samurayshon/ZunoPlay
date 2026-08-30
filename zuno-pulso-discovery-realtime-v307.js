(()=>{
if(window.__ZUNO_PULSO_DISCOVERY_REALTIME_V329__)return;window.__ZUNO_PULSO_DISCOVERY_REALTIME_V329__=true;
const $=(s,r=document)=>r.querySelector(s);
let channel=null,timer=0;
function isDiscover(){return $('.zm-tab[data-view="plaza"]')?.classList.contains('active')}
function refresh(){
  if(!isDiscover())return;
  clearTimeout(timer);
  timer=setTimeout(()=>{
    if(!isDiscover())return;
    const active=$('[data-zp304-mode].active')||$('[data-zp304-mode="for-you"]');
    active?.click();
    try{window.posthog?.capture?.('pulso_discovery_realtime_refresh',{mode:active?.dataset?.zp304Mode||'for-you'})}catch(_){ }
  },220);
}
async function getClient(){
  for(let i=0;i<50;i++){
    if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
    await new Promise(r=>setTimeout(r,100));
  }
  return null;
}
async function boot(){
  const c=await getClient();
  if(!c)return;
  if(channel)try{await c.removeChannel(channel)}catch(_){ }
  channel=c.channel('pulso-discovery-v329')
    .on('postgres_changes',{event:'*',schema:'public',table:'moments_posts'},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'moments_likes'},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'moments_comments'},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'friendships'},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'rooms'},refresh)
    .subscribe(status=>{
      try{window.posthog?.capture?.('pulso_discovery_realtime_status',{status})}catch(_){ }
    });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&isDiscover())refresh()});
  window.addEventListener('pagehide',()=>{try{if(channel)c.removeChannel(channel)}catch(_){ }} ,{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();