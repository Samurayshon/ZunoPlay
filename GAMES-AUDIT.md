# ZunoPlay Games — catálogo atual

Status: **Zuno Stack é o único jogo ativo do ZunoPlay.**

## Decisão de produto

O catálogo foi simplificado para concentrar desenvolvimento, estabilidade e qualidade exclusivamente no **Zuno Stack**.

## Jogo ativo

- **Zuno Stack** — puzzle cooperativo de trios com **90 peças em 5 camadas**, **bandeja de 6**, Zuno Relay, Pulse Shift, progressão, recursos sociais e retorno para a sala oficial (`sala.html`).

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

As páginas, scripts, rotas e RPCs exclusivamente ligadas a experiências removidas não devem voltar ao frontend ativo sem uma nova decisão explícita de produto.

## Infraestrutura preservada

- Hub de Jogos (`jogos.html`)
- Zuno Stack e peças premium
- Histórico de resultados do ciclo ativo
- Progressão geral de Jogos
- Integração jogo ↔ sala oficial (`sala.html`)
- Supabase/Auth/Realtime compartilhados pelo restante do ZunoPlay
- PWA/cache
- CI/smoke checks e auditoria de produção do Stack

O botão **Jogar** dentro de uma sala abre diretamente o Zuno Stack e o retorno utiliza a sala oficial, não shells/protótipos antigos.

## Dados históricos

A limpeza do produto não executa exclusão destrutiva no banco. Registros históricos podem permanecer armazenados para rastreabilidade, mas jogos removidos não aparecem no catálogo ativo.

## Regra de manutenção

Protótipos, shells paralelos e arquivos de referência antigos não devem permanecer no caminho de produção apenas por compatibilidade histórica. Quando uma implementação for substituída, o CI deve bloquear referências órfãs e rotas para arquivos removidos.

## Próximo marco

Evoluir o **Zuno Stack** como a única experiência de jogo do ZunoPlay, priorizando estabilidade mobile, qualidade visual, cooperação, progressão e multiplayer real quando a base estiver suficientemente estável.
