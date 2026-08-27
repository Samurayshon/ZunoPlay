(()=>{
  if(window.__ZUNOPLAY_OFFICIAL_AVATARS__)return;
  window.__ZUNOPLAY_OFFICIAL_AVATARS__=true;
  function normalizeSex(value){return String(value||'').toLowerCase()==='feminino'?'feminino':'masculino'}
  function isCustomAvatar(value){const v=String(value||'').trim();return v.startsWith('data:image/')||/^https:\/\//i.test(v)}
  async function resolveProfile(profile){return profile?.avatar_url||null}
  async function ensureForCurrentUser(){return null}
  window.ZunoOfficialAvatars={get:async()=>null,resolve:resolveProfile,ensure:ensureForCurrentUser,isCustom:isCustomAvatar,normalizeSex,version:'45',removed:true};
})();