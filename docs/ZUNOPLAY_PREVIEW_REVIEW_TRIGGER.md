# Gatilho de revisão independente

Quando a configuração Supabase por ambiente estiver implementada e houver diff real de aplicação, revisar especificamente:

- possibilidade de Preview cair em produção por fallback;
- exposição de secrets;
- comportamento de autenticação/callbacks;
- compatibilidade GitHub Pages;
- origin Android;
- regressões em páginas que inicializam Supabase.

Esse é o ponto em que Claude pode agregar revisão independente. Antes disso, envolver Claude não desbloqueia a etapa.
