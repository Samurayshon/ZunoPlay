(() => {
    if (window.__ZUNOPLAY_NAV_READY__) return;
    window.__ZUNOPLAY_NAV_READY__ = true;

    const homeUrl = new URL('./index.html', window.location.href).href;
    const goHome = () => { window.location.href = homeUrl; };
    const refresh = () => { window.location.reload(); };

    const style = document.createElement('style');
    style.textContent = `
        .zunoplay-home-button {
            appearance:none !important;
            -webkit-appearance:none !important;
            border:1px solid rgba(139,92,246,.45) !important;
            background:rgba(27,28,43,.96) !important;
            color:#fff !important;
            font:inherit !important;
            padding:8px 12px !important;
            margin:0 !important;
            border-radius:12px !important;
            cursor:pointer !important;
            pointer-events:auto !important;
            display:inline-flex !important;
            align-items:center !important;
            justify-content:center !important;
            position:relative !important;
            z-index:10000 !important;
            text-decoration:none !important;
            line-height:1 !important;
        }
        .zunoplay-home-button span { color:#8b5cf6 !important; }
        .zunoplay-home-button:active { transform:scale(.97); }
        .zunoplay-global-nav { display:flex;align-items:center;gap:8px;margin-left:auto;position:relative;z-index:10000; }
        .zunoplay-refresh-button { width:42px;height:42px;border-radius:12px;border:1px solid #303145;background:#1b1c2b;color:#fff;font-size:20px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;position:relative;z-index:10000; }
        .zunoplay-refresh-button:active { transform:scale(.97); }
        .zunoplay-floating-refresh { position:fixed;top:16px;right:16px;z-index:99999; }
    `;
    document.head.appendChild(style);

    function makeHomeButton(text) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'zunoplay-home-button';
        button.title = 'Voltar para a tela inicial';
        button.setAttribute('aria-label', 'Voltar para a tela inicial');
        button.innerHTML = text || 'Zuno<span>Play</span>';
        button.addEventListener('click', goHome);
        return button;
    }

    document.querySelectorAll('.header-logo, .logo-main').forEach(logo => {
        if (logo.dataset.zunoplayConverted === '1') return;
        logo.dataset.zunoplayConverted = '1';
        const button = makeHomeButton(logo.innerHTML);
        logo.replaceWith(button);
    });

    document.querySelectorAll('.logo').forEach(logo => {
        if (logo.querySelector('.zunoplay-home-button')) return;
        const main = logo.querySelector('.logo-main');
        if (main) return;
        const button = makeHomeButton(logo.textContent.trim() || 'ZunoPlay');
        logo.replaceChildren(button);
    });

    const headers = document.querySelectorAll('.header, .chat-header');
    headers.forEach(header => {
        if (header.querySelector('.zunoplay-global-nav')) return;
        const nav = document.createElement('div');
        nav.className = 'zunoplay-global-nav';
        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.className = 'zunoplay-refresh-button';
        refreshButton.title = 'Atualizar página';
        refreshButton.setAttribute('aria-label', 'Atualizar página');
        refreshButton.textContent = '↻';
        refreshButton.addEventListener('click', refresh);
        nav.appendChild(refreshButton);
        header.appendChild(nav);
    });

    if (!headers.length && !document.querySelector('.zunoplay-floating-refresh')) {
        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.className = 'zunoplay-refresh-button zunoplay-floating-refresh';
        refreshButton.title = 'Atualizar página';
        refreshButton.setAttribute('aria-label', 'Atualizar página');
        refreshButton.textContent = '↻';
        refreshButton.addEventListener('click', refresh);
        document.body.appendChild(refreshButton);
    }
})();