(() => {
  if (window.__ZUNOPLAY_GLOBAL_NAV__) return;
  window.__ZUNOPLAY_GLOBAL_NAV__ = true;

  const SUPABASE_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SUPABASE_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const ASSET_VERSION='178';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const socialPages=['amigos.html','conversas.html','comunidades.html','perfil.html','notificacoes.html'];
  const gamePages=['jogos.html','historico.html','zuno-core.html','zuno-stack.html'];
  const roomGamePages=['zuno-core.html','zuno-stack.html'];

  function installHomeBootGuard(){
    if(page!=='index.html')return;
    document.documentElement.dataset.zunoHomeBoot='current-only';
    document.documentElement.dataset.zunoAvatarSystem='studio';
    if(document.getElementById('zunoplay-home-boot-guard'))return;
    const style=document.createElement('style');
    style.id='zunoplay-home-boot-guard';
    style.textContent=`
      html[data-zuno-home-boot="current-only"]:not([data-zuno-home-current-ready="1"]) #homeScreen,
      html[data-zuno-home-boot="current-only"]:not([data-zuno-home-current-ready="1"]) #bottomNav{
        visibility:hidden!important;pointer-events:none!important
      }
      html[data-zuno-avatar-system="studio"] #profileAvatarWrap>:not(.profile-glow):not([data-zuno-studio-avatar="1"]){display:none!important}
      html[data-zuno-avatar-system="studio"] #profileButton>:not([data-zuno-studio-avatar="1"]){display:none!important}
      html[data-zuno-avatar-system="studio"]:not([data-zuno-avatar-home-ready="1"]) #profileAvatarWrap,
      html[data-zuno-avatar-system="studio"]:not([data-zuno-avatar-home-ready="1"]) #profileButton{
        visibility:hidden!important
      }
    `;
    document.head.appendChild(style);
  }

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
  function loadScript(id,file,errorText,onload){
    const existing=document.getElementById(id);
    if(existing){onload?.();return}
    const s=document.createElement('script');
    s.id=id;s.src=new URL(versioned(file),location.href).href;s.async=true;
    if(onload)s.onload=onload;
    s.onerror=()=>console.error(errorText);
    document.head.appendChild(s);
  }
  function loadStyle(id,file){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;link.rel='stylesheet';link.href=new URL(versioned(file),location.href).href;
    document.head.appendChild(link);
  }

  function loadDesignSystem(){loadStyle('zunoplay-design-system','./zuno-design-system.css')}
  function loadUnifiedIdentity(){
    loadStyle('zunoplay-unified-style','./zuno-unified.css');
    loadScript('zunoplay-unified-script','./zuno-unified.js','ZunoPlay: identidade unificada indisponível');
  }
  function loadNavigation(){
    if(page==='index.html')return;
    loadStyle('zunoplay-navigation-style','./zuno-navigation.css');
    loadScript('zunoplay-navigation-stage3','./zuno-navigation.js','ZunoPlay: navegação global indisponível');
  }
  function loadSocialSystem(){
    if(!socialPages.includes(page))return;
    loadStyle('zunoplay-social-style','./zuno-social.css');
    loadScript('zunoplay-social-stage4','./zuno-social.js','ZunoPlay: sistema social indisponível');
  }
  function loadGameProgression(){
    if(!gamePages.includes(page))return;
    loadStyle('zunoplay-game-progression-style','./zuno-game-progression.css');
    loadScript('zunoplay-game-progression','./zuno-game-progression.js','ZunoPlay: progressão de jogos indisponível');
  }
  function loadRoomExperience(){
    if(page!=='sala.html')return;
    [
      ['zunoplay-room-stage5','./zuno-room-experience.css'],
      ['zunoplay-room-fit','./zuno-room-fit.css'],
      ['zunoplay-room-extras','./zuno-room-extras.css'],
      ['zunoplay-voice-feedback-style','./zuno-voice-feedback.css'],
      ['zunoplay-room-profile-card-style','./zuno-room-profile-card.css'],
      ['zunoplay-directed-gifts-style','./zuno-directed-gifts.css'],
      ['zunoplay-room-moderation-style','./zuno-room-moderation.css']
    ].forEach(([id,file])=>loadStyle(id,file));
    [
      ['zunoplay-room-experience-stage5','./zuno-room-experience.js','ZunoPlay: experiência de sala indisponível'],
      ['zunoplay-voice-feedback','./zuno-voice-feedback.js','ZunoPlay: feedback de voz indisponível'],
      ['zunoplay-room-profile-card','./zuno-room-profile-card.js','ZunoPlay: perfil rápido indisponível'],
      ['zunoplay-directed-gifts','./zuno-directed-gifts.js','ZunoPlay: presentes direcionados indisponíveis'],
      ['zunoplay-room-games','./zuno-room-games.js','ZunoPlay: Zuno Core da sala indisponível'],
      ['zunoplay-room-moderation','./zuno-room-moderation.js','ZunoPlay: moderação da sala indisponível']
    ].forEach(([id,file,error])=>loadScript(id,file,error));
  }
  function loadRoomGameReturn(){
    if(!roomGamePages.includes(page))return;
    loadScript('zunoplay-room-game-return','./zuno-room-game-return.js','ZunoPlay: retorno para sala indisponível');
  }
  function loadRealtimeCore(){
    if(window.ZunoRealtime){window.ZunoRealtime.start?.().catch?.(console.error);return}
    loadScript('zunoplay-realtime-global','./realtime-global.js','ZunoPlay: realtime indisponível');
  }
  function loadRoomVoice(){if(page==='sala.html')loadScript('zunoplay-room-voice','./voz-sala.js','ZunoPlay: voz da sala indisponível')}
  function loadRoomSessionGuard(){
    if(page==='sala.html'){
      loadScript('zunoplay-room-session-guard','./room-session-guard.js','ZunoPlay: sessão de sala indisponível');
      return;
    }
    if(!roomGamePages.includes(page))return;
    const q=new URLSearchParams(location.search);
    const fromRoom=q.get('from')==='sala';
    const roomId=q.get('room')||q.get('room_id')||sessionStorage.getItem('zuno_return_room_id')||sessionStorage.getItem('zunoplay_room_id');
    if(fromRoom&&roomId)loadScript('zunoplay-room-session-guard','./room-session-guard.js','ZunoPlay: sessão de sala indisponível');
  }
  function loadAvatarHomeSync(){loadScript('zunoplay-avatar-home-sync','./avatar-home-sync.js','ZunoPlay: sincronização de avatar indisponível')}
  function loadAvatarRenderer(){
    if(window.ZunoAvatarRenderer){loadAvatarHomeSync();return}
    loadScript('zunoplay-avatar-renderer','./avatar-renderer.js','ZunoPlay: renderizador de avatar indisponível',loadAvatarHomeSync);
  }
  function loadCurrentInterface(){
    loadStyle('zunoplay-current-base-style','./zuno-current-base.css');
    loadScript('zunoplay-current-script','./zuno-current.js','ZunoPlay: interface atual indisponível');
    loadStyle('zunoplay-current-shell-v173','./zuno-current-shell-v173.css');
  }

  function installOfficialLogoStyle(){
    if(document.getElementById('zunoplay-official-logo-style'))return;
    const style=document.createElement('style');style.id='zunoplay-official-logo-style';
    style.textContent=`.zuno-official-logo{display:inline-flex!important;align-items:center!important;gap:.26em!important;line-height:1!important;white-space:nowrap!important;letter-spacing:-.045em!important}.zuno-official-logo-mark{width:1.16em;height:1.06em;flex:0 0 auto;display:block;filter:drop-shadow(0 0 .26em rgba(145,70,255,.52))}.zuno-official-logo-word{font-weight:950;letter-spacing:-.055em;color:#f7f7ff;line-height:1}.zuno-official-logo-word b{font-weight:950;background:linear-gradient(135deg,#ca58ff 0%,#9a39ff 48%,#ef3bc8 100%);-webkit-background-clip:text;background-clip:text;color:transparent}.welcome-logo.zuno-official-logo{justify-content:center;font-size:48px}.brand.zuno-official-logo{font-size:38px}.logo.zuno-official-logo{font-size:inherit}@media(max-width:520px){.brand.zuno-official-logo{font-size:30px}.welcome-logo.zuno-official-logo{font-size:42px}}`;
    document.head.appendChild(style);
  }
  function officialLogoMarkup(){return `<svg class="zuno-official-logo-mark" viewBox="0 0 76 68" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="zlg" x1="8" y1="4" x2="68" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#4fd6ff"/><stop offset=".28" stop-color="#7b4dff"/><stop offset=".64" stop-color="#b62cff"/><stop offset="1" stop-color="#f23ed0"/></linearGradient></defs><rect x="6" y="5" width="64" height="58" rx="15" fill="url(#zlg)" opacity=".98" transform="rotate(-6 38 34)"/><path d="M22 20h38L37 35h18L27 52H15l25-18H22z" fill="#fff"/></svg><span class="zuno-official-logo-word">Zuno<b>Play</b></span>`}
  function mountOfficialLogo(){
    installOfficialLogoStyle();
    document.querySelectorAll('.brand,.welcome-logo,.logo').forEach(el=>{
      if(el.dataset.zunoOfficialLogo==='1')return;
      const text=(el.textContent||'').replace(/\s+/g,'').toLowerCase();
      if(!text.includes('zunoplay')&&!el.classList.contains('brand')&&!el.classList.contains('welcome-logo'))return;
      el.dataset.zunoOfficialLogo='1';el.classList.add('zuno-official-logo');el.innerHTML=officialLogoMarkup();el.setAttribute('aria-label','ZunoPlay');
    });
  }
  function bootstrapRealtime(){
    if(patchSupabaseFactory()){loadRealtimeCore();loadAvatarRenderer();return}
    if(document.getElementById('zunoplay-supabase-sdk'))return;
    const sdk=document.createElement('script');sdk.id='zunoplay-supabase-sdk';sdk.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';sdk.async=true;
    sdk.onload=()=>{if(patchSupabaseFactory()){loadRealtimeCore();loadAvatarRenderer()}};
    sdk.onerror=()=>console.error('ZunoPlay: Supabase indisponível');
    document.head.appendChild(sdk);
  }

  installHomeBootGuard();
  loadDesignSystem();
  loadUnifiedIdentity();
  loadNavigation();
  loadSocialSystem();
  loadGameProgression();
  loadRoomExperience();
  loadRoomGameReturn();
  bootstrapRealtime();
  loadRoomVoice();
  loadRoomSessionGuard();
  loadCurrentInterface();

  const brandReady=()=>{mountOfficialLogo();setTimeout(mountOfficialLogo,250)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',brandReady,{once:true});else brandReady();
})();