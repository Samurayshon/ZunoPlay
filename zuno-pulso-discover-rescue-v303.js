(()=>{
if(window.__ZUNO_PULSO_DISCOVER_RESCUE_V303__)return;window.__ZUNO_PULSO_DISCOVER_RESCUE_V303__=true;
const $=(s,r=document)=>r.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let token=0;
function waitClient(ms=3500){return new Promise(resolve=>{const started=Date.now();const tick=()=>{if(window.ZunoSupabaseClient)return resolve(window.ZunoSupabaseClient);if(Date.now()-started>=ms)return resolve(null);setTimeout(tick,80)};tick()})}
function active(){return $('.zm-tab[data-view="plaza"]')?.classList.contains('active')}
function empty(message='Ainda não há publicações de outros perfis para descobrir.'){
 const feed=$('#feed');if(!feed)return;feed.innerHTML=`<div class="zp-empty zp-discover-rescue-empty"><b>Descobrir</b><span>${esc(message)}</span></div>`;
}
async function load(){
 const my=++token,feed=$('#feed');if(!feed||!active())return;
 const timer=setTimeout(()=>{if(my===token&&active()&&feed.querySelector('.zp-loading'))empty('Não encontramos novidades agora. Tente atualizar novamente em instantes.')},4500);
 try{
  const c=await waitClient();if(my!==token||!active())return;if(!c){empty('Não foi possível conectar ao Descobrir agora.');return}
  const session=(await Promise.race([c.auth.getSession(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('session-timeout')),2500))]))?.data?.session;
  if(!session?.user){empty('Sua sessão precisa ser atualizada.');return}
  const uid=session.user.id;
  const query=c.from('moments_posts').select('*').eq('visibility','public').neq('user_id',uid).order('created_at',{ascending:false}).limit(60);
  const result=await Promise.race([query,new Promise((_,rej)=>setTimeout(()=>rej(new Error('feed-timeout')),4000))]);
  if(my!==token||!active())return;
  if(result.error)throw result.error;
  const posts=result.data||[];
  if(!posts.length){empty();return}
  // Let the native Pulso renderer own rich cards when it completes. This rescue only guarantees the screen never stays loading.
  if(feed.querySelector('.zp-loading')){
    feed.innerHTML=posts.slice(0,20).map(p=>`<article class="zp-post zp-rescue-post" data-post="${esc(p.id)}"><header class="zp-post-head"><div class="zp-author"><span class="zp-avatar">Z</span><span><b>ZunoPlayer</b><small>Publicação pública</small></span></div></header>${p.content?`<div class="zp-copy">${esc(p.content)}</div>`:''}<div class="zp-stats"><span>Descobrir</span></div></article>`).join('');
  }
 }catch(e){console.error('[Pulso Descobrir rescue]',e);if(my===token&&active())empty('Não foi possível carregar o Descobrir agora. Tente novamente.')}
 finally{clearTimeout(timer)}
}
function bind(){const b=$('.zm-tab[data-view="plaza"]');if(!b||b.dataset.zpRescueBound)return;b.dataset.zpRescueBound='1';b.addEventListener('click',()=>setTimeout(load,120));}
function watch(){const feed=$('#feed');if(!feed)return;new MutationObserver(()=>{if(active()&&feed.querySelector('.zp-loading')){clearTimeout(watch.t);watch.t=setTimeout(load,250)}}).observe(feed,{childList:true,subtree:false})}
function boot(){bind();watch();if(active())load()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();