# ZunoPlay — Interface Home Padrão

Status de referência: PADRÃO CANÔNICO
Data: 2026-08-30

A interface Home atualmente publicada e aprovada pelo produto é a única referência visual e comportamental válida para evolução da Home do ZunoPlay.

## Regra
- Não restaurar layouts, conceitos, seções ou variações visuais anteriores da Home.
- Alterações futuras devem partir da interface atual, preservando sua identidade e hierarquia, salvo decisão explícita de produto.
- Histórico Git não é fonte de interface ativa; serve apenas para auditoria e recuperação técnica.
- Arquivos que ainda compõem a interface atual não são considerados legado apenas por terem sido criados em etapas anteriores.
- Código realmente legado só pode ser removido depois de comprovado que não é carregado nem necessário pela interface canônica.

## Interface canônica atual
- Header global ZunoPlay com logo, busca, notificações e mensagens.
- Hero com saudação, nickname e avatar à direita.
- Avatar em escala mobile aprovada, apoiado visualmente sobre plataforma holográfica animada.
- Card de Autoridade compacto abaixo do hero.
- Cards Zuno Coins e Amigos.
- Seção "Para você agora" com Desafio Zuno.
- Seção "Jogos populares" em rail/carrossel horizontal.
- Navegação inferior global: Início, Salas, Central, Pulso e Perfil.

## Elementos removidos que não devem retornar
- Botão Momentos na Home.
- Botão Sair da conta na Home.
- Seções "Salas que você entrou" e "Populares agora" na Home.
- Kickers redundantes "ZUNO RECOMENDA" e "JOGUE AGORA".
- Texto "AURA" no card de progressão; Aura permanece conceito visual.
- Marca Z ao lado do nickname.
- Seta no Desafio Zuno.

## Fonte técnica ativa
A composição atual depende do HTML/JS/CSS efetivamente carregado pela Home. Antes de remover qualquer arquivo antigo, verificar referências e dependências. A remoção não pode alterar a interface canônica aprovada.
