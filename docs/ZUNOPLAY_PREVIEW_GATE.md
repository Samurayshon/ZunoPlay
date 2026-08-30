# ZunoPlay — Gate de Preview

Fase 0.3.1

Este gate não declara Preview implementado.

Para VALIDAR ZUN-47 são obrigatórios, em ordem:

1. backend staging isolado e inventariado;
2. frontend sem acoplamento direto ao Supabase de produção no artefato de Preview;
3. projeto Vercel inequivocamente ligado a `Samurayshon/ZunoPlay`;
4. variáveis de Preview apontando para `lqymrmionvvfbgfrdryo` com chave cliente publicável, nunca secret/service role;
5. deploy de branch/PR com URL acessível;
6. logs de build/deploy verdes;
7. smoke de autenticação/navegação compatível com o escopo disponível;
8. regressão confirmando GitHub Pages e origin Android inalterados.

Até todos passarem, ZUN-47 permanece 🟠 PARCIAL ou 🔒 BLOQUEADO no item específico.
