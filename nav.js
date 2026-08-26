(() => {
  if (window.__ZUNOPLAY_GLOBAL_NAV__) return;
  window.__ZUNOPLAY_GLOBAL_NAV__ = true;

  const page = location.pathname.split('/').pop().toLowerCase();
  const homeUrl = new URL('./index.html', location.href).href;
  const isRoomPage = page === 'sala.html';
  let scheduled = false;
  let running = false;

  const style = document.createElement('style');
  style.textContent = `.zunoplay-global-home{width:42px;height:42px;min-width:42px;flex:0 0 42px;box-sizing:border-box;border:1px solid #303145;border-radius:12px;background:#1b1c2b;color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0;margin:0;font:20px Arial,sans-serif;line-height:1;cursor:pointer;text-decoration:none;position:relative;z-index:10000}`;
  document.head.appendChild(style);

  function goHome(event) {
    event.preventDefault();
    location.href = homeUrl;
  }

  function isCandidate(el) {
    if (!(el instanceof Element) || isRoomPage) return false;
    if (el.classList.contains('zunoplay-global-home')) return true;
    if (el.classList.contains('home-button') || el.classList.contains('zunoplay-home-button')) return true;
    if (el.tagName === 'A' && /(^|\/)index\.html(?:$|[?#])/.test(el.getAttribute('href') || '')) return true;
    const text = (el.textContent || '').trim().toLowerCase();
    return (el.tagName === 'BUTTON' || el.tagName === 'A') && (text === '⌂' || text === '🏠' || text === 'home');
  }

  function mount() {
    if (running || isRoomPage) return;
    running = true;
    try {
      const all = [...document.querySelectorAll('button,a,[role="button"]')];
      const candidates = all.filter(isCandidate);
      const headers = [...document.querySelectorAll('.header,.chat-header,.header-left')];
      let home = document.querySelector('.zunoplay-global-home');

      if (!home && candidates.length) home = candidates[0];
      if (!home && headers.length) {
        home = document.createElement('button');
        headers[0].insertBefore(home, headers[0].firstChild);
      }
      if (!home) return;

      const wasGlobal = home.classList.contains('zunoplay-global-home');
      if (!wasGlobal) {
        home.className = 'zunoplay-global-home';
        home.removeAttribute('href');
        home.removeAttribute('onclick');
        home.removeAttribute('data-action');
        home.setAttribute('type', 'button');
        home.setAttribute('aria-label', 'Voltar para a tela inicial');
        home.setAttribute('title', 'Tela inicial');
        home.textContent = '⌂';
        home.onclick = goHome;
      }

      const duplicates = [...document.querySelectorAll('.zunoplay-global-home')].filter(el => el !== home);
      candidates.slice(1).forEach(el => { if (el !== home) el.remove(); });
      duplicates.forEach(el => el.remove());
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount();
    });
  }

  function ready() {
    mount();
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true});
  else ready();

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();