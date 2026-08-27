(()=>{
  if(window.__ZUNOPLAY_MODEL6__)return;
  window.__ZUNOPLAY_MODEL6__=true;
  const SB_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SB_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const sb=window.ZunoSupabaseClient||window.supabase.createClient(SB_URL,SB_KEY);
  const $=id=>document.getElementById(id);
  const MODULES=[
    ['Corpo','Aguardando malha Model 6 GLB'],['Pele','Aguardando materiais editáveis'],['Rosto','Aguardando morphs faciais'],['Olhos','Aguardando malha/material de olhos'],['Cabelo','Aguardando peças GLB de cabelo'],['Parte de cima','Aguardando roupas GLB'],['Parte de baixo','Aguardando roupas GLB'],['Calçados','Aguardando calçados GLB'],['Acessórios','Aguardando acessórios GLB']
  ];
  const state={version:12,style:'zuno-model6-reference',modelId:'model6',sex:'masculino',renderMode:'reference-2d',editable3d:false,wardrobeReady:false,source:'user-approved-model6-reference'};

  function normalizeUi(){
    const tag=document.querySelector('.tag');if(tag)tag.textContent='MODEL 6 · v60';
    const desc=document.querySelector('.title p');if(desc)desc.textContent='Referência visual oficial do Model 6. A edição 3D será ativada somente quando a malha Model 6 GLB estiver disponível.';
    const btn=$('save');if(btn)btn.textContent='Usar Model 6';
  }
  function mountModules(){
    const root=$('modules');if(!root)return;root.innerHTML='';
    for(const [name,desc] of MODULES){const row=document.createElement('div');row.className='module-row';const left=document.createElement('div');const title=document.createElement('b');title.textContent=name;const small=document.createElement('small');small.textContent=desc;left.append(title,small);const badge=document.createElement('span');badge.textContent='Pendente GLB';row.append(left,badge);root.appendChild(row)}
  }
  function safeReference(src){
    const value=String(src||'').trim();
    if(!/^data:image\/(?:png|jpeg|webp);base64,/i.test(value))return null;
    if(value.length>1900000)return null;
    return value;
  }
  async function restore(){
    try{
      const {data:{user},error:userError}=await sb.auth.getUser();if(userError||!user)return;
      const {data,error}=await sb.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();if(error)return;
      const cfg=data?.avatar_config;if(cfg?.style==='zuno-model6-reference'&&cfg?.modelId==='model6'){Object.assign(state,cfg);state.version=12;state.renderMode='reference-2d';state.editable3d=false;state.wardrobeReady=false;}
    }catch(error){console.warn('ZunoPlay Model 6 restore',error)}
  }
  async function save(){
    const btn=$('save'),msg=$('msg'),img=$('model6');if(!btn||!msg)return;
    btn.disabled=true;msg.className='msg';msg.textContent='Salvando Model 6...';
    try{
      const {data:{user},error:userError}=await sb.auth.getUser();if(userError||!user)throw new Error('Sessão inválida');
      const avatarUrl=safeReference(img?.src);if(!avatarUrl)throw new Error('Referência do Model 6 inválida ou grande demais');
      const cfg={...state,version:12,renderMode:'reference-2d',editable3d:false,wardrobeReady:false,updatedAt:new Date().toISOString()};
      const {error}=await sb.from('profiles').update({avatar_url:avatarUrl,avatar_config:cfg,sex:cfg.sex}).eq('id',user.id);if(error)throw error;
      msg.textContent='Model 6 definido como personagem atual. ✅';
      window.dispatchEvent(new CustomEvent('zuno:avatar-saved',{detail:{avatar_url:avatarUrl,avatar_config:cfg}}));
    }catch(error){msg.className='msg err';msg.textContent='Erro: '+(error.message||'não foi possível salvar')}finally{btn.disabled=false}
  }
  normalizeUi();mountModules();restore();$('save')?.addEventListener('click',save);
  window.ZunoModel6={version:'60',mode:'reference-2d',editable3d:false};
})();