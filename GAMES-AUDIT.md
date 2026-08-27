# ZunoPlay Games — Reset do catálogo

Status: **Zuno Stack é o único jogo ativo**.

## Decisão de produto

O catálogo anterior foi removido para concentrar desenvolvimento e qualidade em duas frentes:

1. evoluir o **Zuno Stack**;
2. criar um novo **jogo carro-chefe exclusivo do ZunoPlay**.

## Jogo ativo

- **Zuno Stack** — puzzle de trios com 54 peças em camadas, bandeja de 7, Zuno Relay, Pulse Shift, progressão e retorno para salas.

## Jogos removidos do produto

- Zuno Pulse
- Zuno Rush
- Zuno Caos
- Desafio Zuno
- Reflexo Zuno
- Precisão Zuno
- Arena Zuno
- Partida Zuno multiplayer

As páginas e scripts desses jogos não devem existir no catálogo nem voltar como dependências críticas no CI.

## Infraestrutura preservada

- Hub de Jogos (`jogos.html`)
- Zuno Stack
- Histórico de resultados
- Progressão geral de Jogos
- Retorno para a sala
- Supabase/Auth/Realtime compartilhados pelo restante do ZunoPlay
- PWA/cache
- CI/smoke checks

O botão **Jogar** dentro de uma sala passa a abrir diretamente o Zuno Stack enquanto o novo carro-chefe não é definido.

## Dados legados

Nenhum dado histórico do banco foi apagado nesta limpeza. Resultados antigos podem permanecer no histórico para testes e rastreabilidade. Qualquer exclusão destrutiva de dados deve acontecer somente por decisão explícita separada.

## Próximo marco

Definir o conceito do novo jogo carro-chefe antes de iniciar implementação. A escolha deve priorizar:

- identidade própria do ZunoPlay;
- multiplayer/social como parte central da mecânica;
- partidas curtas e alta rejogabilidade;
- mobile-first;
- visual forte e reconhecível;
- potencial para temporadas, progressão e cosméticos sem pay-to-win.
