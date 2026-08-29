(()=>{
  if(window.__ZUNO_INTEGRATION_PHASE4__)return;
  window.__ZUNO_INTEGRATION_PHASE4__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const protectedPages=new Set(['index.html','perfil.html','avatar.html','amigos.html','conversas.html','comunidades.html','notificacoes.html','salas.html','sala.html','jogos.html','historico.html','zuno-stack.html','pulso.html']);
  const immersive=new Set(['sala.html','zuno-stack.html']);
  const state={page,auth:'pending',realtime:'pending',avatar:'pending',navigation:'pending',pulso:'pending',errors:[],warnings:[],checkedAt:null};
  const emit=()=>{state.checkedAt=new Date().toISOString();window.__ZUNO_INTEGRATION_STATUS__={...state,errors:[...state.errors],warnings:[...state.warnings]};window.dispatchEvent(new CustomEvent('zuno:integration-status',{detail:window.__ZUNO_INTEGRATION_STATUS__}))};
  const warn=(code,detail)=>{if(!state.warnings.some(x=>x.code===code))state.warnings.push({code,detail});emit()};
  const fail=(code,detail)=>{if(!state.errors.some(x=>x.code===code))state.errors.push({code,detail});emit()};
  function validateNavigation(){if(immersive.has(page)){state.navigation='immersive';emit();return}if(page==='index.html'){state.navigation=document.querySelector('.bottom-nav,.zhome-bottom-nav,[data-zuno-global-nav]')?'ready':'home-managed';emit();return}const nav=document.querySelector('[data-zuno-global-nav],[data-zuno-canonical-nav]'),header=document.querySelector('[data-zuno-global-header],.zm-header');if(nav&&header)state.navigation='ready';else{state.navigation='degraded';warn('global-chrome-missing',{nav:!!nav,header:!!header})}emit()}
  function validateAvatar(){let local=null;try{local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null')}catch(_){warn('avatar-local-invalid','zunoAvatarPreset inválido')}if(local?.style==='zuno-studio-v1')state.avatar='saved';else if(window.ZunoAvatarRenderer)state.avatar='renderer-ready';else state.avatar='pending';emit()}
  function getClient(){return window.ZunoSupabaseClient||window.ZunoRealtime?.client||null}
  function installPulsoBridge(){if(window.ZunoPulso?.publishActivity){state.pulso='ready';emit();return}window.ZunoPulso={
    async publishActivity({type='achievement',text='',sourceId=null,visibility='public',hashtags=[]}={}){
      const sb=getClient();if(!sb)throw new Error('Pulso indisponível');
      const{data:{session}}=await sb.auth.getSession();if(!session?.user)throw new Error('Sessão necessária');
      const allowed=new Set(['game','room','achievement']);const sourceType=allowed.has(type)?type:'achievement';
      const clean=String(text||'').trim().slice(0,2000);if(!clean)throw new Error('Conteúdo obrigatório');
      const normalized=[...new Set((hashtags||[]).map(x=>String(x).replace(/^#/,'').toLowerCase()).filter(Boolean))].slice(0,8);
      const{data,error}=await sb.from('moments_posts').insert({user_id:session.user.id,content:clean,hashtags:normalized,visibility:visibility==='friends'?'friends':'public',source_type:sourceType,source_id:sourceId||null}).select().single();
      if(error)throw error;window.dispatchEvent(new CustomEvent('zuno:pulso-published',{detail:{post:data,source:sourceType}}));try{window.posthog?.capture?.('pulso_activity_publish',{source_type:sourceType,post_id:data.id})}catch(_){}return data;
    },
    open(postId){location.href='pulso.html'+(postId?`?post=${encodeURIComponent(postId)}`:'')},
    shareGameResult(text,sourceId){return this.publishActivity({type:'game',text,sourceId,hashtags:['zunostack','jogos']})},
    shareRoomMoment(text,sourceId){return this.publishActivity({type:'room',text,sourceId,hashtags:['salas','aovivo']})},
    shareAchievement(text,sourceId){return this.publishActivity({type:'achievement',text,sourceId,hashtags:['conquista']})}
  };state.pulso='ready';emit();window.dispatchEvent(new CustomEvent('zuno:pulso-ready'));}
  async function validateAuth(){if(!protectedPages.has(page)){state.auth='public';emit();return}let sb=getClient();if(!sb){state.auth='client-pending';warn('supabase-client-pending',page);return}try{const{data,error}=await sb.auth.getSession();if(error)throw error;if(data?.session?.user){state.auth='authenticated';installPulsoBridge();emit();return}state.auth='anonymous';emit();if(page!=='index.html'&&page!=='login.html'&&page!=='cadastro.html')warn('protected-page-without-session',page)}catch(error){state.auth='error';fail('auth-session',String(error?.message||error))}}
  function validateRealtime(){const rt=window.ZunoRealtime;if(!rt){state.realtime='pending';emit();return}state.realtime=rt.getStatus?.()||'installed';emit()}
  function installErrorBoundary(){window.addEventListener('error',e=>{const src=e.filename||'';if(src.includes(location.host)||!src)fail('runtime-error',{message:e.message,source:src,line:e.lineno})});window.addEventListener('unhandledrejection',e=>fail('unhandled-rejection',String(e.reason?.message||e.reason||'Promise rejeitada')))}
  function run(){validateNavigation();validateAvatar();validateRealtime();installPulsoBridge();validateAuth()}
  installErrorBoundary();['zuno:realtime-installed','zuno:ready','zuno:connection','zuno:avatar-home-ready','zuno-avatar-saved','zuno:shell-mounted'].forEach(name=>window.addEventListener(name,()=>setTimeout(run,0)));window.addEventListener('pageshow',()=>setTimeout(run,150));window.addEventListener('online',()=>{state.realtime='rechecking';setTimeout(run,250)});window.addEventListener('offline',()=>{state.realtime='offline';emit()});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{run();setTimeout(run,900);setTimeout(run,2200)},{once:true});else{run();setTimeout(run,900);setTimeout(run,2200)}
})();