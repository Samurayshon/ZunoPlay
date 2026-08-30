# Nota sobre ledger do staging

O staging foi reconstruído/reconciliado parcialmente durante a Fase 0.3.1 e seu `supabase_migrations.schema_migrations` não contém o ledger canônico de 237 migrations da produção/GitHub.

Não inserir versões falsas apenas para igualar contagem. Paridade de estado e replay canônico são problemas distintos. O fechamento futuro desse desvio deve preservar integridade histórica e ser tratado com evidência própria.
