# Risco controlado — Preview

Risco principal identificado: um host de Preview executar o frontend atual com credenciais/referências do Supabase de produção e produzir tráfego de teste contra dados reais.

Mitigação atual: fail-closed antes do deploy Vercel e staging dedicado. Mitigação ainda incompleta: o frontend precisa resolver a configuração por ambiente.

Por isso, criar um deploy Vercel antes do desacoplamento não é uma forma aceitável de testar o Preview.
