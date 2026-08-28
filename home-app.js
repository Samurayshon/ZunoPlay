(()=>{
  'use strict';
  const SUPABASE_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SUPABASE_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const supabaseClient=window.ZunoSupabaseClient||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  window.ZunoSupabaseClient=window.ZunoSupabaseClient||supabaseClient;
  const $=id=>document.getElementById(id);
  const loading=$('loading'),app=$('app'),welcomeScreen=$('welcomeScreen'),homeScreen=$('homeScreen'),bottomNav=$('bottomNav');
  let currentUser=null,currentProfile=null,friendProfiles=[],notificationChannel=null,homeLiveChannel=null,messageBroadcast=null,searchTimer=null,searchSeq=0,homeRevealTimer=0,homeRevealStartedAt=0;

  function esc(v){const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML}
  function safeAvatar(v){const s=String(v||'');return /^(data:image\/(?:svg\+xml|png|jpeg|webp);|https:\/\/)/i.test(s)?s:''}
  function avatarHTML(p,cls='friend-avatar'){const src=safeAvatar(p?.avatar_url),name=p?.username||'?';return src?'<img class="'+cls+'" src="'+esc(src)+'" alt="Avatar de '+esc(name)+'">':'<div class="'+cls+' friend-avatar-fallback">'+esc(name.charAt(0).toUpperCase())+'</div>'}
  function setBadge(id,value){const el=$(id);if(!el)return;const n=Number(value)||0;if(n>0){el.textContent=n>99?'99+':String(n);el.style.display='flex'}else{el.textContent='';el.style.display='none'}}
  function playerName(){const p=currentProfile||{},m=currentUser?.user_metadata||{};return String(p.username||m.username||m.display_name||m.full_name||m.name||currentUser?.email?.split('@')[0]||'ZunoPlayer').trim()||'ZunoPlayer'}
  function syncPlayerName(){const el=$('username');if(!el)return;const name=playerName();el.textContent=name;el.dataset.playerName='1';el.setAttribute('title',name);window.dispatchEvent(new CustomEvent('zuno:player-name-ready',{detail:{name}}))}

  function hideLoading(){if(loading)loading.style.display='none'}
  function markHomeUsable(){
    if(!homeScreen)return false;
    const currentRuntime=!!window.__ZUNOPLAY_CURRENT_HOME__||document.body?.classList.contains('zuno-official-v33')||document.documentElement.dataset.zunoInterface==='current';
    if(currentRuntime&&document.documentElement.dataset.zunoHomeCurrentReady!=='1')document.documentElement.dataset.zunoHomeCurrentReady='1';
    return document.documentElement.dataset.zunoHomeCurrentReady==='1';
  }
  function showWelcome(){
    clearTimeout(homeRevealTimer);homeRevealStartedAt=0;
    app.style.display='block';welcomeScreen.style.display='flex';homeScreen.style.display='none';if(bottomNav)bottomNav.style.display='none';
    hideLoading();
  }
  function revealCurrentHome(){
    if(!currentUser)return;
    if(!homeRevealStartedAt)homeRevealStartedAt=performance.now();
    if(markHomeUsable()||document.documentElement.dataset.zunoAppReady==='1'){
      clearTimeout(homeRevealTimer);homeRevealStartedAt=0;
      document.documentElement.dataset.zunoAppReady='1';
      hideLoading();
      return;
    }
    if(performance.now()-homeRevealStartedAt>1800){
      document.documentElement.dataset.zunoHomeCurrentReady='1';
      document.documentElement.dataset.zunoAppReady='1';
      clearTimeout(homeRevealTimer);homeRevealStartedAt=0;hideLoading();return;
    }
    clearTimeout(homeRevealTimer);homeRevealTimer=setTimeout(revealCurrentHome,32);
  }
  function showHome({resume=false}={}){
    app.style.display='block';welcomeScreen.style.display='none';homeScreen.style.display='block';if(bottomNav)bottomNav.style.display='grid';syncPlayerName();
    const alreadyReady=markHomeUsable()||document.documentElement.dataset.zunoAppReady==='1';
    if(loading)loading.style.display=alreadyReady||resume?'none':'flex';
    if(!alreadyReady&&!resume&&loading?.firstChild)loading.firstChild.textContent='Carregando ZunoPlay';
    if(alreadyReady||resume){document.documentElement.dataset.zunoAppReady='1';hideLoading()}else revealCurrentHome();
  }
  function restoreHomeFromLifecycle(){
    if(!currentUser)return;
    markHomeUsable();showHome({resume:true});
    window.ZunoBrand?.refresh?.();
    window.dispatchEvent(new CustomEvent('zuno:home-resumed'));
  }
  window.addEventListener('zuno:home-current-ready',()=>{syncPlayerName();revealCurrentHome()});
  window.addEventListener('pageshow',()=>{setTimeout(restoreHomeFromLifecycle,0)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(restoreHomeFromLifecycle,0)});
  window.addEventListener('focus',()=>setTimeout(restoreHomeFromLifecycle,0));

  function auraFor(level){if(level>=10)return'Lenda Zuno';if(level>=8)return'Guardião Estelar';if(level>=6)return'Mestre Cósmico';if(level>=4)return'Explorador Astral';if(level>=2)return'Aventureiro';return'Explorador'}
  function renderProfile(){
    const p=currentProfile||{},level=Math.max(1,Math.min(10,Number(p.level)||1));
    syncPlayerName();$('coinCount').textContent=Number(p.coins||0).toLocaleString('pt-BR');$('auraEmblem').dataset.level=level;$('auraTitle').textContent=auraFor(level);$('levelProgress').style.width=(level*10)+'%';$('levelProgressText').textContent='Nível '+level+' de 10';const challenge=$('challengeBadge');if(challenge)challenge.textContent='N'+level;
  }
  async function loadProfile(){const{data,error}=await supabaseClient.from('profiles').select('id,username,sex,level,coins').eq('id',currentUser.id).maybeSingle();if(error){console.error('Perfil:',error);syncPlayerName();return}if(data)currentProfile=data;renderProfile()}
  async function loadNotifications(){const{count,error}=await supabaseClient.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id).neq('type','message').is('read_at',null);if(!error)setBadge('notificationBadge',count)}
  async function loadUnreadMessages(){const{count,error}=await supabaseClient.from('messages').select('id',{count:'exact',head:true}).eq('receiver_id',currentUser.id).is('read_at',null);if(!error)setBadge('messagesBadge',count)}
  async function loadCommunityCount(){const{count,error}=await supabaseClient.from('community_members').select('community_id',{count:'exact',head:true}).eq('user_id',currentUser.id);if(!error)setBadge('communitiesBadge',count)}
  async function loadHistoryCount(){const{count,error}=await supabaseClient.from('game_scores').select('id',{count:'exact',head:true}).eq('user_id',currentUser.id);if(!error)setBadge('historyBadge',count)}
  function presenceMap(){return window.ZunoRealtime?.getPresence?.()||{}}
  function renderFriends(){const state=presenceMap(),online=new Set(Object.keys(state)),onlyOnline=friendProfiles.filter(p=>online.has(p.id));const strip=$('friendsStrip');if(!strip)return;strip.innerHTML='';if(!onlyOnline.length){const empty=document.createElement('div');empty.className='empty-friends';empty.textContent='Nenhum amigo online agora.';strip.appendChild(empty)}onlyOnline.slice(0,7).forEach(p=>{const el=document.createElement('button');el.type='button';el.className='friend';el.onclick=()=>location.href='perfil.html?user='+encodeURIComponent(p.id);el.innerHTML='<div class="friend-avatar-wrap">'+avatarHTML(p)+'<span class="friend-status"></span></div><div class="friend-name">'+esc(p.username||'Usuário')+'</div>';strip.appendChild(el)});const invite=document.createElement('button');invite.type='button';invite.className='friend invite';invite.onclick=()=>location.href='amigos.html';invite.innerHTML='<div class="friend-avatar-wrap">+</div><div class="friend-name">Convidar</div>';strip.appendChild(invite);$('onlineCount').textContent=String(onlyOnline.length)}
  async function loadFriends(){const{data,error}=await supabaseClient.from('friendships').select('user_id,friend_id').or('user_id.eq.'+currentUser.id+',friend_id.eq.'+currentUser.id);if(error){console.error('Amigos:',error);return}const ids=[...new Set((data||[]).map(f=>f.user_id===currentUser.id?f.friend_id:f.user_id))];if(!ids.length){friendProfiles=[];renderFriends();return}const r=await supabaseClient.from('profiles').select('id,username,avatar_url').in('id',ids);if(r.error){console.error('Perfis de amigos:',r.error);return}friendProfiles=r.data||[];renderFriends()}
  async function enterRoom(roomId){if(!currentUser||!roomId)return;try{const{error}=await supabaseClient.rpc('join_room_session',{p_room_id:roomId});if(error){const msg=String(error.message||'');if(msg.includes('room_full'))alert('Esta sala está lotada. Os 8 assentos estão ocupados.');else{console.error('Entrar na sala:',error);alert('Não foi possível entrar na sala agora.')}return}location.href='sala.html?room='+encodeURIComponent(roomId)}catch(error){console.error(error);alert('Não foi possível entrar na sala agora.')}}
  async function loadRooms(){const{data,error}=await supabaseClient.from('rooms').select('id,name,created_at,room_members(count)').order('created_at',{ascending:false}).limit(20);const box=$('activeRooms');if(!box)return;if(error){console.error('Salas:',error);box.innerHTML='<div class="empty-inline">Não foi possível carregar as salas.</div>';return}const active=(data||[]).filter(r=>Number(r.room_members?.[0]?.count||0)>0);setBadge('roomsBadge',active.length);box.innerHTML='';if(!active.length){box.innerHTML='<div class="empty-inline">Nenhuma sala com participantes agora.</div>';return}active.slice(0,3).forEach(r=>{const count=Number(r.room_members?.[0]?.count||0),b=document.createElement('button');b.type='button';b.className='room-card';b.onclick=()=>enterRoom(r.id);b.innerHTML='<div class="room-name">'+esc(r.name||'Sala Zuno')+'</div><div class="room-meta">Ao vivo agora</div><div class="room-count">👥 '+count+' participante'+(count===1?'':'s')+'</div>';box.appendChild(b)})}
  async function loadDashboard(){await Promise.allSettled([loadProfile(),loadNotifications(),loadUnreadMessages(),loadCommunityCount(),loadHistoryCount(),loadFriends(),loadRooms()])}

  function openSearch(){$('searchBackdrop').classList.add('open');$('searchInput').value='';$('searchResults').innerHTML='<div class="search-empty">Digite pelo menos 2 caracteres para buscar.</div>';setTimeout(()=>$('searchInput').focus(),20)}
  function closeSearch(){$('searchBackdrop').classList.remove('open');searchSeq++}
  function searchAvatar(p){const src=safeAvatar(p.avatar_url),letter=esc((p.username||'?').charAt(0).toUpperCase());return src?'<img class="search-result-avatar" src="'+esc(src)+'" alt="">':'<div class="search-result-avatar">'+letter+'</div>'}
  async function runSearch(raw){const q=String(raw||'').trim().slice(0,40),seq=++searchSeq,box=$('searchResults');if(q.length<2){box.innerHTML='<div class="search-empty">Digite pelo menos 2 caracteres para buscar.</div>';return}box.innerHTML='<div class="search-empty">Buscando...</div>';const safe=q.replace(/[%_]/g,'');if(safe.length<2)return;const [profilesRes,roomsRes]=await Promise.all([supabaseClient.from('profiles').select('id,username,avatar_url').ilike('username','%'+safe+'%').neq('id',currentUser.id).limit(8),supabaseClient.from('rooms').select('id,name,room_members(count)').ilike('name','%'+safe+'%').limit(6)]);if(seq!==searchSeq)return;const profiles=profilesRes.data||[],rooms=roomsRes.data||[];box.innerHTML='';if(profiles.length){const label=document.createElement('div');label.className='search-label';label.textContent='Pessoas';box.appendChild(label);profiles.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='search-result';b.onclick=()=>location.href='perfil.html?user='+encodeURIComponent(p.id);b.innerHTML=searchAvatar(p)+'<div class="search-result-main"><div class="search-result-title">@'+esc(p.username||'Usuário')+'</div><div class="search-result-sub">Ver perfil</div></div>';box.appendChild(b)})}if(rooms.length){const label=document.createElement('div');label.className='search-label';label.textContent='Salas';box.appendChild(label);rooms.forEach(r=>{const count=Number(r.room_members?.[0]?.count||0),b=document.createElement('button');b.type='button';b.className='search-result';b.onclick=()=>enterRoom(r.id);b.innerHTML='<div class="search-room-icon">♩</div><div class="search-result-main"><div class="search-result-title">'+esc(r.name||'Sala Zuno')+'</div><div class="search-result-sub">'+count+' participante'+(count===1?'':'s')+'</div></div>';box.appendChild(b)})}if(!profiles.length&&!rooms.length)box.innerHTML='<div class="search-empty">Nenhum resultado encontrado.</div>'}

  $('searchButton').onclick=openSearch;$('searchClose').onclick=closeSearch;$('searchBackdrop').addEventListener('click',e=>{if(e.target===$('searchBackdrop'))closeSearch()});$('searchInput').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(e.target.value).catch(console.error),260)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('searchBackdrop').classList.contains('open'))closeSearch()});

  async function waitRealtime(){if(window.ZunoRealtime)return window.ZunoRealtime;return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve(window.ZunoRealtime||null)};window.addEventListener('zuno:realtime-installed',finish,{once:true});setTimeout(finish,4500)})}
  async function subscribeLive(){if(notificationChannel)await supabaseClient.removeChannel(notificationChannel);if(homeLiveChannel)await supabaseClient.removeChannel(homeLiveChannel);notificationChannel=supabaseClient.channel('zuno-home-notifications-'+currentUser.id).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},loadNotifications).subscribe();homeLiveChannel=supabaseClient.channel('zuno-home-live-'+currentUser.id).on('postgres_changes',{event:'*',schema:'public',table:'rooms'},loadRooms).on('postgres_changes',{event:'*',schema:'public',table:'room_members'},loadRooms).on('postgres_changes',{event:'*',schema:'public',table:'community_members',filter:'user_id=eq.'+currentUser.id},loadCommunityCount).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+currentUser.id},loadProfile).subscribe();const core=await waitRealtime();if(core){await core.start().catch(()=>{});renderFriends();if(!messageBroadcast){messageBroadcast=core.broadcast.scope('user:'+currentUser.id+':messages',{private:true});messageBroadcast.on('INSERT',loadUnreadMessages);await messageBroadcast.subscribe().catch(()=>{})}}}
  window.addEventListener('zuno:presence:sync',renderFriends);window.addEventListener('zuno:presence:join',renderFriends);window.addEventListener('zuno:presence:leave',renderFriends);

  $('logoutButton').onclick=async()=>{$('logoutButton').disabled=true;$('logoutButton').textContent='Saindo...';try{if(notificationChannel)await supabaseClient.removeChannel(notificationChannel);if(homeLiveChannel)await supabaseClient.removeChannel(homeLiveChannel);if(messageBroadcast)await messageBroadcast.close?.();await supabaseClient.auth.signOut()}finally{location.href='index.html'}};

  async function boot(){try{const{data,error}=await supabaseClient.auth.getSession();if(error)throw error;currentUser=data?.session?.user||null;if(!currentUser){showWelcome();return}showHome();loadDashboard().catch(console.error);subscribeLive().catch(console.error)}catch(e){console.error(e);showWelcome()}}
  supabaseClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;currentProfile=null;closeSearch();showWelcome()}else if((event==='SIGNED_IN'||event==='USER_UPDATED')&&session?.user){currentUser=session.user;syncPlayerName();if(session.user.id!==currentProfile?.id){showHome();loadDashboard().catch(console.error);subscribeLive().catch(console.error)}}});
  window.addEventListener('beforeunload',()=>{if(notificationChannel)supabaseClient.removeChannel(notificationChannel);if(homeLiveChannel)supabaseClient.removeChannel(homeLiveChannel);messageBroadcast?.close?.().catch?.(()=>{})});

  setTimeout(()=>{if(loading?.style.display!=='none'&&currentUser){markHomeUsable();hideLoading();document.documentElement.dataset.zunoAppReady='1'}},2500);

  if('serviceWorker'in navigator){
    window.addEventListener('load',async()=>{
      try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});reg.update().catch(()=>{})}catch(e){console.error(e)}
    });
  }
  boot();
})();