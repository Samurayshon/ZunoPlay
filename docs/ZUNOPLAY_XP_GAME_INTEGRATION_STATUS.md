# ZunoPlay — XP global: gate de integração com jogos

Status atual: 🟠 PARCIAL.

O XP global não deve ser concedido diretamente a partir de resultados de jogo enviados pelo cliente.

## Evidência atual

`submit_zuno_stack_result(p_score, p_matches, p_tiles_cleared, p_won)` recebe o resultado do cliente e valida limites/relações, mas não prova por si só que a partida ocorreu de forma autoritativa. Conectar `private.zuno_award_global_xp` diretamente nesse RPC permitiria farming por chamadas repetidas com resultados plausíveis.

## Regra de integração

Um jogo só pode conceder XP global quando existir um evento de conclusão server-side com identificador único de partida/evento, usuário comprovado, conclusão válida e idempotência. O evento deve ser impossível de fabricar diretamente pelo cliente.

## Próxima condição para integração

Criar/usar o evento autoritativo de conclusão do jogo e, a partir dele, conceder separadamente:

- `game_completed`: +20 XP;
- `game_win_bonus`: +10 XP quando a vitória for validada;
- `first_win_daily`: +30 XP na primeira vitória válida do dia.

Aura/Authority, XP específico do jogo e XP global permanecem sistemas independentes.
