# ZunoPlay Preview Runtime Isolation

## Authority

- Canonical production frontend: GitHub Pages from `main`.
- Canonical production backend: Supabase `rliymfbbhqoejgfvsbuu`.
- Hosted Preview/Staging backend: Supabase `lqymrmionvvfbgfrdryo`.
- Vercel is Preview/Staging only. Vercel production deployments are rejected by the build guard.

## Runtime contract

`zuno-runtime-injected.js` is a committed empty placeholder in source control. During a Vercel Preview build, `scripts/vercel-preview-backend-guard.mjs` replaces it with a generated browser configuration sourced from Vercel environment variables.

Required Preview environment variables:

- `ZUNO_SUPABASE_URL`
- `ZUNO_SUPABASE_PUBLISHABLE_KEY`

The publishable key is client-side configuration. Service-role/secret keys are forbidden.

The generated configuration must point to a non-production Supabase project. The guard rejects the production project reference and rejects Vercel Production.

## Load order

Home (`index.html`), Login (`login.html`) and Cadastro/Onboarding (`cadastro.html`) load:

1. Supabase browser client where required;
2. `zuno-runtime-injected.js`;
3. `zuno-runtime-config.js`;
4. application consumers.

On canonical GitHub Pages production, the placeholder remains empty and `zuno-runtime-config.js` selects the production backend. Outside canonical production, runtime authority fails closed unless an injected non-production configuration exists.

## Cache isolation

`sw.js` treats both runtime configuration files as network-only. They are not allowed to fall back to a stale cached environment configuration.

## Validation gate

`Preview Runtime Injection Guard` verifies load order, cache isolation, placeholder safety, guard self-tests, production coupling audit, generation of staging configuration, and absence of the production project reference from the generated Preview configuration.

This contract does not by itself validate Phase 0.3.1. Final validation still requires a real hosted Preview URL, deployment/build evidence, frontend smoke testing, confirmation that runtime requests use staging rather than production, and confirmation that canonical GitHub Pages/Android production remain unaffected.
