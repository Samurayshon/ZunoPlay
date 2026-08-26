(() => {
  if (window.__ZUNOPLAY_GLOBAL_NAV__) return;
  window.__ZUNOPLAY_GLOBAL_NAV__ = true;

  const SUPABASE_URL = 'https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const homeUrl = new URL('./index.html', location.href).href;
  const skipNavigation = ['index.html', 'sala.html', 'desafio.html', 'login.html', 'cadastro.html'].includes(page);
  let scheduled = false;
  let running = false;

  function patchSupabaseFactory() {
    if (!window.supabase?.createClient) return false;
    if (window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__) return true;
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    if (!window.ZunoSupabaseClient) window.ZunoSupabaseClient = originalCreateClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase.createClient = function(url, key, options) {
      const sameProject = url === SUPABASE_URL && key === SUPABASE_KEY;
      const defaultOptions = !options || Object.keys(options).length === 0;
      if (sameProject && defaultOptions) return window.ZunoSupabaseClient;
      return originalCreateClient(url, key, options);
    };
    window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__ = true;
    return true;
  }

  function loadScript(id,file,errorText){
    if(document.getElementById(id))return;
    const s=document.createElement('script');
    s.id=id;
    s.src=new URL(file,location.href).href;
    s.async=true;
    s.onerror=()=>console.error(errorText);
    document.head.appendChild(s);
  }

  function loadStyle(id,file){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;
    link.rel='stylesheet';
    link.href=new URL(file,location.href).href;
    document.head.appendChild(link);
  }

  function loadRealtimeCore(){
    if(window.ZunoRealtime){window.ZunoRealtime.start?.().catch?.(console.error);return}
    loadScript('zunoplay-realtime-global','./realtime-global.js','ZunoPlay: não foi possível carregar realtime-global.js');
  }

  function loadRoomVoice(){
    if(page==='sala.html')loadScript('zunoplay-room-voice','./voz-sala.js','ZunoPlay: não foi possível carregar voz-sala.js');
  }

  function loadRoomSessionGuard(){
    loadScript('zunoplay-room-session-guard','./room-session-guard.js','ZunoPlay: não foi possível carregar room-session-guard.js');
  }

  function loadOfficialHome(){
    if(page!=='index.html')return;
    loadStyle('zunoplay-home-v29-style','./home-v29.css');
    loadScript('zunoplay-home-v29-script','./home-v29.js','ZunoPlay: não foi possível carregar home-v29.js');
  }

  function bootstrapRealtime() {
    if (patchSupabaseFactory()) { loadRealtimeCore(); return; }
    if (document.getElementById('zunoplay-supabase-sdk')) return;
    const sdk = document.createElement('script');
    sdk.id = 'zunoplay-supabase-sdk';
    sdk.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    sdk.async = true;
    sdk.onload = () => { if (patchSupabaseFactory()) loadRealtimeCore(); };
    sdk.onerror = () => console.error('ZunoPlay: não foi possível carregar Supabase');
    document.head.appendChild(sdk);
  }

  bootstrapRealtime();
  loadRoomVoice();
  loadRoomSessionGuard();
  loadOfficialHome();

  if (skipNavigation) return;

  const style = document.createElement('style');
  style.textContent = `.zunoplay-global-home{width:42px;height:42px;min-width:42px;flex:0 0 42px;box-sizing:border-box;border:1px solid #303145;border-radius:12px;background:#1b1c2b;color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;font:20px Arial,sans-serif;line-height:1;cursor:pointer;text-decoration:none;position:relative;z-index:10000}`;
  document.head.appendChild(style);

  function goHome(event){event.preventDefault();location.href=homeUrl}
  function isCandidate(el){
    if(!(el instanceof Element))return false;
    if(el.classList.contains('zunoplay-global-home'))return true;
    if(el.classList.contains('home-button')||el.classList.contains('zunoplay-home-button')||el.classList.contains('home'))return true;
    if(el.tagName==='A'&&/(^|\/)index\.html(?:$|[?#])/.test(el.getAttribute('href')||''))return true;
    const text=(el.textContent||'').trim().toLowerCase();
    return(el.tagName==='BUTTON'||el.tagName==='A')&&(text==='⌂'||text==='🏠'||text==='home');
  }

  function mount(){
    if(running)return;
    running=true;
    try{
      const all=[...document.querySelectorAll('button,a,[role="button"]')];
      const candidates=all.filter(isCandidate);
      const headers=[...document.querySelectorAll('.header,.chat-header,.header-left')];
      let home=document.querySelector('.zunoplay-global-home');
      if(!home&&candidates.length)home=candidates[0];
      if(!home&&headers.length){home=document.createElement('button');headers[0].insertBefore(home,headers[0].firstChild)}
      if(!home)return;
      if(!home.classList.contains('zunoplay-global-home')){
        home.className='zunoplay-global-home';
        home.removeAttribute('href');
        home.removeAttribute('onclick');
        home.removeAttribute('data-action');
        home.setAttribute('type','button');
        home.setAttribute('aria-label','Voltar para a tela inicial');
        home.setAttribute('title','Tela inicial');
        home.textContent='⌂';
        home.onclick=goHome;
      }
      const duplicates=[...document.querySelectorAll('.zunoplay-global-home')].filter(el=>el!==home);
      candidates.slice(1).forEach(el=>{if(el!==home)el.remove()});
      duplicates.forEach(el=>el.remove());
    }finally{running=false}
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount()})}
  function ready(){mount();schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();