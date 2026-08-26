(() => {
    if (window.__ZUNOPLAY_NAV_READY__) return;
    window.__ZUNOPLAY_NAV_READY__ = true;

    const isHome = /(^|\/)index\.html$/.test(location.pathname) || location.pathname.endsWith('/');

    const homeUrl = './index.html';

    const refresh = () => window.location.reload();

    const style = document.createElement('style');
    style.textContent = `
        .zunoplay-global-nav {
            display:flex;
            align-items:center;
            gap:8px;
            margin-left:auto;
        }
        .zunoplay-home-button {
            appearance:none;
            border:0;
            background:transparent;
            color:inherit;
            font:inherit;
            padding:0;
            margin:0;
            cursor:pointer;
        }
        .zunoplay-refresh-button {
            width:42px;
            height:42px;
            border-radius:12px;
            border:1px solid #303145;
            background:#1b1c2b;
            color:#fff;
            font-size:20px;
            cursor:pointer;
            display:inline-flex;
            align-items:center;
            justify-content:center;
        }
        .zunoplay-refresh-button:active,
        .zunoplay-home-button:active {
            transform:scale(.97);
        }
    `;
    document.head.appendChild(style);

    const logos = document.querySelectorAll('.logo, .header-logo, .logo-main');
    logos.forEach(logo => {
        if (logo.closest('.zunoplay-home-button')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'zunoplay-home-button';
        button.title = 'Voltar para a tela inicial';
        button.setAttribute('aria-label', 'Voltar para a tela inicial');
        button.addEventListener('click', () => {
            if (!isHome) window.location.href = homeUrl;
        });
        logo.parentNode.insertBefore(button, logo);
        button.appendChild(logo);
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
        refreshButton.style.position = 'fixed';
        refreshButton.style.top = '16px';
        refreshButton.style.right = '16px';
        refreshButton.style.zIndex = '9999';
        refreshButton.addEventListener('click', refresh);
        document.body.appendChild(refreshButton);
    }
})();
