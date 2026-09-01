# Política de navegação do ZunoPlay

Esta política define quando o cabeçalho e a barra inferior podem aparecer. A fonte executável de verdade é `zuno-navigation-policy-v1.js`; este documento explica as regras, e `tests/navigation-policy.test.mjs` impede páginas sem classificação.

## Modos oficiais

| Modo | Cabeçalho | Barra inferior | Uso |
| --- | --- | --- | --- |
| Global | Global | Sim | Destinos principais e listas de nível superior |
| Contextual | Voltar + título/ações da tela | Não | Subfluxos com destino de retorno definido |
| Imersivo | Controles da experiência | Não | Sala de voz e jogo em execução |
| Público | Marca ou cabeçalho legal | Não | Entrada, autenticação e documentos legais |

## Classes de rota

| Classe | Rotas reais | Header | Barra inferior |
| --- | --- | --- | --- |
| ROOT | Início autenticado, Salas, Pulso, perfil próprio | Global, exceto o header próprio do Pulso | Sim |
| SECONDARY | Amigos, comunidades, notificações, catálogo de jogos, caixa de conversas, configurações, Meu XP | Contextual | Não |
| DETAIL | Conversa aberta, perfil de outra pessoa, histórico | Contextual/específico | Não |
| IMMERSIVE | Sala de voz, Avatar Studio, Zuno Stack | Da experiência | Não |
| AUTH | Entrada, login, cadastro, termos, privacidade e Início visitante | Marca/legal | Não |

## Destinos raiz

A barra inferior tem cinco destinos: Início, Salas, Central, Pulso e Perfil. A Central é uma superfície raiz aberta pelo botão central, não uma rota HTML. Amigos, caixa de conversas, comunidades, notificações e catálogo de jogos são telas internas acessadas por ela e, portanto, não mantêm a barra inferior.

## Estados que alteram o modo

- `index.html` é Global para membro e Público para visitante.
- `conversas.html` é Contextual na caixa de conversas e usa um header específico quando há uma conversa aberta (`conversation` ou o parâmetro legado `user`).
- `perfil.html` é Global no próprio perfil e Contextual ao exibir outro perfil ou configurações.
- Avatar Studio, sala de voz e Zuno Stack são Imersivos.
- Meu XP e histórico de jogos são Contextuais.
- Termos e privacidade usam cabeçalho legal Público.

Uma página desconhecida falha de forma segura em modo Contextual, sem barra inferior. A CI exige que todo HTML na raiz esteja listado explicitamente antes de entrar no produto.
