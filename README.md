# ZunoPlay

Aplicativo social/gaming mobile-first com perfis, amigos, mensagens, salas de voz, Pulso, jogos e progressão.

## Estado oficial

O projeto está na **Etapa 19 — Segurança, estabilidade e testes**.

A existência de código, tabelas, migrations, interfaces ou workflows não equivale a funcionalidade validada. O status oficial segue:

- ✅ **VALIDADO** — testado com evidência suficiente;
- 🟡 **IMPLEMENTADO, NÃO VALIDADO** — existe, mas a comprovação funcional ainda é insuficiente;
- 🟠 **PARCIAL** — funciona apenas em parte ou ainda possui dependências importantes;
- 🔴 **QUEBRADO** — falha funcional comprovada;
- ⚫ **NÃO IMPLEMENTADO** — não existe de forma suficiente;
- 🔒 **BLOQUEADO** — não foi possível verificar ou executar por dependência/acesso/ferramenta.

## Produção atual

O frontend consumido pelo aplicativo Android aponta para **GitHub Pages**:

`https://samurayshon.github.io/ZunoPlay/`

O `MainActivity.java` do Android usa esse endereço como `START_URL`. Vercel não deve ser tratado como o host de produção atual sem uma nova mudança de arquitetura e validação correspondente.

O candidato de Preview/Staging usa a configuração raiz `vercel.json` apenas como barreira fail-closed; ela não altera a autoridade de produção do GitHub Pages.

## Evidência técnica já existente

### Segurança e dados

- RLS habilitado nas tabelas públicas auditadas do produto.
- Supabase Auth e perfis integrados ao backend.
- Campos sensíveis de progressão/economia protegidos contra alteração direta comum pelo cliente.
- Usernames case-insensitive protegidos por unicidade no banco atual.
- Não há perfis órfãos conhecidos no banco auditado.
- Mensagens possuem proteção de campos estruturais e autorização por participação.
- Storage `message-media` é privado; teste cross-user no banco confirmou que participante autorizado enxerga o objeto e usuário de fora da conversa não.
- O fluxo legado de `game_scores` teve o `INSERT` direto de `anon`/`authenticated` revogado como contenção para pontuação client-authoritative.
- Pulso impede no banco `visibility='friends'` com `media_path` enquanto o bucket `moments` continuar público, evitando que nova mídia privada seja publicada por URL pública.
- Transferência de ownership de grupos exige conversa do tipo `group`, autenticação, lock da conversa e possui proteção estrutural contra múltiplos owners.

### Realtime e salas

- Presence, Broadcast e Postgres Changes são usados com responsabilidades separadas.
- Tópicos privados de sala e regras server-side possuem cobertura automatizada relevante.
- Há implementação WebRTC P2P e lógica de reconexão.
- Assentos, host/moderação, entrada/saída e recompensas já receberam diversas correções de autorização e idempotência.

### Jogos

- **Zuno Stack é o jogo ativo principal no catálogo atual.**
- O Stack possui guards automatizados para autoridade, estado, relay, tile, host e coerência.
- O fluxo legado do Desafio Zuno não deve voltar a aceitar conclusão/pontuação confiada ao cliente.

### Aura e Autoridade

O conceito oficial de Aura e Autoridade está definido em [`docs/ZUNOPLAY_AURA_SYSTEM_OFFICIAL.md`](docs/ZUNOPLAY_AURA_SYSTEM_OFFICIAL.md).

A fundação técnica já existe no banco (`player_authority`, `authority_transactions`, `authority_match_claims`, progressão/transactions e resultados relacionados) e as superfícies auditadas mantêm escrita sensível server-side. Isso **não significa que o sistema esteja validado ponta a ponta**.

Status atual: **🟡 IMPLEMENTADO, NÃO VALIDADO E2E**.

## Pendências que impedem tratar a Etapa 19 como concluída

- Finalizar a revisão individual da superfície de funções `SECURITY DEFINER` executáveis por usuários autenticados.
- Implementar e validar conclusão server-authoritative/verificável para fluxos de jogos que geram progressão/recompensa.
- Substituir a contenção temporária de mídia privada do Pulso por entrega realmente privada/autorizada (bucket privado ou mecanismo equivalente + URLs/requests autorizados).
- Ativar **Leaked Password Protection** no Supabase Auth.
- Configurar e validar TURN de produção para redes onde P2P direto falha.
- Validar mensagens ponta a ponta em clientes reais, inclusive entregue/lido, anexos, grupos, realtime e reconexão.
- Validar salas/voz com múltiplos clientes, redes diferentes, reconexão e TURN.
- Validar notificações completas, incluindo preferências, realtime/push, badges e deep links.
- Validar Avatar Studio e persistência/integridade de inventário/equipamento.
- Validar sessão/Auth e ciclo de vida de conta ponta a ponta.
- Executar smoke visual/mobile em Android e iPhone reais.
- Fazer PostHog ingerir eventos reais de produção e validar observabilidade.

Enquanto esses itens permanecerem sem evidência suficiente, **Etapa 20 / Release não deve ser declarada pronta**.

## TURN / WebRTC

`voz-sala.js` nunca deve receber segredo permanente de TURN diretamente no GitHub Pages.

O módulo aceita configuração por provider JavaScript ou endpoint autenticado com credenciais temporárias. Se TURN estiver indisponível, a implementação pode tentar conexão direta por STUN, mas isso não substitui a validação de produção em redes restritas.

## Dados de teste

Não executar limpeza destrutiva antes da decisão explícita de lançamento. Os dados atuais continuam sendo usados para testes funcionais e devem ser resetados somente na etapa final de pré-lançamento, com análise de impacto e possibilidade de recuperação.
