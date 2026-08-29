(()=>{
  if(window.__ZUNO_TURN_PROVIDER_V2__)return;
  window.__ZUNO_TURN_PROVIDER_V2__=true;

  window.ZunoVoiceICEProvider=async({supabase,roomId})=>{
    const sb=supabase||window.ZunoSupabaseClient;
    if(!sb?.functions?.invoke)throw new Error('Supabase Functions indisponível');
    if(!roomId)throw new Error('Sala necessária para solicitar TURN');
    const {data,error}=await sb.functions.invoke('voice-turn',{body:{room_id:roomId}});
    if(error)throw error;
    const iceServers=Array.isArray(data?.iceServers)?data.iceServers:[];
    if(!iceServers.some(server=>{
      const urls=Array.isArray(server?.urls)?server.urls:[server?.urls];
      return urls.some(url=>typeof url==='string'&&/^turns?:/i.test(url));
    }))throw new Error('TURN não configurado');
    return iceServers;
  };
})();
