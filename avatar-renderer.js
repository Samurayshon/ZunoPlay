(()=>{
if(window.__ZUNO_AVATAR_RENDERER_V18__)return;window.__ZUNO_AVATAR_RENDERER_V18__=1;
const STYLE='zuno-studio-v1',ACC=['#7c3aed','#a855f7','#22d3ee','#ec4899','#f59e0b','#10b981','#eef2ff'];
const M={style:STYLE,version:6,model:'masculino',selections:{Base:1,Rosto:1,Cabelo:0,Roupas:0,Calçados:0,Acessórios:0,Mascote:0,Efeitos:1},colors:{pele:1,cabelo:0,roupa:0},mode:'Corpo inteiro',rotation:0,zoom:1,updatedAt:null};
const F={...JSON.parse(JSON.stringify(M)),model:'feminino',selections:{...M.selections,Base:0,Rosto:0,Cabelo:2},colors:{pele:1,cabelo:5,roupa:0}};
const CL=v=>JSON.parse(JSON.stringify(v)),CP=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0)),preset=m=>CL(m==='feminino'?F:M),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function normalize(v){if(!v||v.style!==STYLE)return null;const model=v.model==='feminino'?'feminino':'masculino',p=preset(model),c=preset(model);c.selections.Base=CP(v.selections?.Base??p.selections.Base,0,3);c.selections.Acessórios=CP(v.selections?.Acessórios??0,0,3);c.selections.Mascote=CP(v.selections?.Mascote??0,0,3);c.selections.Efeitos=CP(v.selections?.Efeitos??1,0,3);c.mode=['Perfil','Sala de voz','Corpo inteiro'].includes(v.mode)?v.mode:'Corpo inteiro';c.rotation=Number(v.rotation)||0;c.zoom=Math.max(.8,Math.min(1.6,Number(v.zoom)||1));c.updatedAt=v.updatedAt||null;c.version=6;return c}
const RASTER={
  masculino:['./assets/avatars/raster/v2/male-street-z.0.txt','./assets/avatars/raster/v2/male-street-z.1.txt','./assets/avatars/raster/v2/male-street-z.2.txt','./assets/avatars/raster/v2/male-street-z.3.txt','./assets/avatars/raster/v2/male-street-z.4.txt'],
  feminino:['./assets/avatars/raster/v2/female-street-z.0.txt','./assets/avatars/raster/v2/female-street-z.1.txt','./assets/avatars/raster/v2/female-street-z.2.txt','./assets/avatars/raster/v2/female-street-z.3.txt','./assets/avatars/raster/v2/female-street-z.4.txt','./assets/avatars/raster/v2/female-street-z.5.txt']
},CACHE={},ASSET_INFLIGHT=new Map();
async function fetchAsset(url,attempt=0){
  const key=new URL(url,document.baseURI).href;
  if(ASSET_INFLIGHT.has(key))return ASSET_INFLIGHT.get(key);
  const job=(async()=>{
    const r=await fetch(key,{cache:'force-cache'});
    if(r.status===429){
      if(attempt>=3)throw Error('Zuno asset 429');
      const retry=Number(r.headers.get('retry-after'))||Math.pow(2,attempt+1);
      await sleep(Math.min(8000,Math.max(800,retry*1000)));
      return fetchAsset(url,attempt+1);
    }
    if(!r.ok)throw Error('Zuno asset '+r.status);
    return r.text();
  })().finally(()=>ASSET_INFLIGHT.delete(key));
  ASSET_INFLIGHT.set(key,job);return job;
}
async function loadRasterParts(model){
  const parts=[];
  for(const url of RASTER[model]){
    parts.push((await fetchAsset(url)).trim());
    await sleep(70);
  }
  return'data:image/webp;base64,'+parts.join('');
}
function officialImage(model){if(!CACHE[model])CACHE[model]=loadRasterParts(model).catch(e=>{delete CACHE[model];throw e});return CACHE[model]}
function baseTransform(c){const i=c.selections.Base,f=c.model==='feminino';let sx=1,sy=1;if(i===1)sx=f?1.025:1.045;if(i===2)sx=f?1.06:1.025;if(i===3){sx=.985;sy=1.075}return`translate(200 520) scale(${sx} ${sy}) translate(-200 -520)`}
function accessory(c,a){const n=c.selections.Acessórios;if(n===1)return`<g fill="none" stroke="#65eaff" stroke-width="3"><rect x="154" y="104" width="38" height="24" rx="10"/><rect x="208" y="104" width="38" height="24" rx="10"/><path d="M192 115h16"/></g>`;if(n===2)return`<g fill="none" stroke="${a}" stroke-width="6"><path d="M139 112Q139 47 200 44Q261 47 261 112"/><rect x="128" y="106" width="15" height="48" rx="8" fill="#151827"/><rect x="257" y="106" width="15" height="48" rx="8" fill="#151827"/></g>`;if(n===3)return`<path d="M176 196q24 27 48 0" fill="none" stroke="#e7ebff" stroke-width="2.5"/><path d="M195 215h10l5 8-10 9-10-9Z" fill="${a}"/>`;return''}
function mascot(c,a){const n=c.selections.Mascote;if(!n)return'';const x=c.model==='feminino'?321:318,col=n===2?'#ec4899':n===3?'#22d3ee':a;if(n===3)return`<g transform="translate(${x} 332)"><rect x="-31" y="-31" width="62" height="60" rx="20" fill="#0e1726" stroke="${col}" stroke-width="3"/><circle cx="-11" cy="-4" r="6" fill="#22d3ee"/><circle cx="11" cy="-4" r="6" fill="#22d3ee"/><path d="M-10 14h20" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`;return`<g transform="translate(${x} 332)"><path d="M-28-10-18-40 0-24 19-41 29-9v38q0 28-29 28t-29-28Z" fill="#12182a" stroke="${col}" stroke-width="3"/><circle cx="-10" cy="-5" r="5" fill="${col}"/><circle cx="10" cy="-5" r="5" fill="${col}"/><path d="M-6 13q6 5 12 0" fill="none" stroke="#fff" stroke-width="2"/></g>`}
function effect(c,a){const e=c.selections.Efeitos;if(!e)return'';if(e===1)return`<ellipse cx="200" cy="518" rx="135" ry="25" fill="none" stroke="${a}" stroke-width="3"/><ellipse cx="200" cy="518" rx="95" ry="16" fill="none" stroke="#22d3ee" stroke-width="2" opacity=".8"/>`;const g=e===2?'#22d3ee':'#ec4899';return`<ellipse cx="200" cy="280" rx="145" ry="220" fill="${g}" opacity=".09"/><ellipse cx="200" cy="280" rx="145" ry="220" fill="none" stroke="${g}" stroke-width="4" opacity=".42"/><ellipse cx="200" cy="280" rx="128" ry="205" fill="none" stroke="${g}" stroke-width="2" opacity=".22"/>`}
function composite(c,src){const a=ACC[c.colors.roupa]||ACC[0],vb=c.mode==='Perfil'?'78 20 244 270':c.mode==='Sala de voz'?'45 22 310 430':'0 0 400 550';return'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Avatar oficial ZunoPlay ${c.model}"><g transform="${baseTransform(c)}"><image x="76" y="0" width="248" height="550" preserveAspectRatio="xMidYMid meet" href="${src}"/></g>${effect(c,a)}${accessory(c,a)}${mascot(c,a)}</svg>`)}
const loading=c=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 550"><defs><radialGradient id="g"><stop stop-color="#7c3aed" stop-opacity=".28"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs><ellipse cx="200" cy="500" rx="145" ry="30" fill="url(#g)"/><ellipse cx="200" cy="500" rx="100" ry="16" fill="none" stroke="#22d3ee" opacity=".35"/></svg>`);
function mount(img,v){const c=normalize(v);if(!img||!c)return false;const t=String((+img.dataset.zunoTicket||0)+1);img.dataset.zunoTicket=t;img.alt=`Avatar oficial ZunoPlay ${c.model}`;img.dataset.zunoRenderer='18';img.dataset.zunoStyle=STYLE;img.dataset.zunoModel=c.model;img.dataset.zunoSource='street-z-v2-official-raster';img.dataset.zunoAssets='official-raster-v2-throttled';img.style.objectFit=c.mode==='Corpo inteiro'?'contain':'cover';img.style.objectPosition=c.mode==='Perfil'?'50% 12%':c.mode==='Sala de voz'?'50% 15%':'50% 50%';img.src=loading(c);officialImage(c.model).then(src=>{if(img.dataset.zunoTicket===t)img.src=composite(c,src)}).catch(e=>console.warn('ZunoPlay official avatar asset:',e));return true}
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),1800)}
function protectStudio(){if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;const locked=new Set(['Rosto','Cabelo','Calçados']);document.addEventListener('click',e=>{const opt=e.target.closest?.('.option'),color=e.target.closest?.('.color');if(!opt&&!color)return;const cat=document.getElementById('panelTitle')?.textContent?.trim()||'';if(color||locked.has(cat)||(cat==='Roupas'&&[...opt.parentElement.children].indexOf(opt)!==0)){e.preventDefault();e.stopImmediatePropagation();toast('Versão premium em produção · Street Z oficial mantido.')}},true);const style=document.createElement('style');style.textContent='.zuno-premium-note{color:#68eaff!important;font-weight:800}';document.head.appendChild(style)}
window.ZunoAvatarRenderer={version:18,style:STYLE,defaults:CL(M),official:{masculino:CL(M),feminino:CL(F)},normalize,mount,officialImage,officialComposite:composite,officialLook:()=>true,assetManifest:()=>null,assetReady:()=>true,empty:false};window.dispatchEvent(new CustomEvent('zuno-avatar-renderer-ready'));protectStudio();
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase(),load=(id,src)=>{if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=true;document.head.appendChild(s)};if(page==='avatar.html'){if(!window.__ZUNO_AVATAR_STUDIO_MANAGED__){load('zuno-avatar-stage-controls','./avatar-stage-controls.js?v=168');load('zuno-avatar-preview-sync','./avatar-preview-sync.js?v=168')}}else if(page!=='index.html')load('zuno-avatar-surface-sync','./avatar-surface-sync.js?v=168');
})();
