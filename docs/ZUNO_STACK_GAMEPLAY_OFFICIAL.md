# Zuno Stack — Gameplay Oficial

Status: arquitetura oficial consolidada em 2026-08-29 e validada em Android.

## Princípio
O lobby aprovado permanece separado. Durante a partida, o Zuno Stack usa uma única camada oficial de apresentação e experiência sobre o motor `zuno-stack.js`.

## Arquivos oficiais de gameplay
- `zuno-stack-gameplay-official.css` — layout, arena, HUD, peças, Bandeja, Relay, poderes, feedback e estados visuais.
- `zuno-stack-gameplay-official.js` — estado visual da partida, pilhas, combo, pressão, Pulse, Explosão, Gelo, ritmo, eventos, áudio/haptics e integração com o motor.
- `zuno-stack-coop-official.js` — sincronização visual de equipe e Relay.
- `zuno-stack-progression-official.js` — resumo e progressão complementar de resultado.
- `zuno-stack-modes-official.js` — contrato de modos (`classic`, `coop`, `rush`, `daily`).
- `zuno-stack-performance-official.js` — degradação de efeitos e pausa de animações em background.

## Fases
1. Consolidação arquitetural — concluída no runtime. As camadas experimentais antigas não são mais carregadas pelo `zuno-stack.html`.
2. Tabuleiro por pilhas — concluído visualmente sobre as 5 camadas reais do motor; bloqueio continua sendo determinado pela lógica real.
3. Layout definitivo — concluído: meta/tempo, trio de jogadores, Pedido Pulse, arena dominante, laterais flutuantes, Bandeja, Relay e ferramentas.
4. Sistema de peças — concluído: estados disponível/bloqueado/removido, profundidade, offsets orgânicos, seleção e dica.
5. Bandeja — integrada aos 7 espaços reais e ao cálculo de pressão/risco.
6. Combo — detecção de trio e janela de combo com feedback visual, sonoro e háptico.
7. Zuno Pulse — integrado ao botão Pulse real do motor.
8. Habilidades — Pulse, Explosão (trio visível) e Gelo (+5s/congelamento de pressão) implementados na camada oficial.
9. Pedido Pulse — progresso por trios integrado ao HUD.
10. Cooperação — HUD reflete membros reais disponibilizados pelo motor.
11. Zuno Relay — preserva o Relay real e adiciona feedback de atualização/envio/retirada.
12. Pressão — estados BAIXA, MÉDIA, ALTA e CRÍTICA por Bandeja/progresso/tempo.
13. Ritmo — fases de abertura, desenvolvimento, pressão e clímax; cronômetro oficial visual de 5 minutos, com Rush preparado para 3 minutos.
14. Eventos — eventos dinâmicos ligados ao estado e à fase da partida, preservando os eventos do motor oficial.
15. Som/haptics — feedback WebAudio leve e vibração quando suportada.
16. Vitória/derrota — resultado do motor preservado e enriquecido.
17. Progressão — partidas, vitórias, XP, nível, sequência e conquistas complementares locais; não substitui persistência principal.
18. Modos — contrato oficial criado para classic/coop/rush/daily; Solo/Coop são os modos estáveis atuais.
19. Performance — otimização validada em Android: modo lite/mobile, redução de observers globais, polling agressivo e efeitos caros.
20. Consolidação — concluída. `zuno-stack.html` carrega apenas o gameplay oficial e as antigas camadas experimentais de gameplay V1–V8 foram removidas fisicamente após validação em dispositivo.

## Regras de manutenção
- Não adicionar novas camadas `vN` de gameplay.
- Evoluir somente os arquivos `*-official.*`.
- Não alterar o lobby aprovado ao trabalhar no gameplay.
- Toda nova habilidade deve manipular o motor real ou declarar explicitamente quando for apenas apresentação.
- Evitar `MutationObserver` que reescreva continuamente o mesmo DOM; atualizações devem ser idempotentes.
- Validar mudanças de gameplay em Android antes de consolidá-las como oficiais.
