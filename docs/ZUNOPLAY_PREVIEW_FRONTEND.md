# Frontend — preparação para desacoplamento

A auditoria anterior identificou referências diretas ao Supabase de produção em `home-app.js`, `login.html` e `zuno-onboarding.js`; `cadastro.html` consome o onboarding.

Antes de alterar, reconfirmar essas referências na main/branch limpa e procurar outras ocorrências. Não assumir que a lista histórica continua completa.
