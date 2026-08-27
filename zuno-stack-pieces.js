(()=>{
  // v161: as peças premium agora são renderizadas diretamente por zuno-stack.js.
  // Este arquivo permanece como compatibilidade para instalações PWA antigas,
  // sem MutationObserver ou segunda passagem pelo DOM.
  window.__ZUNO_STACK_PREMIUM_PIECES__=true;
})();
