(()=>{
  if(window.__ZUNO_INTEGRATION_PHASE4__)return;
  window.__ZUNO_INTEGRATION_PHASE4__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const protectedPages=new Set(['index.html','perfil.html','avatar.html','amigos.html','conversas.html','comunidades.html','notificacoes.html','salas.html','sala.html','jogos.html','historico.html','zuno-core.html','zuno-stack.html']);
  const immersive=new Set(['sala.html','zuno-core.html','zuno-stack.html']);
  const state={page,auth:'pending',realtime:'pending',avatar:'pending',navigation:'pending',errors:[],warnings:[],checkedAt:null};
  const emit=()=>{state.checkedAt=new Date().toISOString();window.__ZUNO_INTEGRATION_STATUS__={...state,errors:[...state.errors],warnings:[...state.warnings]};window.dispatchEvent(new CustomEvent('zuno:integration-status',{detail:window.__ZUNO_INTEGRATION_STATUS__}))};
  const warn=(code,detail)=>{if(!state.warnings.some(x=>x.code===code))state.warnings.push({code,detail});emit()};
  const fail=(code,detail)=>{if(!state.errors.some(x=>x.code===code))state.errors.push({code,detail});emit()};
  function validateNavigation(){
    if(immersive.has(page)){state.navigation='immersive';emit();return}
    if(page==='index.html'){state.navigation=document.querySelector('.bottom-nav,.zhome-bottom-nav,[data-zuno-global-nav]')?'ready':'home-managed';emit();return}
    const nav=document.querySelector('[data-zuno-global-nav]');
    const header=document.querySelector('[data-zuno-global-header]');
    if(nav&&header)state.navigation='ready';else{state.navigation='degraded';warn('global-chrome-missing',{nav:!!nav,header:!!header})}
    emit();
  }
  function validateAvatar(){
    let local=null;try{local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null')}catch(_){warn('avatar-local-invalid','zunoAvatarPreset inválido')}
    if(local?.style==='zuno-studio-v1')state.avatar='saved';
    else if(window.ZunoAvatarRenderer)state.avatar='renderer-ready';
    else state.avatar='pending';
    emit();
  }
  async function validateAuth(){
    if(!protectedPages.has(page)){state.auth='public';emit();return}
    let sb=window.ZunoSupabaseClient;
    if(!sb&&window.ZunoRealtime?.client)sb=window.ZunoRealtime.client;
    if(!sb){state.auth='client-pending';warn('supabase-client-pending',page);return}
    try{
      const{data,error}=await sb.auth.getSession();if(error)throw error;
      if(data?.session?.user){state.auth='authenticated';emit();return}
      state.auth='anonymous';emit();
      if(page!=='index.html'&&page!=='login.html'&&page!=='cadastro.html')warn('protected-page-without-session',page);
    }catch(error){state.auth='error';fail('auth-session',String(error?.message||error))}
  }
  function validateRealtime(){
    const rt=window.ZunoRealtime;if(!rt){state.realtime='pending';emit();return}
    state.realtime=rt.getStatus?.()||'installed';emit();
  }
  function installErrorBoundary(){
    window.addEventListener('error',e=>{const src=e.filename||'';if(src.includes(location.host)||!src)fail('runtime-error',{message:e.message,source:src,line:e.lineno})});
    window.addEventListener('unhandledrejection',e=>fail('unhandled-rejection',String(e.reason?.message||e.reason||'Promise rejeitada')));
  }
  function run(){validateNavigation();validateAvatar();validateRealtime();validateAuth();}
  installErrorBoundary();
  ['zuno:realtime-installed','zuno:ready','zuno:connection','zuno:avatar-home-ready','zuno-avatar-saved','zuno:shell-mounted'].forEach(name=>window.addEventListener(name,()=>setTimeout(run,0)));
  window.addEventListener('pageshow',()=>setTimeout(run,150));
  window.addEventListener('online',()=>{state.realtime='rechecking';setTimeout(run,250)});
  window.addEventListener('offline',()=>{state.realtime='offline';emit()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{run();setTimeout(run,900);setTimeout(run,2200)},{once:true});else{run();setTimeout(run,900);setTimeout(run,2200)}
})();