(()=>{
  if(window.__ZUNO_TURN_PROVIDER_V3__)return;
  window.__ZUNO_TURN_PROVIDER_V3__=true;

  function emit(status,detail={}){
    const payload={status,at:Date.now(),...detail};
    try{window.dispatchEvent(new CustomEvent('zuno:turn-status',{detail:payload}))}catch(_){}
    const root=document.getElementById('zunoVoiceControls');
    if(root)root.dataset.turnStatus=status;
    let note=document.getElementById('zunoTurnConnectivityNote');
    if(status==='ready'){
      if(note)note.remove();
      return;
    }
    if(!note){
      note=document.createElement('div');
      note.id='zunoTurnConnectivityNote';
      note.setAttribute('role','status');
      note.style.cssText='width:100%;font-size:10px;line-height:1.35;color:#f6c86e;background:#241c0b;border:1px solid #5c4619;border-radius:10px;padding:8px 10px;margin-top:2px';
      (root||document.getElementById('voiceDock')||document.body).appendChild(note);
    }
    note.textContent=status==='unavailable'
      ?'Conectividade de voz limitada: relay TURN indisponível. Em algumas redes o áudio pode não conectar.'
      :'Verificando conectividade de voz…';
  }

  window.ZunoVoiceICEProvider=async({supabase,roomId})=>{
    const sb=supabase||window.ZunoSupabaseClient;
    if(!sb?.functions?.invoke){emit('unavailable',{reason:'functions_unavailable'});throw new Error('Supabase Functions indisponível')}
    if(!roomId){emit('unavailable',{reason:'room_required'});throw new Error('Sala necessária para solicitar TURN')}
    emit('checking',{room_id:roomId});
    try{
      const {data,error}=await sb.functions.invoke('voice-turn',{body:{room_id:roomId}});
      if(error)throw error;
      const iceServers=Array.isArray(data?.iceServers)?data.iceServers:[];
      const hasTurn=iceServers.some(server=>{
        const urls=Array.isArray(server?.urls)?server.urls:[server?.urls];
        return urls.some(url=>typeof url==='string'&&/^turns?:/i.test(url));
      });
      if(!hasTurn)throw new Error('TURN não configurado');
      emit('ready',{room_id:roomId});
      return iceServers;
    }catch(error){
      emit('unavailable',{room_id:roomId,reason:error?.message||'turn_unavailable'});
      throw error;
    }
  };
})();
