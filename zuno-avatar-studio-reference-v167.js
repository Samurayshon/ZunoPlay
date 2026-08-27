(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_REFERENCE_V167__)return;
  window.__ZUNO_AVATAR_STUDIO_REFERENCE_V167__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const catMeta={
    Base:{label:'Avatar',icon:'◉',order:1},Roupas:{label:'Roupas',icon:'♢',order:2},Acessórios:{label:'Acessórios',icon:'✧',order:3},Cabelo:{label:'Cabelos',icon:'✦',order:4},Rosto:{label:'Rosto',icon:'☺',order:5},Calçados:{label:'Calçados',icon:'▰',order:6},Efeitos:{label:'Auras',icon:'✦',order:7},Mascote:{label:'Mascotes',icon:'◆',order:8}
  };
  const subcats=[['Corpo','Base'],['Rosto','Rosto'],['Cabelo','Cabelo'],['Roupas','Roupas'],['Calçados','Calçados']];
  let mounted=false,refreshTimer=0;

  function getState(){
    try{if(typeof state!=='undefined')return clone(state)}catch(_){}
    const r=window.ZunoAvatarRenderer;
    return clone(r?.defaults||{style:'zuno-studio-v1',model:'masculino',selections:{Base:1,Acessórios:0,Mascote:1,Efeitos:1},colors:{pele:1,cabelo:0,roupa:0},mode:'Corpo inteiro',rotation:0,zoom:1});
  }
  function clickRealCategory(cat){const b=qa('#tabs .tab').find(x=>x.dataset.studioCat===cat);if(b)b.click()}
  function currentCat(){return (q('#panelTitle')?.textContent||'Base').trim()}
  function decorateTabs(){
    qa('#tabs .tab').forEach(b=>{
      let raw=b.dataset.studioCat;
      if(!raw){const text=(b.textContent||'').trim();raw=Object.keys(catMeta).find(k=>text.endsWith(k)||text===k)||text;b.dataset.studioCat=raw}
      const m=catMeta[raw]||{label:raw,icon:'◉',order:9};b.style.setProperty('--studio-order',m.order);
      if(b.dataset.studioDecorated!=='1'){b.dataset.studioDecorated='1';b.innerHTML=`<span class="ico">${m.icon}</span><span>${m.label}</span>`}
    });
    syncSubtabs();
  }
  function syncSubtabs(){const cat=currentCat();qa('.studio-subtab').forEach(b=>b.classList.toggle('on',b.dataset.cat===cat))}
  function mountPreview(img,cfg){const r=window.ZunoAvatarRenderer;if(!r||!img||!cfg)return;try{r.mount(img,cfg)}catch(_){}}
  function updatePreviewRail(){
    const base=getState(),r=window.ZunoAvatarRenderer;if(!r)return;
    const profile=clone(base);profile.mode='Perfil';profile.zoom=1;
    const mini=clone(base);mini.mode='Perfil';mini.zoom=1;
    const back=clone(base);back.mode='Corpo inteiro';back.zoom=1;
    mountPreview(q('#studioPreviewProfile'),profile);mountPreview(q('#studioPreviewMini'),mini);mountPreview(q('#studioPreviewBack'),back);
  }
  function decorateOptionThumbs(){
    const cat=currentCat(),r=window.ZunoAvatarRenderer;if(!r)return;
    qa('#options .option').forEach((opt,i)=>{const thumb=opt.querySelector('.thumb');if(!thumb)return;if(cat==='Base'){let img=thumb.querySelector('img');if(!img){thumb.textContent='';img=document.createElement('img');thumb.appendChild(img)}const cfg=getState();cfg.mode='Corpo inteiro';cfg.selections={...cfg.selections,Base:i};cfg.zoom=1;mountPreview(img,cfg)}});
  }
  function makePreviewRail(){
    const rail=document.createElement('aside');rail.className='studio-preview-rail';
    rail.innerHTML=`<article class="studio-preview-card"><strong>Perfil</strong><div class="studio-preview-frame"><img id="studioPreviewProfile" alt="Prévia de perfil"></div></article><article class="studio-preview-card mini"><strong>Mini Avatar</strong><div class="studio-preview-frame"><img id="studioPreviewMini" alt="Mini avatar"></div></article><article class="studio-preview-card back"><strong>Vista traseira</strong><div class="studio-preview-frame"><img id="studioPreviewBack" alt="Prévia traseira"></div></article>`;
    return rail;
  }
  function makeSubtabs(){const nav=document.createElement('nav');nav.className='studio-subtabs';nav.setAttribute('aria-label','Edição rápida do avatar');subcats.forEach(([label,cat])=>{const b=document.createElement('button');b.type='button';b.className='studio-subtab';b.dataset.cat=cat;b.textContent=label;b.onclick=()=>clickRealCategory(cat);nav.appendChild(b)});return nav}
  function randomize(){
    try{if(typeof state==='undefined')return;if(typeof push==='function')push();state.selections.Base=Math.floor(Math.random()*4);state.selections.Acessórios=Math.floor(Math.random()*4);state.selections.Mascote=Math.floor(Math.random()*4);state.selections.Efeitos=Math.floor(Math.random()*4);state.colors.pele=Math.floor(Math.random()*6);state.colors.roupa=Math.floor(Math.random()*7);if(typeof renderAll==='function')renderAll()}catch(_){}
  }
  function buildOfficialCard(title,rarity,cfg,opts={}){
    const b=document.createElement('button');b.type='button';b.className='studio-official-card'+(opts.active?' active':'');
    b.innerHTML=`<img alt="${title}"><span class="studio-official-copy"><b>${title}</b><span class="studio-rarity">${rarity}</span></span>${opts.locked?'<span class="studio-lock">🔒</span>':''}`;
    mountPreview(b.querySelector('img'),cfg);
    if(opts.model)b.onclick=()=>q(`#modelSwitch [data-model="${opts.model}"]`)?.click();
    else if(opts.locked)b.onclick=()=>{const t=q('#toast');if(t){t.textContent='Visual em produção';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}};
    return b;
  }
  function makeOfficials(){
    const wrap=document.createElement('section');wrap.className='studio-officials';
    const left=document.createElement('div');left.className='studio-official-group';left.innerHTML='<div class="studio-official-title">Avatares Oficiais ZunoPlay</div><div class="studio-official-list"></div>';
    const list=left.querySelector('.studio-official-list');const r=window.ZunoAvatarRenderer;const base=clone(r?.official?.masculino||getState());base.mode='Corpo inteiro';base.zoom=1;
    const variants=[['Street Z','Oficial',clone(base),{active:true}],['Street Z (Noite)','Especial',(()=>{const c=clone(base);c.colors.roupa=1;c.selections.Efeitos=3;return c})(),{locked:true}],['Zuno Tech','Raro',(()=>{const c=clone(base);c.colors.roupa=2;c.selections.Acessórios=2;return c})(),{locked:true}],['Zuno Urban','Raro',(()=>{const c=clone(base);c.colors.roupa=5;c.selections.Acessórios=3;return c})(),{locked:true}],['Zuno Fire','Épico',(()=>{const c=clone(base);c.colors.roupa=4;c.selections.Efeitos=3;return c})(),{locked:true}]];
    variants.forEach(([t,rar,c,o])=>list.appendChild(buildOfficialCard(t,rar,c,o)));
    const right=document.createElement('div');right.className='studio-female-official';right.innerHTML='<div class="studio-official-title">Feminino Oficial</div>';
    const fc=clone(r?.official?.feminino||base);fc.mode='Corpo inteiro';fc.zoom=1;right.appendChild(buildOfficialCard('Street Z','Oficial',fc,{model:'feminino'}));wrap.append(left,right);return wrap;
  }
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{decorateTabs();decorateOptionThumbs();syncSubtabs();updatePreviewRail()},35)}
  function mount(){
    if(mounted)return;const app=q('.app'),hero=q('#hero'),tabs=q('#tabs'),panel=q('.panel'),save=q('#save');if(!app||!hero||!tabs||!panel||!save)return void setTimeout(mount,60);
    mounted=true;document.body.classList.add('zuno-studio-reference-v167');app.classList.add('zuno-studio-reference');
    const editor=document.createElement('section');editor.className='studio-reference-editor';
    const rail=document.createElement('aside');rail.className='studio-category-rail';rail.appendChild(tabs);
    const stageCol=document.createElement('div');stageCol.className='studio-stage-column';stageCol.appendChild(hero);
    editor.append(rail,stageCol,makePreviewRail());app.insertBefore(editor,panel);
    const subtabs=makeSubtabs();app.insertBefore(subtabs,panel);
    const actions=document.createElement('div');actions.className='studio-stage-actions';const random=document.createElement('button');random.type='button';random.className='studio-random';random.textContent='⤨ Aleatório';random.onclick=randomize;save.textContent='▣ Salvar Avatar';actions.append(random,save);hero.appendChild(actions);
    const rotate=q('#rotate'),zoom=q('#zoom'),tools=q('.toolGroup');if(rotate)rotate.innerHTML='<span class="studio-tool-icon">↻</span><span>Girar</span>';if(zoom)zoom.innerHTML='<span class="studio-tool-icon">⊕</span><span>Zoom</span>';
    if(tools&&!q('.studio-pose-button')){const pose=document.createElement('button');pose.type='button';pose.className='studio-pose-button';pose.innerHTML='<span class="studio-tool-icon">♙</span><span>Posar</span>';pose.onclick=()=>hero.classList.toggle('studio-pose-alt');tools.appendChild(pose)}
    panel.insertAdjacentElement('afterend',makeOfficials());
    const globalActions=q('.zuno-global-actions');if(globalActions&&!q('.studio-cloud-action')){const cloud=document.createElement('button');cloud.type='button';cloud.className='zuno-global-action studio-cloud-action';cloud.setAttribute('aria-label','Sincronizar avatar');cloud.textContent='☁';cloud.onclick=()=>q('#saveTop')?.click();const notif=globalActions.children[1];globalActions.insertBefore(cloud,notif||null)}
    decorateTabs();decorateOptionThumbs();syncSubtabs();updatePreviewRail();
    new MutationObserver(scheduleRefresh).observe(tabs,{childList:true,subtree:true});new MutationObserver(scheduleRefresh).observe(q('#options'),{childList:true,subtree:true});new MutationObserver(scheduleRefresh).observe(q('#avatarPreview'),{attributes:true,attributeFilter:['src','data-zuno-model']});window.addEventListener('zuno-avatar-renderer-ready',scheduleRefresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();