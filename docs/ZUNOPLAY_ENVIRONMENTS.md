# ZunoPlay — Ambientes Canônicos

Última revisão: 2026-08-30
Fase: 0.3

## Produção

**Status: ✅ VALIDADO COMO HOST/PIPELINE DE PRODUÇÃO ATUAL**

- Plataforma: GitHub Pages
- Repositório: `Samurayshon/ZunoPlay`
- Branch: `main`
- URL canônica: `https://samurayshon.github.io/ZunoPlay/`
- Supabase produção: `rliymfbbhqoejgfvsbuu`
- Android permanece confiando em `samurayshon.github.io` nesta fase.

## Preview / Staging

**Status: 🟠 PARCIAL — backend dedicado existe; Preview hospedado ainda não foi validado.**

- Supabase staging: `ZunoPlay Staging`, ref `lqymrmionvvfbgfrdryo`, separado da produção.
- O staging foi auditado sem dados de aplicação copiados da produção nas verificações realizadas.
- RLS/policies/funções/triggers/realtime foram reconciliados nas dimensões auditadas.
- Execução direta das funções públicas `SECURITY DEFINER` por `public`, `anon` e `authenticated` foi revogada no staging.
- O ledger de migrations do staging ainda difere do ledger canônico GitHub/produção. É proibido fabricar equivalência inserindo linhas artificiais.
- Vercel continua candidato a Preview/Staging, não produção.

### Gate do Preview hospedado

1. projeto Vercel ligado inequivocamente ao `Samurayshon/ZunoPlay`;
2. deploy de branch/PR;
3. URL acessível;
4. backend explícito `lqymrmionvvfbgfrdryo`, nunca produção;
5. logs de build/deploy;
6. smoke mínimo;
7. origin Android de produção inalterado.

Até esses critérios passarem, nenhum `*.vercel.app` é ambiente oficial do ZunoPlay.

## Invariantes

- GitHub Pages permanece produção.
- Vercel não pode ser tratado como produção nesta fase.
- Preview exige backend staging explícito e diferente de `rliymfbbhqoejgfvsbuu`.
- Referência direta ao Supabase de produção no frontend bloqueia build de Preview.
- Chaves service-role/secret são proibidas no frontend.
