# ZunoPlay — Ambientes Canônicos

Última revisão: 2026-08-30
Fase: 0.3

## Regra de autoridade

Este documento é a fonte operacional para decidir **onde cada versão do ZunoPlay existe**.

Nenhum host pode ser chamado de produção ou preview apenas porque existe um deploy. A autoridade depende da função registrada aqui e de validação correspondente.

## Produção

**Status: ✅ VALIDADO COMO HOST/PIPELINE DE PRODUÇÃO ATUAL**

- Plataforma: **GitHub Pages**
- Repositório: `Samurayshon/ZunoPlay`
- Branch de release: `main`
- URL canônica: `https://samurayshon.github.io/ZunoPlay/`
- Backend Supabase de produção: `rliymfbbhqoejgfvsbuu`
- Consumidor Android atual: `android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java`

### Pipeline atual

`PR -> guards/CI -> merge em main -> GitHub Pages build -> artifact -> deploy -> https://samurayshon.github.io/ZunoPlay/`

### Regra de promoção

- Pull requests **não são produção**.
- Branches diferentes de `main` **não são produção**.
- Somente um commit integrado ao `main` e implantado com sucesso no GitHub Pages pode ser tratado como versão publicada atual.
- CI verde sem deploy Pages verde não prova produção.

## Preview / Staging

**Status: 🟠 PARCIAL — backend dedicado existe; ambiente hospedado canônico ainda não foi validado.**

### Estado comprovado

- A produção continua exclusivamente no GitHub Pages a partir de `main`.
- Backend dedicado de staging: Supabase `ZunoPlay Staging`, project ref `lqymrmionvvfbgfrdryo`, distinto da produção.
- O staging foi auditado sem dados de aplicação copiados da produção e teve RLS/policies/funções/triggers/realtime reconciliados nas dimensões verificadas.
- A execução direta das funções públicas `SECURITY DEFINER` por `public`, `anon` e `authenticated` foi revogada no staging.
- O ledger de migrations do staging ainda não é idêntico ao ledger canônico GitHub/produção. Essa diferença deve permanecer explícita; é proibido fabricar equivalência inserindo linhas artificiais no ledger.
- Ainda falta projeto/deploy Vercel hospedado validado, URL acessível, logs e smoke funcional.

### Autoridade planejada

**Vercel permanece candidato preferencial para Preview/Staging**, não para substituir a produção atual nesta fase.

Para ser promovido a ambiente canônico, precisa existir evidência de:

1. projeto Vercel ligado inequivocamente ao `Samurayshon/ZunoPlay`;
2. deploy de Preview por branch/PR;
3. URL de preview acessível;
4. configuração explícita usando `lqymrmionvvfbgfrdryo`, nunca produção por acidente;
5. logs de build/deploy acessíveis;
6. smoke mínimo do frontend;
7. ausência de alteração do origin de produção usado pelo Android.

Até esses itens passarem, **nenhum `*.vercel.app` é ambiente oficial do ZunoPlay**.

## Supabase por ambiente

### Produção

- Project ref: `rliymfbbhqoejgfvsbuu`
- Alterações de schema devem seguir o ledger versionado e gates de segurança.

### Preview/Staging

- Project ref dedicado: `lqymrmionvvfbgfrdryo`
- O frontend de Preview deve receber URL e chave publicável explicitamente para este ambiente.
- Chaves secretas/service-role nunca pertencem ao frontend.
- O backend dedicado existe, mas isso isoladamente não valida o Preview hospedado.

## Vercel

**Status operacional atual: 🟠 PREPARAÇÃO DE PREVIEW; deploy hospedado ainda não validado.**

O código deve falhar fechado se uma tentativa de Preview não fornecer explicitamente o backend staging ou ainda contiver acoplamento frontend ao projeto Supabase de produção.

Migrar a produção para Vercel futuramente exigirá mudança deliberada de arquitetura e validação do Android, porque o app atual fixa `START_URL`, allowlist de host e trusted origin em `samurayshon.github.io`.

## Gate de consistência

O workflow `Environment Authority Guard` protege as invariantes de produção. O `Preview Backend Isolation Guard` protege Preview/Staging.

Invariantes:

- produção permanece GitHub Pages;
- Android `START_URL` e trusted origin permanecem inalterados nesta fase;
- Vercel não pode ser tratado como produção;
- Preview exige backend staging explícito e diferente de `rliymfbbhqoejgfvsbuu`;
- referência direta ao Supabase de produção no frontend bloqueia o build de Preview;
- nenhuma chave service-role/secret pode ser usada como chave cliente de Preview.

Se a arquitetura mudar, os guards e este contrato devem ser alterados **na mesma PR**, com nova evidência funcional.
