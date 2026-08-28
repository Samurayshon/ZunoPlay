# ZunoPlay Games — catálogo atual

Status: **Zuno Stack é o único jogo ativo do ZunoPlay.**

## Decisão de produto

O catálogo foi simplificado para concentrar desenvolvimento, estabilidade e qualidade exclusivamente no **Zuno Stack**.

## Jogo ativo

- **Zuno Stack** — puzzle de trios com 54 peças em camadas, bandeja de 7, Zuno Relay, Pulse Shift, progressão e retorno para salas.

## Jogos removidos do produto

- protótipo Zuno Core e todas as suas versões Alpha
- Zuno Pulse
- Zuno Rush
- Zuno Caos
- Desafio Zuno
- Reflexo Zuno
- Precisão Zuno
- Arena Zuno
- Partida Zuno multiplayer

As páginas, scripts e rotas desses jogos não fazem parte do produto ativo e não devem voltar como dependências críticas.

## Infraestrutura preservada

- Hub de Jogos (`jogos.html`)
- Zuno Stack e peças premium
- Histórico de resultados, exibindo o ciclo ativo
- Progressão geral de Jogos
- Retorno para a sala
- Supabase/Auth/Realtime compartilhados pelo restante do ZunoPlay
- PWA/cache
- CI/smoke checks

O botão **Jogar** dentro de uma sala abre diretamente o Zuno Stack.

## Dados históricos

A limpeza do produto não executa exclusão destrutiva no banco. Registros históricos podem permanecer armazenados para rastreabilidade, mas jogos removidos não aparecem no catálogo ativo.

## Próximo marco

Evoluir o **Zuno Stack** como a única experiência de jogo do ZunoPlay, priorizando estabilidade mobile, qualidade visual, cooperação, progressão e multiplayer real quando a base estiver suficientemente estável.
