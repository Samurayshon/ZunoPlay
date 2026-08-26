(() => {
    if (window.__ZUNOPLAY_NAV_READY__) return;
    window.__ZUNOPLAY_NAV_READY__ = true;

    const homeUrl = new URL('./index.html', window.location.href).href;
    const goHome = () => { window.location.href = homeUrl; };

    const style = document.createElement('style');
    style.textContent = `
        .zunoplay-home-button {
            appearance:none !important;
            -webkit-appearance:none !important;
            width:42px !important;
            height:42px !important;
            border:1px solid #303145 !important;
            background:#1b1c2b !important;
            color:#fff !important;
            font:inherit !important;
            padding:0 !important;
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
            font-size:20px !important;
        }
        .zunoplay-home-button:active { transform:scale(.97); }
        .zunoplay-global-nav {
            display:flex;
            align-items:center;
            gap:8px;
            margin-left:auto;
            position:relative;
            z-index:10000;
        }
        .zunoplay-plain-logo {
            cursor:default !important;
            pointer-events:none !important;
            border:0 !important;
            background:transparent !important;
            padding:0 !important;
            margin:0 !important;
            text-decoration:none !important;
        }
        .zunoplay-plain-logo span { color:#8b5cf6 !important; }
    `;
    document.head.appendChild(style);

    function makeHomeButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'zunoplay-home-button';
        button.title = 'Voltar para a tela inicial';
        button.setAttribute('aria-label', 'Voltar para a tela inicial');
        button.textContent = '⌂';
        button.addEventListener('click', goHome);
        return button;
    }

    function makePlainLogo(text) {
        const logo = document.createElement('div');
        logo.className = 'zunoplay-plain-logo';
        logo.innerHTML = text || 'Zuno<span>Play</span>';
        return logo;
    }

    document.querySelectorAll('.header-logo, .logo-main').forEach(logo => {
        if (logo.dataset.zunoplayPlain === '1') return;
        logo.dataset.zunoplayPlain = '1';
        const plainLogo = makePlainLogo(logo.innerHTML);
        logo.replaceWith(plainLogo);
    });

    document.querySelectorAll('.logo').forEach(logo => {
        if (logo.classList.contains('zunoplay-plain-logo')) return;
        if (logo.querySelector('.zunoplay-home-button')) return;
        const text = logo.innerHTML.trim() || 'Zuno<span>Play</span>';
        logo.classList.add('zunoplay-plain-logo');
        logo.innerHTML = text;
    });

    document.querySelectorAll('.header, .chat-header').forEach(header => {
        if (header.querySelector('.zunoplay-home-button')) return;
        const home = makeHomeButton();
        header.insertBefore(home, header.firstChild);
    });
})();