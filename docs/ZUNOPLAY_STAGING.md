# ZunoPlay — Staging / Preview

Última revisão: 2026-08-30
Fase: 0.3.1
Status: 🟠 PARCIAL

## Backend staging confirmado

- Supabase project: `ZunoPlay Staging`
- Project ref: `lqymrmionvvfbgfrdryo`
- URL: `https://lqymrmionvvfbgfrdryo.supabase.co`
- Organização: `Zuno Play`
- Produção permanece em `rliymfbbhqoejgfvsbuu`.
- O staging foi verificado sem dados de usuários/perfis/mensagens/salas/posts copiados da produção.

## Paridade estrutural comprovada nesta etapa

- 58 tabelas públicas; 58 com RLS habilitado.
- 121 policies públicas.
- 193 funções nos schemas `public`, `private` e `zuno_private`.
- 55 triggers não internos nas tabelas públicas.
- 20 tabelas na publication `supabase_realtime`, igual à produção no inventário verificado.
- Funções públicas SECURITY DEFINER não permanecem executáveis diretamente por `public`, `anon` ou `authenticated` no staging.

Esses números são evidência de inventário, não prova funcional ponta a ponta.

## Pendências obrigatórias

1. O ledger do staging não é o ledger canônico de 237 migrations; não deve ser falsificado para aparentar equivalência.
2. O frontend atual ainda contém referências diretas ao Supabase de produção e não pode ser publicado como preview seguro enquanto isso não for desacoplado.
3. O projeto Vercel hospedado ainda precisa ser criado/vinculado ao `Samurayshon/ZunoPlay` e configurado com variáveis de staging.
4. Ainda faltam URL de Preview acessível, logs de deploy, smoke funcional e regressão de produção.

## Fail-closed

`vercel.json` executa `scripts/vercel-preview-backend-guard.mjs`. O guard rejeita Vercel como produção, exige backend explícito de staging e impede Preview enquanto referências diretas ao project ref de produção permanecerem no frontend.

GitHub Pages continua sendo a produção canônica e o origin Android não deve ser alterado nesta fase.
