# ZunoPlay — Ambientes Canônicos

Última revisão: 2026-08-30
Fase: 0.3

## Regra de autoridade

Este documento é a fonte operacional para decidir **onde cada versão do ZunoPlay existe**.

Nenhum host pode ser chamado de produção ou preview apenas porque existe um deploy. A autoridade depende da função registrada aqui e de validação correspondente.

## Produção

**Status: ✅ VALIDADO COMO HOST/Pipeline DE PRODUÇÃO ATUAL**

- Plataforma: **GitHub Pages**
- Repositório: `Samurayshon/ZunoPlay`
- Branch de release: `main`
- URL canônica: `https://samurayshon.github.io/ZunoPlay/`
- Backend Supabase de produção: `rliymfbbhqoejgfvsbuu`
- Consumidor Android atual: `android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java`

### Pipeline atual

`PR -> guards/CI -> merge em main -> GitHub Pages build -> artifact -> deploy -> https://samurayshon.github.io/ZunoPlay/`

Evidência da Fase 0.3: o commit `5493dd2a336c167214eee1a56857705d8e7ab6dc` disparou o workflow dinâmico `pages build and deployment`; os jobs `build`, `report-build-status` e `deploy` terminaram com sucesso e o deploy reportou a URL canônica acima.

### Regra de promoção

- Pull requests **não são produção**.
- Branches diferentes de `main` **não são produção**.
- Somente um commit já integrado ao `main` e posteriormente implantado com sucesso no GitHub Pages pode ser tratado como versão publicada atual.
- CI verde sem deploy Pages verde não prova produção.

### Rollback

GitHub Pages não é tratado como mecanismo de rollback instantâneo por alias.

O rollback canônico é:

1. identificar o último commit conhecido como estável;
2. criar um revert explícito por Git/PR, sem force-push de `main`;
3. executar os gates obrigatórios;
4. integrar o revert em `main`;
5. exigir novo `pages build and deployment` verde;
6. executar smoke de produção.

Um rollback ainda precisa ser validado funcionalmente antes da release final; a existência deste procedimento não equivale a rollback testado.

## Preview / Staging

**Status: 🔒 BLOQUEADO / ⚫ NÃO IMPLEMENTADO COMO AMBIENTE HOSPEDADO CANÔNICO**

### Estado comprovado

- A equipe Vercel conectada `ZunoPlay` (`team_rQJUMNNsTXbapn4YAGqdoEGa`) está no plano Hobby e possui **0 projetos** na auditoria de 2026-08-30.
- Portanto não existe deploy Vercel do ZunoPlay que possa ser declarado preview, staging ou produção.
- O GitHub Pages atual publica produção a partir de `main`.
- O input `preview` de `actions/deploy-pages` continua documentado pelo próprio projeto da action como alpha e não disponível publicamente; ele não será usado como falsa solução de preview por PR.

### Autoridade planejada

**Vercel será candidato preferencial para Preview/Staging**, não para substituir a produção atual nesta fase.

Para ser promovido de candidato para ambiente canônico, precisa existir evidência de:

1. projeto Vercel ligado inequivocamente ao `Samurayshon/ZunoPlay`;
2. deploy de Preview por branch/PR;
3. URL de preview acessível;
4. configuração explícita para usar backend de teste/staging, nunca produção por acidente;
5. logs de build/deploy acessíveis;
6. smoke mínimo do frontend;
7. ausência de alteração do origin de produção usado pelo Android.

Até esses itens passarem, **nenhum `*.vercel.app` é ambiente oficial do ZunoPlay**.

## Desenvolvimento

**Status: ambiente de trabalho, não release.**

Execuções locais, ambientes descartáveis de CI e bancos temporários servem para desenvolvimento/teste. Eles não podem ser citados como prova de produção.

## Supabase por ambiente

### Produção

- Project ref: `rliymfbbhqoejgfvsbuu`
- Alterações de schema devem seguir o ledger versionado e gates de segurança.

### Preview/Staging

Ainda não há backend canônico permanente validado para preview/staging. Um preview hospedado não deve apontar automaticamente para produção sem decisão e teste explícitos.

## Vercel

**Status operacional atual: ⚫ NÃO IMPLEMENTADO para ZunoPlay nesta equipe.**

A existência da integração Vercel ou da equipe `ZunoPlay` não é evidência de projeto/deployment. Na auditoria da Fase 0.3, `list_projects` retornou lista vazia.

Migrar a produção para Vercel futuramente exigirá uma mudança deliberada de arquitetura e validação do Android, porque o app atual fixa `START_URL`, allowlist de host e trusted origin em `samurayshon.github.io`.

## Gate de consistência

O workflow `Environment Authority Guard` protege as invariantes mínimas:

- URL canônica registrada neste documento;
- README aponta GitHub Pages como produção atual;
- Android `START_URL` continua igual à URL canônica;
- `samurayshon.github.io` continua na allowlist e como trusted origin;
- não existe `.vercel/project.json` sem que este contrato seja deliberadamente atualizado.

Se a arquitetura mudar, o guard deve ser alterado **na mesma PR** que muda a autoridade dos ambientes, com nova evidência funcional.
