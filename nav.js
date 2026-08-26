(() => {
  if (window.__ZUNOPLAY_GLOBAL_NAV__) return;
  window.__ZUNOPLAY_GLOBAL_NAV__ = true;

  const homeUrl = new URL('./index.html', window.location.href).href;
  const page = location.pathname.split('/').pop().toLowerCase();

  function goHome(event) {
    if (event) event.preventDefault();
    window.location.href = homeUrl;
  }

  const style = document.createElement('style');
  style.textContent = `.zunoplay-home-button{width:42px!important;height:42px!important;min-width:42px!important;flex:0 0 42px!important;box-sizing:border-box!important;border:1px solid #303145!important;border-radius:12px!important;background:#1b1c2b!important;color:#fff!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;font:20px Arial,sans-serif!important;line-height:1!important;cursor:pointer!important;pointer-events:auto!important;text-decoration:none!important;position:relative!important;z-index:10000!important}.zunoplay-plain-logo{cursor:default!important;pointer-events:none!important}`;
  document.head.appendChild(style);

  function isHomeCandidate(el) {
    if (!(el instanceof Element)) return false;
    if (el.classList.contains('zunoplay-home-button')) return true;
    if (el.classList.contains('home-button') || el.classList.contains('home')) return true;
    if (el.tagName === 'A' && /(^|\/)index\.html(?:$|[?#])/.test(el.getAttribute('href') || '')) return true;
    const text = (el.textContent || '').trim().toLowerCase();
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && (text === '⌂' || text === '🏠' || text === 'home')) return true;
    if (page === 'conversas.html' && el.classList.contains('back')) return true;
    return false;
  }

  function normalizeButton(el) {
    el.className = 'zunoplay-home-button';
    el.removeAttribute('href');
    el.removeAttribute('onclick');
    el.removeAttribute('data-action');
    el.setAttribute('type', 'button');
    el.setAttribute('aria-label', 'Voltar para a tela inicial');
    el.setAttribute('title', 'Tela inicial');
    el.textContent = '⌂';
    el.onclick = goHome;
    return el;
  }

  function ensureSingleHome() {
    const all = [...document.querySelectorAll('button,a,[role="button"]')];
    const candidates = all.filter(isHomeCandidate);
    let home = candidates[0] || null;
    if (!home) {
      const header = document.querySelector('.header,.chat-header,.header-left');
      if (header) {
        home = document.createElement('button');
        home.className = 'zunoplay-home-button';
        header.insertBefore(home, header.firstChild);
      }
    }
    if (!home) return;
    normalizeButton(home);
    candidates.slice(1).forEach(el => el.remove());
    [...document.querySelectorAll('.zunoplay-home-button')].slice(1).forEach(el => el.remove());
  }

  function normalizeLogo() {
    document.querySelectorAll('.logo-main,.header-logo').forEach(logo => {
      logo.classList.add('zunoplay-plain-logo');
      logo.removeAttribute('href');
      logo.removeAttribute('onclick');
    });
  }

  function run() {
    ensureSingleHome();
    normalizeLogo();
  }

  // Pages such as Conversas render their header after nav.js executes.
  // Run once now, after DOM is ready, and again after dynamic rendering settles.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  setTimeout(run, 0);
  setTimeout(run, 100);
  setTimeout(run, 500);
})();