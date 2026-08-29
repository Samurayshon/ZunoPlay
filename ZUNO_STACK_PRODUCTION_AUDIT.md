# Zuno Stack — Auditoria de Produção Atual

## Estado funcional

O Zuno Stack é o único jogo ativo do catálogo. A geração atual usa 90 peças distribuídas em 5 camadas, bandeja de 7 espaços, risco a partir de 6/7, alvo de 4–6 minutos, combo, Dica, Desfazer, Pulse Shift, Relay e cooperação em tempo real quando existe contexto de sala.

## Runtime atual

O núcleo é `zuno-stack.js` + `zuno-stack-pieces.js/css`. A interface atual utiliza as camadas de lobby fullscreen/v2/closeout, gameplay state/v1/polish/immersive, identidade de marca e movimento de arena. Módulos de performance, social, progressão, conteúdo, mobile, objetivo cooperativo e Relay avançado são carregados pelo `nav.js`.

Os antigos sprites `zuno-stack-pieces.svg/webp` e as folhas `zuno-stack-layout-v1.css`, `zuno-stack-visual.css`, `zuno-stack-visual-final.css` e `zuno-stack-lobby.css` não pertencem mais à geração atual.

## PWA

A geração v279 usa precache tolerante a falhas, timeout de rede e fallback de cache. Falha de um asset não aborta mais toda a instalação do Service Worker. Scripts, CSS e navegações usam network-first com timeout; mídia usa cache-first. O clique em notificações do Service Worker voltou a navegar para o destino correto.

## Backend e recompensas

As partidas continuam usando os RPCs autenticados de sala necessários ao fluxo cooperativo; funções internas de trigger não são executáveis diretamente por clientes.

`submit_zuno_stack_result` está deliberadamente revogado de `anon` e `authenticated`. O resultado anterior era calculado a partir de score, trios e peças fornecidos pelo cliente e não constitui prova server-authoritative de uma partida concluída. Reabrir esse RPC sem um protocolo de partida verificável reintroduziria manipulação de XP/recompensas.

Enquanto esse protocolo não existir, o runtime salva o último resultado apenas localmente em `zunoplay_zuno_stack_last_result` e informa explicitamente que o XP está suspenso. O cliente não deve chamar `submit_zuno_stack_result`.

## Critérios de aceite

- `ZunoPlay App Smoke` verde
- `Zuno Stack Production Audit` verde
- `ZunoPlay Repository Structure Audit` verde
- nenhuma referência ativa a protótipos/arquivos removidos
- geração `nav.js` / `zuno-current.js` / `sw.js` consistente
- nenhuma credencial server-side no frontend
- nenhuma chamada browser/app para `submit_zuno_stack_result` enquanto a validação server-authoritative não existir
- progressão/recompensas do Zuno Stack permanecem classificadas como parcial até existir protocolo verificável e teste ponta a ponta
