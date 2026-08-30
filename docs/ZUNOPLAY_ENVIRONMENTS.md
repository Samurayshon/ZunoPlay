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

## Preview / Staging

**Status: 🟠 PARCIAL — backend dedicado existe; ambiente hospedado canônico ainda não foi validado.**

### Estado comprovado

- A produção continua exclusivamente no GitHub Pages a partir de `main`.
- Backend dedicado de staging: Supabase `ZunoPlay Staging`, project ref `lqymrmionvvfbgfrdryo`, distinto da produção.
- O staging foi auditado sem dados de aplicação copiados da produção e teve RLS/policies/funções/triggers/realtime reconciliados nas dimensões verificadas.
- A execução direta das funções públicas `SECURITY DEFINER` por `public`, `anon` e `authenticated` foi revogada no staging.
- O ledger de migrations do staging ainda não é idêntico ao ledger canônico GitHub/produção. É proibido fabricar equivalência inserindo linhas artificiais no ledger.
- Ainda falta projeto/deploy Vercel hospedado validado, URL acessível, logs e smoke funcional.

### Gate para Vercel Preview

1. projeto ligado inequivocamente ao `Samurayshon/ZunoPlay`;
2. deploy de Preview por branch/PR;
3. URL acessível;
4. backend explícito `lqymrmionvvfbgfrdryo`, nunca produção;
5. logs acessíveis;
6. smoke mínimo;
7. origin Android de produção inalterado.

Até esses itens passarem, nenhum `*.vercel.app` é ambiente oficial.

## Supabase por ambiente

- Produção: `rliymfbbhqoejgfvsbuu`.
- Preview/Staging: `lqymrmionvvfbgfrdryo`.
- Preview deve receber URL e chave publicável explicitamente.
- Chaves secretas/service-role nunca pertencem ao frontend.

## Gate de consistência

- produção permanece GitHub Pages;
- Android `START_URL` e trusted origin permanecem inalterados nesta fase;
- Vercel não pode ser tratado como produção;
- Preview exige backend staging explícito e diferente de produção;
- referência direta ao Supabase de produção no frontend bloqueia o build de Preview;
- nenhuma chave service-role/secret pode ser usada como chave cliente de Preview.
