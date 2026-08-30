# ZunoPlay Staging — Phase 0.3.1

Status: PARCIAL — backend staging provisionado e isolado; preview hospedado ainda não validado.

## Autoridade de ambientes
- Produção frontend canônica: GitHub Pages, branch `main`.
- Produção Supabase: `rliymfbbhqoejgfvsbuu`.
- Staging Supabase dedicado: `lqymrmionvvfbgfrdryo` (`https://lqymrmionvvfbgfrdryo.supabase.co`).
- Vercel não é produção. Seu uso nesta fase é exclusivamente candidato a Preview/Staging.
- O origin Android de produção permanece inalterado.

## Evidência do staging já verificada
- Projeto staging ACTIVE_HEALTHY e distinto de produção.
- 58 tabelas públicas; RLS habilitado nas 58.
- 121 policies.
- 193 funções em `public`, `private` e `zuno_private`.
- 55 triggers não internos em tabelas públicas.
- 20 tabelas na publication `supabase_realtime`.
- 38 funções públicas SECURITY DEFINER sem EXECUTE direto para `public`, `anon` ou `authenticated` após reconciliação.
- Verificações de isolamento encontraram 0 usuários e 0 registros nas tabelas centrais consultadas (`profiles`, `messages`, `rooms`, `moments_posts`).

## Caveat obrigatório: migration ledger
Paridade estrutural não equivale a reprodutibilidade do ledger. O staging foi reconstruído por migrations próprias e sua última contagem verificada em `supabase_migrations.schema_migrations` era 33, enquanto produção/GitHub canônico possuem 237 migrations reconciliadas. Não inserir nem falsificar linhas do ledger para aparentar equivalência.

## Gate de Preview
Um Preview hospedado só poderá ser aceito quando:
1. estiver ligado inequivocamente ao repositório `Samurayshon/ZunoPlay`;
2. usar explicitamente o Supabase staging, nunca produção;
3. possuir URL hospedada e logs de build/deploy;
4. passar smoke test do frontend;
5. não alterar GitHub Pages de produção nem o origin Android.

O guard de Vercel desta fase falha fechado enquanto o frontend continuar acoplado ao Supabase de produção ou enquanto as variáveis de staging não forem fornecidas. Isso é proteção, não prova de Preview funcional.
