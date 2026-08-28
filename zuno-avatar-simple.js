(()=>{
  if(window.__ZUNO_AVATAR_SIMPLE_V1__)return;
  window.__ZUNO_AVATAR_SIMPLE_V1__=1;
  const STYLE='zuno-studio-v1';
  const SUPABASE_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SUPABASE_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const preview=$('#simpleAvatarPreview'),status=$('#simpleAvatarStatus'),save=$('#simpleAvatarSave'),toast=$('#simpleAvatarToast');
  let model='masculino',mascot=1,sb=null,booted=false;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function renderer(){return window.ZunoAvatarRenderer||null}
  function fixedConfig(nextModel=model,nextMascot=mascot){
    const r=renderer();
    const base=clone(r?.official?.[nextModel]||r?.defaults||{style:STYLE,model:nextModel,selections:{},colors:{}});
    base.style=STYLE;base.model=nextModel;base.mode='Corpo inteiro';base.rotation=0;base.zoom=1;base.updatedAt=null;
    base.selections={...(base.selections||{}),Acessórios:0,Mascote:Number(nextMascot)||0,Efeitos:1};
    return r?.normalize?.(base)||base;
  }
  function miniConfig(nextModel){const c=fixedConfig(nextModel,0);c.mode='Corpo inteiro';return renderer()?.normalize?.(c)||c}
  function show(msg){if(!toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(show.t);show.t=setTimeout(()=>toast.classList.remove('show'),1700)}
  function setStatus(text,type=''){if(!status)return;status.textContent=text;status.className='avatar-status'+(type?' '+type:'')}
  function render(){
    const r=renderer();if(!r?.mount)return;
    r.mount(preview,fixedConfig());
    r.mount($('#simpleMaleThumb'),miniConfig('masculino'));r.mount($('#simpleFemaleThumb'),miniConfig('feminino'));
    $$('.avatar-choice').forEach(b=>b.classList.toggle('is-active',b.dataset.model===model));
    $$('.mascot-option').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.mascot)===mascot));
    const name=$('#simpleAvatarName');if(name)name.textContent=model==='feminino'?'Zuno Feminino':'Zuno Masculino';
  }
  function readLocal(){try{const raw=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null');if(raw?.style===STYLE){model=raw.model==='feminino'?'feminino':'masculino';mascot=Math.max(0,Math.min(3,Number(raw.selections?.Mascote)||0));return true}}catch(_){}return false}
  async function cloudClient(){if(sb)return sb;if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;if(window.supabase?.createClient){sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}return null}
  async function loadCloud(){
    try{const client=await cloudClient();if(!client)return;const {data:{session}}=await client.auth.getSession();const user=session?.user;if(!user)return;const {data,error}=await client.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();if(error)throw error;const raw=data?.avatar_config;if(raw?.style===STYLE){model=raw.model==='feminino'?'feminino':'masculino';mascot=Math.max(0,Math.min(3,Number(raw.selections?.Mascote)||0));const cfg=fixedConfig();localStorage.setItem('zunoAvatarPreset',JSON.stringify(cfg));render()}}catch(e){console.warn('Zuno Avatar Studio load:',e)}}
  async function persist(){
    const cfg=fixedConfig();cfg.updatedAt=new Date().toISOString();save.disabled=true;setStatus('Salvando...');
    try{
      localStorage.setItem('zunoAvatarPreset',JSON.stringify(cfg));
      const client=await cloudClient();if(client){const {data:{session}}=await client.auth.getSession();const user=session?.user;if(user){const {error}=await client.from('profiles').update({avatar_config:cfg}).eq('id',user.id);if(error)throw error}}
      window.dispatchEvent(new CustomEvent('zuno-avatar-saved',{detail:cfg}));setStatus('Avatar salvo na sua conta','ok');show('Seu Zuno foi salvo');
    }catch(e){console.error('Zuno Avatar Studio save:',e);setStatus('Não foi possível salvar agora','err');show('Falha ao salvar. Tente novamente.')}
    finally{save.disabled=false}
  }
  function bind(){
    $$('.avatar-choice').forEach(b=>b.addEventListener('click',()=>{model=b.dataset.model==='feminino'?'feminino':'masculino';render()}));
    $$('.mascot-option').forEach(b=>b.addEventListener('click',()=>{mascot=Math.max(0,Math.min(3,Number(b.dataset.mascot)||0));render()}));
    save?.addEventListener('click',persist);
  }
  function boot(){if(booted||!renderer()?.mount)return;booted=true;readLocal();bind();render();loadCloud().finally(()=>setStatus('Escolha seu avatar e mascote'))}
  window.addEventListener('zuno-avatar-renderer-ready',boot);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();