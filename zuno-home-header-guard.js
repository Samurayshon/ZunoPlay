(()=>{
  if(window.__ZUNO_HOME_HEADER_GUARD_RETIRED__)return;
  window.__ZUNO_HOME_HEADER_GUARD_RETIRED__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;
  function removeLegacy(){document.querySelectorAll('#homeScreen>.topbar,#homeScreen>.header').forEach(el=>{if(!el.hasAttribute('data-zuno-global-header'))el.remove()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeLegacy,{once:true});else removeLegacy();
  window.addEventListener('zuno:shell-mounted',removeLegacy);
  window.addEventListener('pageshow',removeLegacy);
})();