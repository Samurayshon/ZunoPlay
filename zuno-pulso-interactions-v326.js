(()=>{
'use strict';
if(window.__ZUNO_PULSO_INTERACTIONS_V330__)return;window.__ZUNO_PULSO_INTERACTIONS_V330__=1;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>{const d=document.createElement('div');d.textContent=v??'';return d.innerHTML};
const withTimeout=(promise,ms=5500)=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))]);
let client=null,user=null,requestSeq=0;
async function ready(){
  for(let i=0;i<50;i++){
    client=window.ZunoSupabaseClient||window.__zunoSupabaseClient||window.supabaseClient||null;
    if(client)break;
    await new Promise(r=>setTimeout(r,80));
  }
  if(!client)throw new Error('supabase_unavailable');
  const{data,error}=await withTimeout(client.auth.getSession(),4500);
  if(error)throw error;
  user=data?.session?.user||null;
  if(!user)throw new Error('session_unavailable');
  return true;
}
function pname(p){return p?.nickname||p?.username||'ZunoPlayer'}
function avatar(p){return p?.avatar_url?`<span class="zp326-avatar"><img src="${esc(p.avatar_url)}" alt=""></span>`:`<span class="zp326-avatar">${esc(pname(p).charAt(0).toUpperCase())}</span>`}
function ensureLikes(){
  if($('#zp326Likes'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="zp326Likes" class="zp326-modal" hidden><div class="zp326-backdrop" data-zp326-close></div><section class="zp326-sheet" role="dialog" aria-modal="true" aria-label="Curtidas da publicação"><header class="zp326-head"><div><b>Curtidas</b><small>Pessoas que curtiram esta publicação</small></div><button type="button" class="zp326-close" data-zp326-close aria-label="Fechar">×</button></header><div id="zp326LikesList" class="zp326-list"><div class="zp326-loading">Carregando curtidas...</div></div></section></div>`);
  $$('[data-zp326-close]').forEach(b=>b.onclick=closeLikes);
}
function closeLikes(){requestSeq++;const m=$('#zp326Likes');if(m)m.hidden=true;document.body.classList.remove('zp326-likes-open')}
function failureHtml(kind){
  const message=kind==='timeout'?'A conexão demorou mais que o esperado.':'Não foi possível buscar quem curtiu esta publicação.';
  return `<div class="zp326-empty"><b>Não foi possível carregar as curtidas</b><span>${message}</span><button type="button" class="zp326-retry">Tentar novamente</button></div>`;
}
async function openLikes(postId){
  if(!postId)return;
  ensureLikes();
  const modal=$('#zp326Likes'),list=$('#zp326LikesList'),seq=++requestSeq;
  modal.hidden=false;document.body.classList.add('zp326-likes-open');
  list.innerHTML='<div class="zp326-loading">Carregando curtidas...</div>';
  try{
    await ready();
    const{data:likes,error}=await withTimeout(client.from('moments_likes').select('user_id,created_at').eq('post_id',postId).order('created_at',{ascending:false}),5500);
    if(error)throw error;if(seq!==requestSeq)return;
    const ids=[...new Set((likes||[]).map(x=>x.user_id).filter(Boolean))];
    if(!ids.length){list.innerHTML='<div class="zp326-empty"><b>Nenhuma curtida ainda</b><span>Quando alguém curtir, aparecerá aqui.</span></div>';return}
    const{data:profiles,error:pe}=await withTimeout(client.from('profiles').select('id,username,nickname,avatar_url,level').in('id',ids),5500);
    if(pe)throw pe;if(seq!==requestSeq)return;
    const pm=new Map((profiles||[]).map(p=>[p.id,p]));
    list.innerHTML=ids.map(id=>{const p=pm.get(id)||{};return`<button type="button" class="zp326-person" data-zp326-profile="${esc(id)}">${avatar(p)}<span><b>${esc(pname(p))}</b><small>Nível ${p.level||1}</small></span><em>Ver perfil</em></button>`}).join('');
    $$('[data-zp326-profile]',list).forEach(b=>b.onclick=()=>location.href=`perfil.html?user=${encodeURIComponent(b.dataset.zp326Profile)}`);
    try{window.posthog?.capture?.('pulso_like_list_open',{module:'pulso',surface:'post_detail',post_id:postId,count:ids.length})}catch(_){ }
  }catch(e){
    if(seq!==requestSeq)return;
    console.error('[Pulso likes v330]',e);
    list.innerHTML=failureHtml(e?.message==='timeout'?'timeout':'error');
    $('.zp326-retry',list)?.addEventListener('click',()=>openLikes(postId),{once:true});
  }
}
function interactiveTarget(target){return !!target.closest?.('button,a,input,textarea,select,form,video,[contenteditable="true"],.zp-comments,.zp-comment')}
function capture(e){
  const likes=e.target.closest?.('[data-zp325-like-list]');
  if(likes){
    const detail=e.target.closest?.('[data-zp325-post]');
    if(!detail)return;
    e.preventDefault();e.stopImmediatePropagation();
    openLikes(detail.dataset.zp325Post);
    return;
  }
  const discovery=e.target.closest?.('.zp304-card[data-zp-post]');
  if(!discovery||interactiveTarget(e.target))return;
  const id=discovery.dataset.zpPost;
  if(!id||!window.ZunoPulsoInteractions?.openPost)return;
  e.preventDefault();e.stopImmediatePropagation();
  window.ZunoPulsoInteractions.openPost(id);
}
function boot(){ensureLikes();document.addEventListener('click',capture,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ZunoPulsoInteractionsV326={openLikes};
})();
