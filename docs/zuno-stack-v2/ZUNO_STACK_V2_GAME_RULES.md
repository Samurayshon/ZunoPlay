# Zuno Stack V2 — Game Rules

Status: Fase 0 — contrato oficial de regras. Este documento define comportamento do produto; não define DOM, Supabase, animação ou implementação de rede.

## 1. Visão

O Zuno Stack V2 deve ser um puzzle mobile-first, limpo, intuitivo, rápido e altamente rejogável. A dificuldade deve vir das decisões do jogo, nunca da interface. Todo modo reutiliza o mesmo conjunto de regras centrais e adiciona somente regras próprias do modo.

## 2. Princípios invariantes

- Uma peça possui identidade única, família/tipo, posição e camada.
- Uma peça só pode ser escolhida quando a regra de bloqueio do tabuleiro a declara disponível.
- A ação válida de escolher uma peça a remove do tabuleiro lógico e a coloca na Tray do jogador.
- A Tray tem capacidade máxima de 7 peças.
- Sempre que a Tray contiver 3 peças da mesma família, o trio é resolvido segundo a regra do modo e essas três peças deixam a Tray.
- Uma ação inválida nunca altera o estado canônico.
- Vitória e derrota são decididas por regras explícitas do modo, nunca por texto da interface.
- Score, combo, Pulse, poderes e recursos são derivados exclusivamente de transições válidas.
- Aleatoriedade deve ser reproduzível por seed quando ela afetar gameplay verificável.
- O cliente não decide resultado oficial, Ranking, Player Authority ou recompensa.

## 3. Vocabulário oficial

- **Core**: motor puro de regras e transições.
- **Tray**: área pessoal de até 7 peças.
- **Trio**: conjunto resolvido de 3 peças da mesma família.
- **Combo**: sequência de resoluções válidas dentro da regra temporal/de ações do modo.
- **Pulse**: recurso estratégico acumulado por ações válidas.
- **Power**: habilidade com custo, disponibilidade e efeito definidos por contrato.
- **Rescue**: mecanismo de recuperação controlada quando o jogador está sob risco; nunca é uma vitória automática nem uma edição arbitrária de estado.
- **Relay**: área compartilhada de 3 espaços no Trio.
- **Support Mode**: estado em que um jogador pode usar ações cooperativas permitidas para ajudar outro participante.
- **Último Stack**: fase cooperativa final quando a condição do Trio permite concentrar ajuda no último tabuleiro ainda não concluído.
- **Server Authority**: autoridade técnica do servidor sobre partida e resultado.
- **Player Authority**: progressão pública conquistada pelo jogador. Os dois conceitos nunca devem compartilhar o mesmo identificador interno.

## 4. Regras compartilhadas do tabuleiro

O Core deve suportar quantidade configurável de camadas e layouts determinísticos por seed. O número de camadas pertence ao contrato do modo/configuração e não deve ser codificado como constante global do motor.

A disponibilidade de uma peça deve ser calculada apenas a partir do estado lógico do tabuleiro. A apresentação visual pode ocultar camadas não relevantes, mas nunca pode alterar a regra de bloqueio.

O gerador deve ser capaz de aplicar validadores de jogabilidade, incluindo abertura válida e ausência de estados estruturalmente impossíveis definidos pelo modo.

## 5. Solo

O Solo possui exatamente um jogador e um tabuleiro próprio.

O conjunto mínimo de gameplay é:

1. iniciar partida válida;
2. escolher peças disponíveis;
3. gerenciar Tray de 7 espaços;
4. resolver trios;
5. calcular score;
6. calcular combo;
7. usar Undo quando permitido;
8. usar Hint quando permitido;
9. usar Rescue quando permitido;
10. acumular e usar Pulse;
11. usar poderes habilitados pela configuração;
12. terminar em vitória ou derrota inequívoca.

A vitória padrão do Solo ocorre quando o objetivo configurado é concluído e não restam requisitos pendentes. A derrota padrão ocorre quando uma condição fatal explícita é atingida, incluindo Tray sem resolução possível ao atingir seu limite, quando aplicável à configuração.

Undo deve restaurar somente uma transição elegível e deve ter limites/custos explícitos. Hint apenas sugere informação derivada do estado real; não pode fabricar uma jogada. Rescue deve ter regra, custo e efeito determinísticos e auditáveis.

## 6. Trio cooperativo

O Trio oficial possui **exatamente 3 vagas de jogador**. Conexão ativa e vaga de jogador são conceitos diferentes: uma partida continua identificando os três participantes durante uma janela de reconexão.

Cada jogador possui tabuleiro e Tray próprios. O alvo inicial de design é **12 camadas por jogador**, porém este valor permanece configurável até ser validado por testes de duração, memória, dificuldade e balanceamento. O Core não assume 12 como constante universal.

Recursos cooperativos obrigatórios do modo:

- Relay compartilhado com exatamente 3 espaços;
- Pulse com componente compartilhado/estratégico definido pelo modo;
- Support Mode;
- Último Stack;
- ações reais de ajuda entre jogadores;
- estado sincronizado dos três participantes;
- preparação antes da partida;
- recuperação/reconexão;
- resultado único e consistente para a equipe.

Nenhuma ação de ajuda pode editar livremente o estado de outro jogador. Toda ajuda deve ser representada como comando válido do protocolo de partida e validada pelo servidor.

## 7. PvP 1x1

O PvP possui exatamente 2 jogadores. O objetivo é medir habilidade e tomada de decisão, reduzindo vantagem causada por sorte.

Regras obrigatórias:

- condições iniciais equivalentes ou demonstravelmente balanceadas;
- seed/layout controlados de forma justa;
- ataques/interferências limitados, previsíveis e contratados;
- nenhuma interferência pode permitir edição arbitrária do estado adversário;
- resultado e placar oficiais calculados pelo servidor;
- desconexão, abandono e timeout possuem resolução explícita;
- ações do cliente são tratadas como pedidos, não como fatos.

## 8. Ranking, Player Authority e Aura

Ranking recebe apenas resultados de partidas verificadas pelo servidor. Devem existir dimensões independentes para Solo, Trio e PvP, sem misturar métricas incompatíveis.

Player Authority é progressão derivada de desempenho legítimo e não deve ser simples contador de partidas. O cálculo pode considerar qualidade de jogo, vitória, eficiência, cooperação, dificuldade, consistência, comportamento de abandono e sinais antifarm, conforme contrato de segurança.

Aura é representação visual da progressão. Ela não pertence ao Core e não pode alterar regras, hitboxes, velocidade, sorte ou vantagem competitiva.

## 9. Experiência do jogador

A primeira partida deve ensinar por ação e feedback, não por excesso de texto. A prioridade de compreensão é:

**peça disponível → Tray → trio → risco → combo → Pulse/poder → objetivo.**

Toda ação importante precisa de feedback visual imediato. Feedback visual pode ser otimista, mas o estado oficial continua sujeito à confirmação/autorização definida no protocolo de partida.

## 10. Fora de escopo da Fase 0

Este documento não implementa Core, UI, Match Server, Trio, PvP, Ranking, Player Authority ou Aura. Ele somente congela regras e fronteiras para as fases seguintes.
