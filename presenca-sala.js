(()=>{
  if(window.__ZUNO_ROOM_PRESENCE__)return;
  window.__ZUNO_ROOM_PRESENCE__=true;

  let scope=null;
  let user=null;
  let currentState={};
  let profilesById={};
  let roomMemberIds=[];
  let directoryLoadedAt=0;
  let bindScheduled=false;
  const q=new URLSearchParams(location.search);
  const room=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');

  const style=document.createElement('style');
  style.textContent='.presence-status{font-size:9px;margin-top:3px;color:#4ade80}.is-speaking .avatar{box-shadow:0 0 0 4px rgba(34,197,94,.22)}.is-away .avatar,.is-offline .avatar{filter:saturate(.45);opacity:.72}.is-away .presence-status{color:#fbbf24}.is-offline .presence-status{color:#858697}';
  document.head.appendChild(style);

  function waitForCore(){
    if(window.ZunoRealtime)return Promise.resolve(window.ZunoRealtime);
    return new Promise((resolve,reject)=>{
      let settled=false;
      const done=()=>{
        if(settled)return;
        if(window.ZunoRealtime){settled=true;resolve(window.ZunoRealtime)}
      };
      window.addEventListener('zuno:realtime-installed',done,{once:true});
      if(!document.getElementById('zunoplay-realtime-global')){
        const script=document.createElement('script');
        script.id='zunoplay-realtime-global';
        script.src=new URL('./realtime-global.js',location.href).href;
        script.async=true;
        script.onerror=()=>{if(!settled){settled=true;reject(new Error('Falha ao carregar realtime-global.js'))}};
        document.head.appendChild(script);
      }
      setTimeout(()=>{if(!settled){if(window.ZunoRealtime){settled=true;resolve(window.ZunoRealtime)}else{settled=true;reject(new Error('ZunoRealtime indisponível'))}}},5000);
    });
  }

  function statusText(value){
    return value==='speaking'?'🎙️ Falando':value==='listening'?'🎧 Ouvindo':value==='away'?'⏸️ Ausente':value==='offline'?'○ Offline':'● Online';
  }

  function applyStatus(id,state){
    const value=state||'offline';
    const selector='.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"],.member[data-user-id="'+CSS.escape(String(id))+'"]';
    document.querySelectorAll(selector).forEach(el=>{
      el.dataset.presence=value;
      el.classList.toggle('is-speaking',value==='speaking');
      el.classList.toggle('is-away',value==='away');
      el.classList.toggle('is-offline',value==='offline');
      const badge=el.querySelector('.presence-status');
      if(badge)badge.textContent=statusText(value);
    });
  }

  async function loadProfiles(ids){
    const missing=[...new Set(ids.filter(Boolean))].filter(id=>!profilesById[id]);
    if(!missing.length)return;
    const core=await waitForCore();
    const{data,error}=await core.client.from('profiles').select('id,username,avatar_url').in('id',missing);
    if(error)return;
    (data||[]).forEach(p=>profilesById[p.id]=p);
  }

  async function refreshDirectory(force=false){
    const memberCount=document.querySelectorAll('.member').length;
    if(!force&&roomMemberIds.length&&memberCount===roomMemberIds.length&&Date.now()-directoryLoadedAt<5000)return;
    const core=await waitForCore();
    const{data,error}=await core.client.from('room_members').select('user_id').eq('room_id',room);
    if(error)return;
    roomMemberIds=[...new Set((data||[]).map(x=>x.user_id).filter(Boolean))];
    await loadProfiles(roomMemberIds);
    directoryLoadedAt=Date.now();
  }

  function usernameOf(el,type){
    const raw=type==='stage'?(el.querySelector('.avatar-name')?.textContent||''):(el.querySelector('.member-name')?.childNodes?.[0]?.textContent||el.querySelector('.member-name')?.textContent||'');
    return raw.trim().replace(/^@/,'').replace(/\s*\(Você\).*$/i,'').toLowerCase();
  }

  function avatarOf(el,type){
    const node=el.querySelector(type==='stage'?'.avatar':'.member-avatar');
    return node?.tagName==='IMG'?(node.getAttribute('src')||''):'';
  }

  function attachMarker(el,id){
    if(!el||!id)return;
    el.dataset.userId=id;
    if(!el.querySelector('.presence-status')){
      const badge=document.createElement('div');
      badge.className='presence-status';
      el.appendChild(badge);
    }
    applyStatus(id,currentState[id]?.[0]?.status||'offline');
  }

  function makeQueues(){
    const exact=new Map(),byName=new Map();
    roomMemberIds.forEach(id=>{
      const p=profilesById[id];
      if(!p?.username)return;
      const name=p.username.trim().toLowerCase();
      const key=name+'|'+String(p.avatar_url||'');
      if(!exact.has(key))exact.set(key,[]);
      if(!byName.has(name))byName.set(name,[]);
      exact.get(key).push(id);
      byName.get(name).push(id);
    });
    return{exact,byName};
  }

  function assignElements(elements,type){
    const{exact,byName}=makeQueues();
    const used=new Set();
    const take=queue=>{
      while(queue?.length){const id=queue.shift();if(!used.has(id)){used.add(id);return id}}
      return null;
    };
    elements.forEach(el=>{
      let id=null;
      const isMe=type==='stage'?el.classList.contains('me'):/\(Você\)/i.test(el.querySelector('.member-name')?.textContent||'');
      if(isMe&&user?.id){id=user.id;used.add(id)}
      if(!id){
        const name=usernameOf(el,type),avatar=avatarOf(el,type);
        id=take(exact.get(name+'|'+avatar))||take(byName.get(name));
      }
      if(id)attachMarker(el,id);
    });
  }

  async function bindInterface(){
    bindScheduled=false;
    await refreshDirectory();
    assignElements([...document.querySelectorAll('.avatar-slot')],'stage');
    assignElements([...document.querySelectorAll('.member')],'member');
  }

  function scheduleBind(){
    if(bindScheduled)return;
    bindScheduled=true;
    requestAnimationFrame(()=>bindInterface().catch(console.error));
  }

  function sync(){
    currentState=scope?.state()||{};
    scheduleBind();
    window.dispatchEvent(new CustomEvent('zuno:room-presence-sync',{detail:currentState}));
  }

  async function start(){
    if(!room||scope)return;
    const core=await waitForCore();
    await core.start();
    user=core.getUser();
    if(!user)return;

    await refreshDirectory(true);
    scope=core.presence.scope('zunoplay-presence-'+room,user.id,{user_id:user.id,room_id:room,status:'online',at:new Date().toISOString()});
    scope
      .on('sync',sync)
      .on('join',({key,newPresences})=>{
        currentState=scope.state();
        scheduleBind();
        window.dispatchEvent(new CustomEvent('zuno:room-presence-join',{detail:{key,newPresences}}));
      })
      .on('leave',({key,leftPresences})=>{
        currentState=scope.state();
        applyStatus(key,'offline');
        scheduleBind();
        window.dispatchEvent(new CustomEvent('zuno:room-presence-leave',{detail:{key,leftPresences}}));
      });

    await scope.subscribe();
    sync();

    const roots=[document.getElementById('roomStage'),document.getElementById('members')].filter(Boolean);
    const observer=new MutationObserver(()=>{directoryLoadedAt=0;scheduleBind()});
    roots.forEach(root=>observer.observe(root,{childList:true,subtree:true}));
  }

  window.zunoSetRoomPresence=async state=>{
    if(!scope)await start();
    if(!scope||!user)return false;
    await scope.track({user_id:user.id,room_id:room,status:state,at:new Date().toISOString()});
    currentState=scope.state();
    applyStatus(user.id,state);
    return true;
  };

  window.ZunoRoomPresence={start,getState:()=>currentState,set:window.zunoSetRoomPresence,getUser:()=>user,refresh:()=>{directoryLoadedAt=0;return bindInterface()}};
  start().catch(error=>console.error('Zuno room presence',error));
  window.addEventListener('beforeunload',()=>{scope?.close?.().catch?.(()=>{})});
})();