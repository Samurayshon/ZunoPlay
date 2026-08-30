# ZunoPlay — Ambientes Canônicos

Última revisão: 2026-08-30
Fase: 0.3.1

## Regra de autoridade

Produção canônica permanece GitHub Pages em `main`: `https://samurayshon.github.io/ZunoPlay/`, usando Supabase produção `rliymfbbhqoejgfvsbuu`.

## Preview / Staging

**Status: 🟠 PARCIAL — backend staging provisionado e isolado; host de preview ainda bloqueado.**

Backend staging permanente: Supabase `lqymrmionvvfbgfrdryo` (`ZunoPlay Staging`). Ele é distinto da produção e não contém dados produtivos. A reconciliação estrutural validou 58/58 tabelas públicas com RLS, 121 policies, 193 funções nos schemas relevantes, 55 triggers e 20 tabelas no realtime. Funções `SECURITY DEFINER` públicas foram privadas de EXECUTE direto para PUBLIC/anon/authenticated no staging.

O staging não é produção e não deve receber dados privados copiados da produção.

### Fail-closed para Vercel

`vercel.json` executa `scripts/vercel-preview-backend-guard.mjs`. Vercel Production é rejeitado; Preview exige `ZUNO_SUPABASE_URL` e `ZUNO_SUPABASE_PUBLISHABLE_KEY`; o project ref de produção é proibido; e o deploy falha enquanto artefatos frontend ainda contiverem referência direta ao Supabase de produção.

### Bloqueadores restantes

1. equipe Vercel `ZunoPlay` ainda não possui projeto ligado inequivocamente a `Samurayshon/ZunoPlay`;
2. frontend servido no preview ainda precisa ser desacoplado das referências hardcoded de produção;
3. faltam deploy de branch/PR, URL hospedada, logs e smoke real;
4. o ledger interno do staging foi reconstruído operacionalmente e não deve ser declarado historicamente idêntico ao ledger canônico de produção sem reconciliação própria.

Até esses itens passarem, nenhum `*.vercel.app` é ambiente oficial do ZunoPlay.

## Android

O origin de produção usado pelo Android permanece `https://samurayshon.github.io/ZunoPlay/`. Esta fase não autoriza alterar `START_URL`, allowlist ou trusted media origin.

## Gate

Preview/Staging só será ✅ VALIDADO após projeto hospedado, backend isolado explícito, logs de deploy, smoke funcional e confirmação de que produção/Android não sofreram regressão.
