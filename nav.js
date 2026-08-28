(()=>{
if(window.__ZUNOPLAY_GLOBAL_BOOT_V216__)return;window.__ZUNOPLAY_GLOBAL_BOOT_V216__=true;
const V='216',page=(location.pathname.split('/').pop()||'index.html').toLowerCase(),home=page==='index.html',pub=new Set(['login.html','cadastro.html']),social=['amigos.html','conversas.html','comunidades.html','perfil.html','notificacoes.html'],profile=['perfil.html','avatar.html'],rooms=['salas.html','sala.html'],games=['jogos.html','historico.html','zuno-stack.html'],roomGames=['zuno-stack.html'];
const ver=f=>f+(f.includes('?')?'&':'?')+'v='+V;
function css(id,f){if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=new URL(ver(f),location.href).href;document.head.appendChild(l)}
function js(id,f,done){const old=document.getElementById(id);if(old){if(old.dataset.loaded==='1')done?.();else if(done)old.addEventListener('load',done,{once:true});return}const s=document.createElement('script');s.id=id;s.src=new URL(ver(f),location.href).href;s.defer=true;s.onload=()=>{s.dataset.loaded='1';done?.()};s.onerror=()=>console.error('ZunoPlay: falha ao carregar '+f);document.head.appendChild(s)}
if(window.supabase?.createClient&&!window.ZunoSupabaseClient){try{const originalCreate=window.supabase.createClient.bind(window.supabase);const canonical=originalCreate('https://rliymfbbhqoejgfvsbuu.supabase.co','sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.ZunoSupabaseClient=canonical;if(page==='sala.html'){window.supabase.createClient=(url,key,options)=>{if(url==='https://rliymfbbhqoejgfvsbuu.supabase.co'&&key==='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0')return canonical;return originalCreate(url,key,options)}}}catch(e){console.error('ZunoPlay: Supabase bootstrap',e)}}
if(!home&&!pub.has(page)){css('zunoplay-global-chrome-style','./zuno-global-chrome.css');js('zunoplay-global-chrome-script','./zuno-global-chrome.js')}
if(social.includes(page)){css('zunoplay-social-style','./zuno-social.css');js('zunoplay-social-script','./zuno-social.js')}
if(games.includes(page)){css('zunoplay-game-progression-style','./zuno-game-progression.css');js('zunoplay-game-progression','./zuno-game-progression.js')}
if(!home&&!pub.has(page)&&page!=='sala.html')css('zunoplay-ui-components','./zuno-ui-components.css');
if(profile.includes(page)){css('zunoplay-profile-avatar-stage5-style','./zuno-profile-avatar-stage5.css');js('zunoplay-profile-avatar-stage5-script','./zuno-profile-avatar-stage5.js')}
if(page==='sala.html'){
 css('zunoplay-room-stage5','./zuno-room-experience.css');css('zunoplay-room-fit','./zuno-room-fit.css');css('zunoplay-room-extras','./zuno-room-extras.css');
 js('zunoplay-room-connection-fix','./zuno-room-connection-fix.js');
 js('zunoplay-realtime-global','./realtime-global.js',()=>{js('zunoplay-room-session-guard','./room-session-guard.js');js('zunoplay-room-experience-stage5','./zuno-room-experience.js');js('zunoplay-room-voice','./voz-sala.js')});
}else{js('zunoplay-realtime-global','./realtime-global.js');if(roomGames.includes(page))js('zunoplay-room-game-return','./zuno-room-game-return.js')}
if(rooms.includes(page)){css('zunoplay-rooms-stage6-style','./zuno-rooms-stage6.css');js('zunoplay-rooms-stage6-script','./zuno-rooms-stage6.js')}
if(games.includes(page)){css('zunoplay-games-stage7-style','./zuno-games-stage7.css');js('zunoplay-games-stage7-script','./zuno-games-stage7.js')}
if(!pub.has(page)){css('zunoplay-final-audit-style','./zuno-final-audit.css');js('zunoplay-final-audit-script','./zuno-final-audit.js')}
js('zunoplay-avatar-renderer','./avatar-renderer.js',()=>js('zunoplay-avatar-home-sync','./avatar-home-sync.js'));if(!pub.has(page))js('zunoplay-integration-phase4','./zuno-integration-phase4.js');
if(page==='sala.html'){css('zunoplay-voice-room-official-style','./zuno-voice-room-official.css');js('zunoplay-voice-room-official-script','./zuno-voice-room-official.js')}
})();