# ZunoPlay Games — catálogo atual

Status: **Zuno Stack é o único jogo ativo do ZunoPlay.**

## Jogo ativo

- **Zuno Stack** — puzzle cooperativo de trios com **90 peças em 5 camadas**, **bandeja de 7** e estado de risco a partir de **6/7**, Zuno Relay, Pulse Shift, progressão, recursos sociais e retorno para a sala oficial (`sala.html`).

## Jogos removidos do produto

Zuno Core/Alpha, Zuno Pulse, Zuno Rush, Zuno Caos, Desafio Zuno, Reflexo Zuno, Precisão Zuno, Arena Zuno e Partida Zuno não fazem parte do produto ativo. Suas páginas, scripts, rotas e RPCs exclusivos não devem voltar sem nova decisão explícita de produto.

## Infraestrutura preservada

O produto mantém o Hub de Jogos (`jogos.html`), Zuno Stack, histórico e progressão, integração com a sala oficial, Auth/Realtime, PWA/cache e os workflows de smoke/auditoria de produção.

## Regra de manutenção

Protótipos, shells paralelos, assets substituídos e arquivos de referência antigos não permanecem no caminho de produção por compatibilidade histórica. O CI audita referências locais, geração do frontend, PWA e retorno de arquivos removidos.

A limpeza não exclui registros históricos do banco.
