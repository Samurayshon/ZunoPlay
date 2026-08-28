# Zuno Stack — Auditoria de Produção

## Status
Roadmap funcional do Zuno Stack concluído até a Etapa 8.

## Gameplay validado
- 90 peças por partida
- 5 camadas procedurais
- 10 famílias por partida
- bandeja de 6 espaços com risco em 5/6
- alvo de duração de 4–6 minutos
- combo, Dica, Desfazer e Pulse Shift
- modo solo e cooperação Realtime em sala
- integração social, progressão e conteúdo rotativo

## Performance
- runtime específico para Android/aparelhos modestos
- modo leve automático
- redução de efeitos pesados quando necessário
- tabuleiro montado de forma incremental
- peças em CSS leve sem reintrodução de filtros SVG pesados

## PWA e cache
Os módulos de performance, visual premium, social, progressão e conteúdo precisam permanecer presentes em `nav.js` e no precache de `sw.js`. O workflow `Zuno Stack Production Audit` bloqueia regressões nesses pontos.

## Backend de progressão
`submit_zuno_stack_result` foi atualizado para o tabuleiro atual de 90 peças, limite de score de 25.000 e execução concedida somente a `authenticated`. A função valida `auth.uid()` antes de registrar o resultado.

## Supabase Advisors
A auditoria do projeto detectou avisos globais de segurança para funções `SECURITY DEFINER` expostas a usuários autenticados e avisos de performance em tabelas de salas. Esses avisos abrangem módulos maiores do ZunoPlay e devem permanecer no backlog de auditoria de backend; não são regressões criadas pelo Stack.

Referências de remediação:
- Security Definer executable: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- RLS initplan: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- Foreign keys sem índice: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Critério de aceite da Etapa 8
- `ZunoPlay App Smoke` verde
- `Zuno Stack Production Audit` verde
- nenhuma referência ativa ao Zuno Core
- geração de frontend e service worker consistente
- módulos das Etapas 1–7 presentes, com sintaxe válida e precache correto
