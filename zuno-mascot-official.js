(()=>{
  if(window.__ZUNO_MASCOT_OFFICIAL_V1__)return;
  window.__ZUNO_MASCOT_OFFICIAL_V1__=true;
  const ASSET='./assets/brand/zuno-mascot-head-v1.webp';
  const abs=()=>new URL(ASSET,document.baseURI).href;

  function makeHead(size=48,label='Zuno, mascote oficial do ZunoPlay'){
    const img=document.createElement('img');
    img.src=abs();img.width=size;img.height=size;img.className='zuno-brand-head zuno-mascot-raster';
    img.alt=label;img.decoding='async';img.loading='eager';img.dataset.zunoMascotOfficial='1';
    return img;
  }

  function replaceBrandHeads(){
    document.querySelectorAll('svg.zuno-brand-head').forEach(svg=>{
      const w=Number(svg.getAttribute('width'))||svg.getBoundingClientRect().width||48;
      const h=Number(svg.getAttribute('height'))||svg.getBoundingClientRect().height||w;
      const img=makeHead(Math.max(w,h),svg.getAttribute('aria-label')||'Zuno, mascote oficial do ZunoPlay');
      img.style.width=w+'px';img.style.height=h+'px';
      svg.replaceWith(img);
    });
  }

  function patchRenderer(){
    const r=window.ZunoAvatarRenderer;
    if(!r?.mount||r.__zunoOfficialMascotPatch)return false;
    const original=r.mount.bind(r);
    r.mount=function(img,cfg){
      if(img?.id==='simpleAvatarPreview'&&Number(cfg?.selections?.Mascote)===1){
        const next=JSON.parse(JSON.stringify(cfg));
        next.selections={...(next.selections||{}),Mascote:0};
        return original(img,next);
      }
      return original(img,cfg);
    };
    r.__zunoOfficialMascotPatch=true;
    return true;
  }

  function ensureStudioMascot(){
    const option=document.querySelector('.mascot-option[data-mascot="1"]');
    if(option){
      const icon=option.querySelector('.mascot-icon');
      if(icon&&!icon.dataset.zunoMascotOfficial){
        icon.dataset.zunoMascotOfficial='1';icon.classList.add('zuno-mascot-option-icon');
        const img=makeHead(48,'Zuno');img.className='zuno-mascot-option-img';icon.replaceChildren(img);
      }
      const label=option.querySelector('span:last-child');if(label)label.textContent='Zuno';
    }
    const stage=document.querySelector('.avatar-stage-card');
    if(stage&&!document.getElementById('simpleOfficialMascot')){
      const img=makeHead(86,'Zuno, companheiro oficial');
      img.id='simpleOfficialMascot';img.className='avatar-stage-official-mascot';stage.appendChild(img);
    }
    syncStudioMascot();
  }

  function syncStudioMascot(){
    const el=document.getElementById('simpleOfficialMascot');if(!el)return;
    const active=document.querySelector('.mascot-option.is-active');
    el.classList.toggle('show',active?.dataset.mascot==='1');
  }

  function rerenderStudio(){
    const active=document.querySelector('.avatar-choice.is-active');
    if(active&&document.getElementById('simpleAvatarPreview'))setTimeout(()=>active.click(),0);
  }

  function run(){
    replaceBrandHeads();
    const patched=patchRenderer();
    ensureStudioMascot();
    if(patched)rerenderStudio();
  }

  let raf=0;
  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;run()});
  }

  window.ZunoMascotOfficial={version:1,asset:abs(),makeHead,refresh:run};
  window.addEventListener('zuno:brand-ready',schedule);
  window.addEventListener('zuno-avatar-renderer-ready',schedule);
  document.addEventListener('click',e=>{if(e.target.closest?.('.mascot-option'))setTimeout(syncStudioMascot,0)},true);
  const mo=new MutationObserver(schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});run()},{once:true});
  else{mo.observe(document.body,{childList:true,subtree:true});run()}
  window.dispatchEvent(new CustomEvent('zuno:mascot-ready',{detail:{version:1}}));
})();