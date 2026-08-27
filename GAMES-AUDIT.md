# ZunoPlay Games — Auditoria final (Módulo 7/7)

Status: concluído para beta social.

## Sistemas auditados

- Hub oficial de Jogos
- Desafio Zuno 2.0
- Partida Zuno multiplayer
- Reflexo Zuno
- Precisão Zuno
- Arena Zuno
- XP e Nível de Jogos
- Conquistas
- Histórico
- Desafios entre amigos
- Ranking global e de amigos
- Compartilhamento de resultados
- Retorno/preservação de sala
- Realtime de partidas
- PWA/cache
- CI/smoke checks

## Correções do Módulo 7

- RPCs de Jogos não são mais executáveis pelo papel anônimo.
- Índice adicionado para `game_match_results.room_id`.
- RLS de `game_challenges` otimizada para não reavaliar `auth.uid()` por linha.
- CI agora valida também JavaScript inline das páginas de Jogos.
- Correção visual do CSS do logo oficial no bootstrap global.
- Cache/asset version atualizado para v130.

## Segurança

As RPCs `SECURITY DEFINER` usadas pelo frontend permanecem executáveis somente por usuários autenticados quando isso é intencional. Todas validam identidade/participação dentro da função e não devem ser expostas ao papel `anon`.

## Limitação conhecida — anti-cheat

Os jogos atuais executam a mecânica no cliente. As RPCs validam autenticação, faixa de valores, jogo permitido, progressão e duplicidade quando aplicável, mas um cliente deliberadamente modificado ainda pode tentar enviar resultados falsos dentro das faixas aceitas.

Por isso, o sistema atual é adequado para beta social, XP casual, desafios e rankings sem recompensa econômica. Antes de ligar Zuno Coins, prêmios, torneios oficiais ou qualquer recompensa de valor ao resultado dos jogos, migrar a validação competitiva para uma arquitetura server-authoritative (sessão de partida emitida pelo servidor, estado/seed controlado pelo servidor e validação de eventos/resultados).

## Bloqueadores externos ao módulo Jogos

- Ativar Leaked Password Protection no Supabase Auth antes de lançamento público.
- TURN continua sendo requisito de produção da experiência de voz, mas não bloqueia o módulo Jogos isoladamente.

## Resultado

Módulos de Jogos 1–7 concluídos para beta social. Próxima expansão deve acontecer somente após testes reais em múltiplos dispositivos e, se houver economia/prêmios, implementação do anti-cheat server-authoritative.
