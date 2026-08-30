# Nota de implementação — Preview backend

A branch desta fase adiciona somente barreiras e contratos de segurança. Ela não troca automaticamente as credenciais usadas pela produção.

O próximo incremento deve introduzir resolução de configuração de Supabase por ambiente sem quebrar o GitHub Pages atual. O artefato servido no Preview precisa receber `ZUNO_SUPABASE_URL` e uma chave cliente publicável do staging durante o build/deploy, enquanto produção continua usando a configuração canônica atual até migração deliberada e testada.

Não colocar chave service-role/secret no frontend, no repositório ou em arquivos gerados públicos.
