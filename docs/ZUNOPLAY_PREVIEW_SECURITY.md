# Preview Security Invariants

- GitHub Pages é produção canônica nesta fase.
- Vercel não pode assumir `VERCEL_ENV=production` para o ZunoPlay durante a Fase 0.
- Preview não pode usar o project ref Supabase de produção `rliymfbbhqoejgfvsbuu`.
- Staging aprovado nesta etapa: `lqymrmionvvfbgfrdryo`.
- Apenas chave cliente publicável/anon-compatible pode chegar ao frontend.
- Chave service-role, secret key ou credencial server-side nunca pode ser incorporada ao artefato público.
- O Android continua apontando para `https://samurayshon.github.io/ZunoPlay/` até mudança deliberada e validada.
