(()=>{
  if(window.__ZUNO_TURN_PROVIDER_V1__)return;
  window.__ZUNO_TURN_PROVIDER_V1__=true;

  window.ZunoVoiceICEProvider=async({supabase})=>{
    const sb=supabase||window.ZunoSupabaseClient;
    if(!sb?.functions?.invoke)throw new Error('Supabase Functions indisponível');
    const {data,error}=await sb.functions.invoke('voice-turn');
    if(error)throw error;
    const iceServers=Array.isArray(data?.iceServers)?data.iceServers:[];
    if(!iceServers.some(server=>{
      const urls=Array.isArray(server?.urls)?server.urls:[server?.urls];
      return urls.some(url=>typeof url==='string'&&/^turns?:/i.test(url));
    }))throw new Error('TURN não configurado');
    return iceServers;
  };
})();
