(()=>{
  'use strict';
  if(window.__ZUNO_HOME_BOOT_GUARD_V321__)return;
  window.__ZUNO_HOME_BOOT_GUARD_V321__=1;
  const RETRY_KEY='zuno-home-boot-retry-v321';
  let finished=false,timer=0;
  const $=id=>document.getElementById(id);
  function loaderVisible(){
    const el=$('loading');
    if(!el)return false;
    const s=getComputedStyle(el);
    return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';
  }
  function clearRetry(){try{sessionStorage.removeItem(RETRY_KEY)}catch(_){}}
  function markHealthy(){
    if(finished)return;
    if(document.documentElement.dataset.zunoAppReady==='1'||!loaderVisible()){
      finished=true;clearTimeout(timer);clearRetry();
    }
  }
  function showRecovery(){
    const loading=$('loading');
    if(!loading)return;
    loading.style.display='flex';
    loading.style.flexDirection='column';
    loading.style.gap='14px';
    loading.style.padding='28px';
    loading.style.textAlign='center';
    loading.innerHTML='<strong style="font-size:18px">Não foi possível iniciar o ZunoPlay</strong><span style="max-width:320px;color:#9a9caf;font-size:14px;line-height:1.45">A inicialização demorou mais que o esperado. Você pode tentar novamente sem perder sua conta.</span><button id="zunoBootRetry" type="button" style="border:0;border-radius:14px;padding:13px 18px;background:linear-gradient(135deg,#9c3cff,#5e44ff);color:#fff;font-weight:850">Tentar novamente</button><a href="login.html?next=index.html" style="color:#b9bbca;font-size:13px">Ir para o login</a>';
    $('zunoBootRetry')?.addEventListener('click',()=>{clearRetry();location.replace('index.html?boot_recovery='+Date.now())});
  }
  function reloadOnce(){
    let retried=false;
    try{retried=sessionStorage.getItem(RETRY_KEY)==='1'}catch(_){}
    if(retried){showRecovery();return}
    try{sessionStorage.setItem(RETRY_KEY,'1')}catch(_){}
    location.replace('index.html?boot_recovery='+Date.now());
  }
  function recover(){
    if(finished||!loaderVisible())return markHealthy();
    const hasSupabase=!!window.ZunoSupabaseClient||!!window.supabase?.createClient;
    if(hasSupabase){reloadOnce();return}
    const fallback=document.createElement('script');
    fallback.src='https://unpkg.com/@supabase/supabase-js@2';
    fallback.async=true;
    fallback.onload=reloadOnce;
    fallback.onerror=showRecovery;
    document.head.appendChild(fallback);
  }
  window.addEventListener('zuno:home-current-ready',markHealthy);
  window.addEventListener('pageshow',()=>setTimeout(markHealthy,0));
  const observer=new MutationObserver(markHealthy);
  document.addEventListener('DOMContentLoaded',()=>{
    const loading=$('loading');
    if(loading)observer.observe(loading,{attributes:true,attributeFilter:['style','class','hidden']});
    timer=setTimeout(recover,7000);
    markHealthy();
  },{once:true});
})();
