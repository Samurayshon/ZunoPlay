(() => {
  if (window.__ZUNOPLAY_GLOBAL_NAV__) return;
  window.__ZUNOPLAY_GLOBAL_NAV__ = true;

  const SUPABASE_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SUPABASE_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const ASSET_VERSION='102';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const homeUrl=new URL('./index.html',location.href).href;
  const skipNavigation=['index.html','sala.html','desafio.html','login.html','cadastro.html'].includes(page);
  let scheduled=false,running=false;

  function patchSupabaseFactory(){
    if(!window.supabase?.createClient)return false;
    if(window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__)return true;
    const originalCreateClient=window.supabase.createClient.bind(window.supabase);
    if(!window.ZunoSupabaseClient)window.ZunoSupabaseClient=originalCreateClient(SUPABASE_URL,SUPABASE_KEY);
    window.supabase.createClient=function(url,key,options){
      const sameProject=url===SUPABASE_URL&&key===SUPABASE_KEY;
      const defaultOptions=!options||Object.keys(options).length===0;
      if(sameProject&&defaultOptions)return window.ZunoSupabaseClient;
      return originalCreateClient(url,key,options);
    };
    window.__ZUNOPLAY_SUPABASE_FACTORY_PATCHED__=true;
    return true;
  }

  function versioned(file){return file+(file.includes('?')?'&':'?')+'v='+ASSET_VERSION}
  function loadScript(id,file,errorText,onload){if(document.getElementById(id)){onload?.();return}const s=document.createElement('script');s.id=id;s.src=new URL(versioned(file),location.href).href;s.async=true;if(onload)s.onload=onload;s.onerror=()=>console.error(errorText);document.head.appendChild(s)}
  function loadStyle(id,file){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(versioned(file),location.href).href;document.head.appendChild(link)}
  function loadDesignSystem(){loadStyle('zunoplay-design-system','./zuno-design-system.css')}
  function loadStage3Navigation(){loadStyle('zunoplay-navigation-style','./zuno-navigation.css');loadScript('zunoplay-navigation-stage3','./zuno-navigation.js','ZunoPlay: não foi possível carregar a navegação global')}
  function loadRealtimeCore(){if(window.ZunoRealtime){window.ZunoRealtime.start?.().catch?.(console.error);return}loadScript('zunoplay-realtime-global','./realtime-global.js','ZunoPlay: não foi possível carregar realtime-global.js')}
  function loadRoomVoice(){if(page==='sala.html')loadScript('zunoplay-room-voice','./voz-sala.js','ZunoPlay: não foi possível carregar voz-sala.js')}
  function loadRoomSessionGuard(){loadScript('zunoplay-room-session-guard','./room-session-guard.js','ZunoPlay: não foi possível carregar room-session-guard.js')}
  function loadAvatarHomeSync(){if(page==='index.html')loadScript('zunoplay-avatar-home-sync','./avatar-home-sync.js','ZunoPlay: não foi possível sincronizar o personagem na Home')}
  function loadAvatarRenderer(){if(window.ZunoAvatarRenderer){loadAvatarHomeSync();return}loadScript('zunoplay-avatar-renderer','./avatar-renderer.js','ZunoPlay: não foi possível carregar o renderizador de avatar',loadAvatarHomeSync)}
  function loadOfficialHome(){if(page!=='index.html')return;loadStyle('zunoplay-home-style','./home-v29.css');loadStyle('zunoplay-home-stage2','./home-v30.css')}

  function installOfficialLogoStyle(){if(document.getElementById('zunoplay-official-logo-style'))return;const style=document.createElement('style');style.id='zunoplay-official-logo-style';style.textContent=`.zuno-official-logo{display:inline-flex!important;align-items:center!important;gap:.26em!important;line-height:1!important;white-space:nowrap!important;letter-spacing:-.045em!important}.zuno-official-logo-mark{width:1.16em;height:1.06em;flex:0 0 auto;display:block;filter:drop-shadow(0 0 .26em rgba(145,70,255,.52))}.zuno-official-logo-word{font-weight:950;letter-spacing:-.055em;color:#f7f7ff;line-height:1}.zuno-official-logo-word b{font-weight:950;background:linear-gradient(135deg,#ca58ff 0%,#9a39ff 48%,#ef3bc8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}.welcome-logo.zuno-official-logo{justify-content:center;font-size:48px}.brand.zuno-official-logo{font-size:38px}.logo.zuno-official-logo{font-size:inherit}@media(max-width:520px){.brand.zuno-official-logo{font-size:30px}.welcome-logo.zuno-official-logo{font-size:42px}}`;document.head.appendChild(style)}
  function officialLogoMarkup(){return `<svg class="zuno-official-logo-mark" viewBox="0 0 76 68" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="zlg" x1="8" y1="4" x2="68" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#4fd6ff"/><stop offset=".28" stop-color="#7b4dff"/><stop offset=".64" stop-color="#b62cff"/><stop offset="1" stop-color="#f23ed0"/></linearGradient></defs><rect x="6" y="5" width="64" height="58" rx="15" fill="url(#zlg)" opacity=".98" transform="rotate(-6 38 34)"/><path d="M22 20h38L37 35h18L27 52H15l25-18H22z" fill="#fff"/></svg><span class="zuno-official-logo-word">Zuno<b>Play</b></span>`}
  function mountOfficialLogo(){installOfficialLogoStyle();document.querySelectorAll('.brand,.welcome-logo,.logo').forEach(el=>{if(el.dataset.zunoOfficialLogo==='1')return;const text=(el.textContent||'').replace(/\s+/g,'').toLowerCase();if(!text.includes('zunoplay')&&!el.classList.contains('brand')&&!el.classList.contains('welcome-logo'))return;el.dataset.zunoOfficialLogo='1';el.classList.add('zuno-official-logo');el.innerHTML=officialLogoMarkup();el.setAttribute('aria-label','ZunoPlay')})}
  function bootstrapRealtime(){if(patchSupabaseFactory()){loadRealtimeCore();loadAvatarRenderer();return}if(document.getElementById('zunoplay-supabase-sdk'))return;const sdk=document.createElement('script');sdk.id='zunoplay-supabase-sdk';sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';sdk.async=true;sdk.onload=()=>{if(patchSupabaseFactory()){loadRealtimeCore();loadAvatarRenderer()}};sdk.onerror=()=>console.error('ZunoPlay: não foi possível carregar Supabase');document.head.appendChild(sdk)}

  loadDesignSystem();loadStage3Navigation();bootstrapRealtime();loadRoomVoice();loadRoomSessionGuard();loadOfficialHome();
  const brandReady=()=>{mountOfficialLogo();setTimeout(mountOfficialLogo,250)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',brandReady,{once:true});else brandReady();
  if(skipNavigation)return;
  const style=document.createElement('style');style.textContent=`.zunoplay-global-home{width:42px;height:42px;min-width:42px;flex:0 0 42px;box-sizing:border-box;border:1px solid var(--z-border,#303145);border-radius:var(--z-radius-sm,12px);background:var(--z-surface-2,#1b1c2b);color:var(--z-text,#fff);display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;font:20px Arial,sans-serif;line-height:1;cursor:pointer;text-decoration:none;position:relative;z-index:10000;box-shadow:var(--z-glow-purple,none)}`;document.head.appendChild(style);
  function goHome(event){event.preventDefault();location.href=homeUrl}
  function isCandidate(el){if(!(el instanceof Element))return false;if(el.classList.contains('zunoplay-global-home')||el.classList.contains('home-button')||el.classList.contains('zunoplay-home-button')||el.classList.contains('home'))return true;if(el.tagName==='A'&&/(^|\/)index\.html(?:$|[?#])/.test(el.getAttribute('href')||''))return true;const text=(el.textContent||'').trim().toLowerCase();return(el.tagName==='BUTTON'||el.tagName==='A')&&(text==='⌂'||text==='🏠'||text==='home')}
  function mount(){if(running)return;running=true;try{mountOfficialLogo();const all=[...document.querySelectorAll('button,a,[role="button"]')],candidates=all.filter(isCandidate),headers=[...document.querySelectorAll('.header,.chat-header,.header-left')];let home=document.querySelector('.zunoplay-global-home');if(!home&&candidates.length)home=candidates[0];if(!home&&headers.length){home=document.createElement('button');headers[0].insertBefore(home,headers[0].firstChild)}if(!home)return;if(!home.classList.contains('zunoplay-global-home')){home.className='zunoplay-global-home';home.removeAttribute('href');home.removeAttribute('onclick');home.removeAttribute('data-action');home.setAttribute('type','button');home.setAttribute('aria-label','Voltar para a tela inicial');home.setAttribute('title','Tela inicial');home.textContent='⌂';home.onclick=goHome}const duplicates=[...document.querySelectorAll('.zunoplay-global-home')].filter(el=>el!==home);candidates.slice(1).forEach(el=>{if(el!==home)el.remove()});duplicates.forEach(el=>el.remove())}finally{running=false}}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount()})}
  function ready(){mount();schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
})();