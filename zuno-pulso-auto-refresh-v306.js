(()=>{
if(window.__ZUNO_PULSO_AUTO_REFRESH_V306__)return;window.__ZUNO_PULSO_AUTO_REFRESH_V306__=true;
const $=(s,r=document)=>r.querySelector(s);
let timer=null,channel=null,lastRefresh=0;
const active=()=>$('.zm-tab[data-view="plaza"]')?.classList.contains('active');
const benignEmpty=()=>{const box=$('#zp304Panel .zp304-empty');return !!box&&/Seu Para você está começando|Nada em destaque por enquanto/i.test(box.textContent||'')};
function cleanEmpty(){if(!benignEmpty())return;const btn=$('#zp304Retry');if(btn)btn.remove();let note=$('#zpAutoRefreshNote');if(!note){note=document.createElement('small');note.id='zpAutoRefreshNote';note.textContent='Atualiza automaticamente quando surgirem novidades.';$('#zp304Panel .zp304-empty')?.appendChild(note)}}
function refresh(reason='timer'){
 if(!active()||document.hidden)return;
 const now=Date.now();if(now-lastRefresh<5000)return;lastRefresh=now;
 const tab=$('.zm-tab[data-view="plaza"]');if(tab)tab.click();
 try{window.posthog?.capture?.('pulso_discover_auto_refresh',{reason})}catch(_){}
 setTimeout(cleanEmpty,900);
}
function schedule(){clearInterval(timer);timer=setInterval(()=>{if(active())refresh('interval')},20000)}
async function realtime(){
 for(let i=0;i<40&&!window.ZunoSupabaseClient;i++)await new Promise(r=>setTimeout(r,100));
 const c=window.ZunoSupabaseClient;if(!c?.channel)return;
 try{channel=c.channel('pulso-discover-auto-v306').on('postgres_changes',{event:'*',schema:'public',table:'moments_posts'},()=>refresh('post_change')).on('postgres_changes',{event:'*',schema:'public',table:'moments_likes'},()=>refresh('like_change')).on('postgres_changes',{event:'*',schema:'public',table:'moments_comments'},()=>refresh('comment_change')).subscribe()}catch(e){console.warn('[Pulso auto refresh]',e)}
}
function boot(){schedule();realtime();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active())refresh('visible')});window.addEventListener('focus',()=>{if(active())refresh('focus')});new MutationObserver(cleanEmpty).observe($('#zpDiscoveryV304')||document.body,{childList:true,subtree:true});cleanEmpty()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();