(()=>{
  if(window.__ZUNO_OFFICIAL_AVATARS_V1__)return;
  window.__ZUNO_OFFICIAL_AVATARS_V1__=true;
  const STYLE='zuno-studio-v1';
  const PROFILE_TTL=30000;
  const cache=new Map();
  const inflight=new Map();
  const clone=v=>v?JSON.parse(JSON.stringify(v)):v;
  const profileId=p=>String(p?.id||p?.user_id||p?.other_user_id||'');
  const validConfig=v=>!!v&&v.style===STYLE;
  const getClient=()=>window.ZunoSupabaseClient||window.__zunoSupabaseClient||window.supabaseClient||null;

  async function waitRenderer(){
    for(let i=0;i<60;i++){
      if(window.ZunoAvatarRenderer?.mount&&window.ZunoAvatarRenderer?.officialImage)return window.ZunoAvatarRenderer;
      await new Promise(r=>setTimeout(r,50));
    }
    return window.ZunoAvatarRenderer||null;
  }

  function modelFrom(profile){
    const raw=String(profile?.model||profile?.sex||profile?.gender||'').toLowerCase();
    return ['f','female','feminino','feminina','mulher','woman'].includes(raw)?'feminino':'masculino';
  }

  async function fetchProfile(id){
    if(!id)return null;
    const now=Date.now(),hit=cache.get(id);
    if(hit&&now-hit.at<PROFILE_TTL)return clone(hit.profile);
    if(inflight.has(id))return clone(await inflight.get(id));
    const job=(async()=>{
      const sb=getClient();
      if(!sb)return null;
      const {data,error}=await sb.from('profiles').select('id,username,avatar_url,avatar_config,sex').eq('id',id).maybeSingle();
      if(error){console.warn('[Zuno official avatars] profile',error);return null}
      if(data)cache.set(id,{at:Date.now(),profile:data});
      return data||null;
    })().finally(()=>inflight.delete(id));
    inflight.set(id,job);
    return clone(await job);
  }

  async function enrich(profile){
    const p={...(profile||{})},id=profileId(p);
    const complete=Object.prototype.hasOwnProperty.call(p,'avatar_config')&&Object.prototype.hasOwnProperty.call(p,'sex');
    if(id&&!complete){
      const cloud=await fetchProfile(id);
      if(cloud)Object.assign(p,cloud,{...p,id:cloud.id||p.id});
    }
    return p;
  }

  async function currentUserId(){
    try{return (await getClient()?.auth?.getSession?.())?.data?.session?.user?.id||''}catch(_){return''}
  }

  async function displayConfig(profile,opts={}){
    const renderer=await waitRenderer();
    if(!renderer)return null;
    const p=await enrich(profile);
    let cfg=validConfig(p.avatar_config)?renderer.normalize?.(p.avatar_config):null;
    if(!cfg){
      const id=profileId(p),me=await currentUserId();
      if(id&&me&&id===me){
        try{
          const local=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');
          if(validConfig(local))cfg=renderer.normalize?.(local)||local;
        }catch(_){}
      }
    }
    const hasLegacy=!!p.avatar_url;
    if(!cfg&&hasLegacy&&!opts.forceOfficial)return{profile:p,config:null,legacy:p.avatar_url,kind:'legacy'};
    if(!cfg){
      const source=renderer.official?.[modelFrom(p)]||renderer.defaults;
      cfg=renderer.normalize?.(clone(source))||clone(source);
    }
    if(!cfg)return{profile:p,config:null,legacy:p.avatar_url||'',kind:p.avatar_url?'legacy':'none'};
    cfg=clone(cfg);
    cfg.mode=opts.mode||cfg.mode||'Perfil';
    cfg.selections={...(cfg.selections||{})};
    if(opts.hideMascot!==false)cfg.selections.Mascote=0;
    if(opts.hideEffects!==false)cfg.selections.Efeitos=0;
    cfg=renderer.normalize?.(cfg)||cfg;
    return{profile:p,config:cfg,legacy:'',kind:'official'};
  }

  async function resolve(profile,opts={}){
    const renderer=await waitRenderer();
    const d=await displayConfig(profile,opts);
    if(!d)return profile?.avatar_url||'';
    if(d.kind==='legacy')return d.legacy||'';
    if(d.kind!=='official'||!renderer?.officialImage||!renderer?.officialComposite)return d.legacy||'';
    try{
      const src=await renderer.officialImage(d.config.model);
      return renderer.officialComposite(d.config,src,opts.surface||surfaceFromMode(d.config.mode));
    }catch(e){
      console.warn('[Zuno official avatars] resolve',e);
      return d.profile?.avatar_url||'';
    }
  }

  function surfaceFromMode(mode){
    if(mode==='Sala de voz')return'room';
    if(mode==='Perfil')return'profile';
    return'mini';
  }

  async function mount(img,profile,opts={}){
    if(!img)return false;
    const renderer=await waitRenderer(),d=await displayConfig(profile,opts),id=profileId(d?.profile||profile);
    if(id)img.dataset.zunoProfileId=id;
    img.dataset.zunoOfficialAvatar='1';
    if(!d)return false;
    if(d.kind==='official'&&renderer?.mount){
      img.dataset.zunoOfficialAvatarKind='official';
      return renderer.mount(img,d.config)!==false;
    }
    if(d.kind==='legacy'&&d.legacy){
      img.dataset.zunoOfficialAvatarKind='legacy';
      img.alt=img.alt||'Avatar ZunoPlay';
      if(img.src!==d.legacy)img.src=d.legacy;
      return true;
    }
    return false;
  }

  function invalidate(id){if(id)cache.delete(String(id));else cache.clear()}
  const api={version:1,resolve,mount,enrich,fetchProfile,invalidate,displayConfig};
  window.ZunoOfficialAvatars=api;
  window.dispatchEvent(new CustomEvent('zuno:official-avatars-ready',{detail:{version:1}}));
})();