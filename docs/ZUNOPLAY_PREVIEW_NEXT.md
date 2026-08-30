# Próxima ação — ZUN-47

Prioridade única: desacoplar a configuração Supabase do frontend por ambiente sem alterar a produção atual.

Antes de modificar arquivos de aplicação, localizar todas as referências ao project ref/URL/chave de produção no frontend e mapear como cada página inicializa o cliente Supabase. A implementação deve centralizar configuração de forma compatível com GitHub Pages e permitir que o build de Preview receba staging explicitamente.

Depois: CI, revisão de segurança, merge da barreira, criação/vínculo Vercel e smoke hospedado.
