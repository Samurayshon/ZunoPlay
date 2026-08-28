(()=>{
  if(window.__ZUNO_GAMES_STAGE7__)return;
  window.__ZUNO_GAMES_STAGE7__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const hub=page==='jogos.html',history=page==='historico.html',immersive=['zuno-core.html','zuno-stack.html'].includes(page);
  if(!hub&&!history&&!immersive)return;
  if(page==='zuno-core.html'&&!window.ZunoSupabaseClient){
    const boot=()=>{try{if(!window.ZunoSupabaseClient&&window.supabase?.createClient)window.ZunoSupabaseClient=window.supabase.createClient('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}catch(e){console.warn('Zuno Core Supabase bootstrap:',e)}};
    if(window.supabase?.createClient)boot();else{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.async=true;s.onload=boot;s.onerror=()=>console.warn('Zuno Core: SDK Supabase indisponível');document.head.appendChild(s)}
  }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function clean(text){return String(text||'').replace(/^[\s📊🎮⚡🧩🔗🎯⭐✅🔄]+/u,'').trim()}
  function decorate(){
    document.body.classList.add('zuno-games-stage7');
    if(history)document.body.classList.add('zuno-history-stage7');
    if(immersive)document.body.classList.add('zuno-game-immersive-stage7');
    document.querySelectorAll('.title,h1.title').forEach(el=>{if(el.dataset.zunoStage7Title)return;el.textContent=clean(el.textContent);el.dataset.zunoStage7Title='1'});
    if(history)document.querySelectorAll('.item .game').forEach(el=>{if(!el.dataset.zunoStage7Game){el.textContent=clean(el.textContent);el.dataset.zunoStage7Game='1'}});
  }
  async function waitClient(){for(let i=0;i<70;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await sleep(100)}return null}
  function todayStart(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString()}
  async function mountChallenge(){
    if(!hub||document.getElementById('zunoDailyChallenge'))return;
    const anchor=document.getElementById('zunoGameProgressHub')||document.querySelector('.hero');if(!anchor)return;
    const card=document.createElement('section');card.id='zunoDailyChallenge';card.className='zuno-challenge-card';
    card.innerHTML='<div class="zuno-challenge-kicker">Desafio Zuno · diário</div><div class="zuno-challenge-title">Entre no ciclo de hoje</div><div class="zuno-challenge-copy">Conclua 1 partida em Zuno Core ou Zuno Stack hoje.</div><div class="zuno-challenge-row"><div class="zuno-challenge-bar"><i style="width:0%"></i></div><div class="zuno-challenge-state">0/1</div></div><div class="zuno-challenge-reward">+ Progresso diário Zuno</div>';
    anchor.insertAdjacentElement('afterend',card);
    try{
      const sb=await waitClient();if(!sb)return;const{data:{session}}=await sb.auth.getSession();if(!session?.user)return;
      const{count}=await sb.from('game_scores').select('id',{count:'exact',head:true}).eq('user_id',session.user.id).gte('created_at',todayStart());
      const done=(count||0)>0;card.querySelector('.zuno-challenge-bar i').style.width=done?'100%':'0%';card.querySelector('.zuno-challenge-state').textContent=done?'Concluído':'0/1';
      if(done){card.querySelector('.zuno-challenge-title').textContent='Desafio concluído';card.querySelector('.zuno-challenge-copy').textContent='Você já jogou hoje. Continue para melhorar seu recorde.';card.querySelector('.zuno-challenge-reward').textContent='✓ Ciclo diário completo'}
    }catch(e){console.warn('Zuno desafio diário:',e)}
  }
  function mount(){decorate();mountChallenge();const root=document.querySelector('main,.app')||document.body;if(!root)return;const obs=new MutationObserver(()=>{decorate();mountChallenge()});obs.observe(root,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();