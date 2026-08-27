(()=>{
  const SB_URL='https://rliymfbbhqoejgfvsbuu.supabase.co';
  const SB_KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
  const sb=window.supabase.createClient(SB_URL,SB_KEY);
  const $=id=>document.getElementById(id);
  const MODULES=[
    ['Corpo','Base estilizada Model 6'],['Pele','Tons de pele'],['Rosto','Formato facial'],['Olhos','Estilo e cor'],['Cabelo','Modelo e cor'],['Parte de cima','Camisetas, hoodies e jaquetas'],['Parte de baixo','Calças, cargos, shorts e saias'],['Calçados','Tênis, botas e variações'],['Acessórios','Correntes, relógios, brincos e óculos']
  ];
  const state={version:11,style:'zuno-model6-reference',modelId:'model6',sex:'masculino',wardrobeReady:false,source:'user-approved-model6-reference'};

  function mountModules(){
    const root=$('modules');
    if(!root)return;
    root.innerHTML='';
    for(const [name,desc] of MODULES){
      const row=document.createElement('div');
      row.className='module-row';
      row.innerHTML=`<div><b>${name}</b><small>${desc}</small></div><span>Preparado para GLB</span>`;
      root.appendChild(row);
    }
  }

  async function restore(){
    try{
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;
      const {data}=await sb.from('profiles').select('avatar_config').eq('id',user.id).maybeSingle();
      if(data?.avatar_config?.style==='zuno-model6-reference')Object.assign(state,data.avatar_config);
    }catch(error){console.warn('ZunoPlay Model 6 restore',error)}
  }

  async function save(){
    const btn=$('save'),msg=$('msg'),img=$('model6');
    btn.disabled=true;msg.className='msg';msg.textContent='Salvando Model 6...';
    try{
      const {data:{user},error:userError}=await sb.auth.getUser();
      if(userError||!user)throw new Error('Sessão inválida');
      const avatarUrl=img?.src;
      if(!avatarUrl?.startsWith('data:image/'))throw new Error('Prévia do Model 6 indisponível');
      const cfg={...state,updatedAt:new Date().toISOString()};
      const {error}=await sb.from('profiles').update({avatar_url:avatarUrl,avatar_config:cfg,sex:'masculino'}).eq('id',user.id);
      if(error)throw error;
      msg.textContent='Model 6 definido como personagem atual. ✅';
      window.dispatchEvent(new CustomEvent('zuno:avatar-saved',{detail:{avatar_url:avatarUrl,avatar_config:cfg}}));
    }catch(error){
      msg.className='msg err';
      msg.textContent='Erro: '+(error.message||'não foi possível salvar');
    }finally{btn.disabled=false}
  }

  mountModules();
  restore();
  $('save').addEventListener('click',save);
})();