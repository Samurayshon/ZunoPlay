# ZunoPlay — Ambientes Canônicos

Última revisão: 2026-08-30
Fase: 0.3.1

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

**Status: 🔒 BLOQUEADO / 🟠 PREPARAÇÃO DE SEGURANÇA PARCIAL**

### Estado comprovado

- A equipe Vercel conectada `ZunoPlay` (`team_rQJUMNNsTXbapn4YAGqdoEGa`) está no plano Hobby e possui **0 projetos** na auditoria de 2026-08-30.
- Portanto não existe deploy Vercel do ZunoPlay que possa ser declarado preview, staging ou produção.
- O GitHub Pages atual publica produção a partir de `main`.
- O input `preview` de `actions/deploy-pages` continua documentado pelo próprio projeto da action como alpha e não disponível publicamente; ele não será usado como falsa solução de preview por PR.
- A auditoria da Fase 0.3.1 confirmou que o frontend ainda contém referências diretas ao Supabase de produção `rliymfbbhqoejgfvsbuu`, inclusive em autenticação/onboarding. Logo, espelhar o código atual em outro host sem isolamento faria o preview falar com produção.

### Fail-closed para Vercel

Enquanto o backend de staging não estiver definido e o frontend não estiver desacoplado do project ref de produção:

- `vercel.json` executa `scripts/vercel-preview-backend-guard.mjs` antes de qualquer deploy Vercel;
- Vercel com `VERCEL_ENV=production` é rejeitado, pois GitHub Pages continua sendo a autoridade de produção;
- Preview/Staging exige `ZUNO_SUPABASE_URL` e `ZUNO_SUPABASE_PUBLISHABLE_KEY` explícitos;
- a URL de staging não pode conter o project ref de produção;
- o source scan rejeita deploy se arquivos frontend ainda contiverem o project ref de produção;
- o workflow `Preview Backend Isolation Guard` testa as regras e prova que um preview sem configuração falha fechado.

Esse mecanismo é uma barreira de segurança. Ele **não** equivale a Preview/Staging implementado ou funcional.

### Autoridade planejada

**Vercel será candidato preferencial para Preview/Staging**, não para substituir a produção atual nesta fase.

Para ser promovido de candidato para ambiente canônico, precisa existir evidência de:

1. projeto Vercel ligado inequivocamente ao `Samurayshon/ZunoPlay`;
2. deploy de Preview por branch/PR;
3. URL de preview acessível;
4. configuração explícita para usar backend de teste/staging, nunca produção por acidente;
5. logs de build/deploy acessíveis;
6. smoke mínimo do frontend;
7. ausência de alteração do origin de produção usado pelo Android;
8. frontend sem referências diretas ao project ref de produção nos artefatos servidos pelo preview.

Até esses itens passarem, **nenhum `*.vercel.app` é ambiente oficial do ZunoPlay**.

## Desenvolvimento

**Status: ambiente de trabalho, não release.**

Execuções locais, ambientes descartáveis de CI e bancos temporários servem para desenvolvimento/teste. Eles não podem ser citados como prova de produção.

## Supabase por ambiente

### Produção

- Project ref: `rliymfbbhqoejgfvsbuu`
- Alterações de schema devem seguir o ledger versionado e gates de segurança.

### Preview/Staging

Ainda não há backend canônico permanente validado para preview/staging.

Durante a Fase 0.3.1 foram encontrados dois candidatos técnicos, nenhum promovido:

- o projeto `ZunoPlay Phase0 Baseline Validation` (`gqynsjstcqktobhgembn`) existe, mas está `INACTIVE` e foi criado para validação do baseline, não para staging permanente;
- Supabase oferece development branches/projetos novos, mas sua criação exige confirmação explícita de custo e organização.

Nenhum dos dois pode ser promovido silenciosamente. Um preview hospedado deve permanecer bloqueado até existir backend isolado validado.

## Vercel

**Status operacional atual: ⚫ NÃO IMPLEMENTADO para ZunoPlay nesta equipe.**

A existência da integração Vercel ou da equipe `ZunoPlay` não é evidência de projeto/deployment. Na auditoria da Fase 0.3.1, `list_projects` continuou retornando lista vazia.

A integração disponível nesta execução não expõe ação parametrizada de criar/importar projeto a partir de `Samurayshon/ZunoPlay`; a CLI Vercel e automação de navegador também não estavam disponíveis/autenticadas no ambiente de execução. Por isso nenhum deploy genérico foi disparado.

Migrar a produção para Vercel futuramente exigirá uma mudança deliberada de arquitetura e validação do Android, porque o app atual fixa `START_URL`, allowlist de host e trusted origin em `samurayshon.github.io`.

## Gate de consistência

O workflow `Environment Authority Guard` protege as invariantes mínimas:

- URL canônica registrada neste documento;
- README aponta GitHub Pages como produção atual;
- Android `START_URL` continua igual à URL canônica;
- `samurayshon.github.io` continua na allowlist e como trusted origin;
- não existe `.vercel/project.json` sem que este contrato seja deliberadamente atualizado.

O workflow `Preview Backend Isolation Guard` protege o fail-closed do candidato Vercel enquanto a separação de backend não foi concluída.

Se a arquitetura mudar, os guards devem ser alterados **na mesma PR** que muda a autoridade dos ambientes, com nova evidência funcional.
