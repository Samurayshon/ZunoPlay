# Zuno Stack — Auditoria de Produção Atual

## Estado funcional

O Zuno Stack é o único jogo ativo do catálogo. A geração atual usa 90 peças distribuídas em 5 camadas, bandeja de 7 espaços, risco a partir de 6/7, alvo de 4–6 minutos, combo, Dica, Desfazer, Pulse Shift, Relay e cooperação em tempo real quando existe contexto de sala.

## Runtime atual

O núcleo é `zuno-stack.js` + `zuno-stack-pieces.js/css`. A interface atual utiliza as camadas de lobby fullscreen/v2/closeout, gameplay state/v1/polish/immersive, identidade de marca e movimento de arena. Módulos de performance, social, progressão, conteúdo, mobile, objetivo cooperativo e Relay avançado são carregados pelo `nav.js`.

Os antigos sprites `zuno-stack-pieces.svg/webp` e as folhas `zuno-stack-layout-v1.css`, `zuno-stack-visual.css`, `zuno-stack-visual-final.css` e `zuno-stack-lobby.css` não pertencem mais à geração atual.

## PWA

A geração v279 usa precache tolerante a falhas, timeout de rede e fallback de cache. Falha de um asset não aborta mais toda a instalação do Service Worker. Scripts, CSS e navegações usam network-first com timeout; mídia usa cache-first. O clique em notificações do Service Worker voltou a navegar para o destino correto.

## Backend

`submit_zuno_stack_result` permanece como endpoint autenticado de resultado. RPCs de sala necessárias ao fluxo atual permanecem autenticadas; funções internas de trigger não são executáveis diretamente por clientes.

## Critérios de aceite

- `ZunoPlay App Smoke` verde
- `Zuno Stack Production Audit` verde
- `ZunoPlay Repository Structure Audit` verde
- nenhuma referência ativa a protótipos/arquivos removidos
- geração `nav.js` / `zuno-current.js` / `sw.js` consistente
- nenhuma credencial server-side no frontend
