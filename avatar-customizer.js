(()=>{
  if(window.__ZUNOPLAY_AVATAR_CUSTOMIZER__)return;
  window.__ZUNOPLAY_AVATAR_CUSTOMIZER__=true;
  const VERSION='45';
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector(s);
  function decodeSvg(src){const value=String(src||'');if(!value.startsWith('data:image/svg+xml'))return '';try{return decodeURIComponent(value.split(',').slice(1).join(','))}catch(_){return ''}}
  function getAttr(svg,key){return svg.match(new RegExp(`data-zuno-${key}="([^"]+)"`))?.[1]||null}
  function configFromPreview(){const preview=document.getElementById('avatarPreview');const svg=decodeSvg(preview?.src);if(!svg)return null;const cfg={version:3,style:'zuno-anime',sex:getAttr(svg,'sex'),skin:getAttr(svg,'skin'),hair:getAttr(svg,'hair'),hairStyle:getAttr(svg,'hair-style'),eyes:getAttr(svg,'eyes'),outfit:getAttr(svg,'outfit'),accent:getAttr(svg,'accent'),aura:getAttr(svg,'aura'),updatedAt:new Date().toISOString()};if(cfg.sex!=='masculino'&&cfg.sex!=='feminino')return null;return cfg}
  async function client(){for(let i=0;i<60;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await sleep(100)}return null}
  function installInfo(){if(document.getElementById('zunoCustomAvatarInfo'))return;const title=q('.title-row p');if(title)title.textContent='Personalize pele, cabelo, olhos, roupa, neon e aura do seu avatar Zuno.';const preview=q('.preview-shell');if(!preview)return;const badge=document.createElement('div');badge.id='zunoCustomAvatarInfo';badge.style.cssText='position:absolute;right:12px;top:12px;z-index:6;padding:7px 10px;border-radius:999px;border:1px solid rgba(167,139,250,.4);background:rgba(13,10,28,.82);color:#ddd6fe;font-size:9px;font-weight:800;backdrop-filter:blur(8px)';badge.textContent='PERSONALIZÁVEL';preview.appendChild(badge);const b=q('.preview-badge');if(b)b.innerHTML='Avatar <b>Personalizável</b> · ZunoPlay'}
  async function persistConfig(){await sleep(420);const cfg=configFromPreview();if(!cfg)return;const sb=await client();if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(!session?.user)return;const {error}=await sb.from('profiles').update({avatar_config:cfg}).eq('id',session.user.id);if(error)console.warn('ZunoPlay avatar_config',error);else window.dispatchEvent(new CustomEvent('zuno:avatar-config-saved',{detail:cfg}))}
  function boot(){installInfo();const save=document.getElementById('save');if(save)save.addEventListener('click',()=>persistConfig().catch(console.warn))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.ZunoAvatarCustomizer={version:VERSION,configFromPreview,persistConfig};
})();