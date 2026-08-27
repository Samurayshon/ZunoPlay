(()=>{
  if(window.ZunoRealtime){window.ZunoRealtime.start?.().catch?.(console.error);return}

  const URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const listeners=new Map();
  const scopes=new Map();
  let client=window.ZunoSupabaseClient||null;
  let globalPresence=null;
  let user=null;
  let startPromise=null;
  let globalStatus='offline';

  function emit(name,payload){
    listeners.get(name)?.forEach(fn=>{try{fn(payload)}catch(error){console.error('ZunoRealtime listener',error)}});
    try{window.dispatchEvent(new CustomEvent('zuno:'+name,{detail:payload}))}catch(_){}
  }

  function on(name,fn){
    if(!listeners.has(name))listeners.set(name,new Set());
    listeners.get(name).add(fn);
    return()=>listeners.get(name)?.delete(fn);
  }

  function getClient(){
    if(client)return client;
    if(window.ZunoSupabaseClient){client=window.ZunoSupabaseClient;return client}
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(URL,KEY);
    window.ZunoSupabaseClient=client;
    return client;
  }

  async function removeScope(id,channel){
    const sb=getClient();
    if(!sb)return;
    try{await channel.untrack?.()}catch(_){}
    try{await sb.removeChannel(channel)}catch(_){}
    scopes.delete(id);
  }

  async function stopGlobalPresence(){
    const sb=getClient();
    if(!sb||!globalPresence)return;
    try{await globalPresence.untrack()}catch(_){}
    try{await sb.removeChannel(globalPresence)}catch(_){}
    globalPresence=null;
    globalStatus='offline';
  }

  async function start(){
    if(startPromise)return startPromise;
    startPromise=(async()=>{
      const sb=getClient();
      if(!sb){emit('error',new Error('Supabase indisponível'));return null}
      const{data,error}=await sb.auth.getSession();
      if(error){emit('error',error);return null}
      user=data?.session?.user||null;
      if(!user){globalStatus='offline';emit('auth:none',null);return null}
      if(globalPresence)return user;

      await sb.realtime.setAuth();
      globalPresence=sb.channel('zuno-global-presence',{config:{private:true,presence:{key:user.id}}});
      globalPresence
        .on('presence',{event:'sync'},()=>emit('presence:sync',globalPresence.presenceState()))
        .on('presence',{event:'join'},payload=>emit('presence:join',payload))
        .on('presence',{event:'leave'},payload=>emit('presence:leave',payload))
        .subscribe(async status=>{
          emit('connection',status);
          if(status==='SUBSCRIBED'){
            globalStatus='online';
            await globalPresence.track({user_id:user.id,status:'online',page:location.pathname.split('/').pop()||'index.html',at:new Date().toISOString()});
            emit('ready',user);
          }
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')globalStatus='offline';
        });
      return user;
    })().finally(()=>{startPromise=null});
    return startPromise;
  }

  async function setPresence(status,extra={}){
    if(!globalPresence)await start();
    if(!globalPresence||!user)return false;
    globalStatus=status;
    await globalPresence.track({user_id:user.id,status,page:location.pathname.split('/').pop()||'index.html',at:new Date().toISOString(),...extra});
    emit('presence:self',{status,...extra});
    return true;
  }

  function scopedPresence(topic,key,payload={}){
    const sb=getClient();
    if(!sb)throw new Error('Supabase indisponível');
    const id='presence:'+topic+':'+key;
    if(scopes.has(id))return scopes.get(id);
    const channel=sb.channel(topic,{config:{private:true,presence:{key}}});
    const api={
      type:'presence',topic,channel,
      on(event,fn){channel.on('presence',{event},fn);return api},
      async subscribe(){
        await sb.realtime.setAuth();
        return new Promise((resolve,reject)=>{
          channel.subscribe(async status=>{
            if(status==='SUBSCRIBED'){
              try{await channel.track(payload);resolve(api)}catch(error){reject(error)}
            }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Falha no Presence: '+status));
          })
        })
      },
      track(next){return channel.track(next)},
      state(){return channel.presenceState()},
      close(){return removeScope(id,channel)}
    };
    scopes.set(id,api);
    return api;
  }

  function scopedBroadcast(topic,options={}){
    const sb=getClient();
    if(!sb)throw new Error('Supabase indisponível');
    const config={
      private:options.private===true,
      broadcast:{self:options.self===true,ack:options.ack===true}
    };
    const id='broadcast:'+topic+':'+JSON.stringify(config);
    if(scopes.has(id))return scopes.get(id);
    const channel=sb.channel(topic,{config});
    let subscribed=false;
    const api={
      type:'broadcast',topic,channel,
      on(event,fn){channel.on('broadcast',{event},fn);return api},
      async subscribe(){
        if(subscribed)return api;
        if(config.private)await sb.realtime.setAuth();
        return new Promise((resolve,reject)=>{
          channel.subscribe(status=>{
            if(status==='SUBSCRIBED'){subscribed=true;resolve(api)}
            else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Falha no Broadcast: '+status));
          })
        })
      },
      async send(event,payload={}){
        if(!subscribed)await api.subscribe();
        if(event&&typeof event==='object'){
          const packet=event;
          return channel.send({type:'broadcast',event:packet.event,payload:packet.payload||{}});
        }
        return channel.send({type:'broadcast',event,payload});
      },
      close(){subscribed=false;return removeScope(id,channel)}
    };
    scopes.set(id,api);
    return api;
  }

  function databaseSubscribe({table,event='*',schema='public',filter,channelName},handler){
    const sb=getClient();
    if(!sb)throw new Error('Supabase indisponível');
    if(!table)throw new Error('Tabela obrigatória');
    const name=channelName||['zuno-db',table,event,filter||'all',crypto.randomUUID?.()||Date.now()].join('-');
    const channel=sb.channel(name);
    const rule={event,schema,table};
    if(filter)rule.filter=filter;
    channel.on('postgres_changes',rule,handler);
    let subscribed=false;
    return{
      type:'database',channel,
      subscribe(){
        if(subscribed)return Promise.resolve(this);
        return new Promise((resolve,reject)=>channel.subscribe(status=>{
          if(status==='SUBSCRIBED'){subscribed=true;resolve(this)}
          else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Falha no Postgres Changes: '+status));
        }));
      },
      async close(){subscribed=false;try{await sb.removeChannel(channel)}catch(_){}}
    };
  }

  const api={
    get client(){return getClient()},
    events:{on,emit},
    start,
    stop:stopGlobalPresence,
    setPresence,
    getUser:()=>user,
    getPresence:()=>globalPresence?.presenceState()||{},
    getStatus:()=>globalStatus,
    presence:{scope:scopedPresence},
    broadcast:{scope:scopedBroadcast},
    database:{subscribe:databaseSubscribe}
  };

  window.ZunoRealtime=api;
  window.dispatchEvent(new CustomEvent('zuno:realtime-installed',{detail:api}));

  const sb=getClient();
  if(sb){
    sb.auth.onAuthStateChange(async(event,session)=>{
      if(event==='SIGNED_OUT'){
        user=null;
        await stopGlobalPresence();
        for(const scope of [...scopes.values()]){try{await scope.close?.()}catch(_){}}
        emit('auth:signed_out',null);
      }else if(session?.user&&(!user||session.user.id!==user.id)){
        user=session.user;
        await stopGlobalPresence();
        start().catch(error=>emit('error',error));
      }
    });
  }

  start().catch(error=>emit('error',error));
})();