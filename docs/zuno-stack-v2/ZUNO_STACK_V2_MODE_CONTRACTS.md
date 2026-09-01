# Zuno Stack V2 — Mode Contracts

Status: Fase 0 — contratos oficiais de Solo, Trio e PvP.

## 1. Princípio

Solo, Trio e PvP usam o mesmo Core. Diferenças entre modos entram por configuração e regras de modo; não por forks do motor.

Cada modo deve declarar:

- `modeId`;
- número de vagas;
- configuração de Board;
- recursos individuais/compartilhados;
- comandos extras permitidos;
- regras temporais;
- vitória/derrota;
- formato de resultado bruto;
- política de desconexão/abandono quando aplicável.

## 2. Solo

### Participação

- exatamente 1 jogador;
- 1 Board;
- 1 Tray de 7;
- sem Relay compartilhado.

### Gameplay obrigatório

- seleção de peça;
- trio de 3 iguais;
- Undo;
- Hint;
- Rescue;
- score;
- combo;
- Pulse;
- poderes;
- vitória e derrota explícitas.

### Autoridade

Solo usa o mesmo modelo de resultado verificável que os modos online. A implementação pode permitir resposta visual local imediata, mas uma partida elegível para Ranking/Player Authority/recompensas precisa terminar em `VerifiedMatchResult` produzido/validado pelo servidor.

### Objetivo da fase de Solo

O Solo será a prova de correção e desempenho do novo Core. Trio e PvP não podem exigir uma reescrita das primitivas já validadas no Solo.

## 3. Trio cooperativo

### Participação

- exatamente 3 vagas de jogador;
- cada vaga possui `playerId` estável durante a partida;
- cada jogador possui Board e Tray próprios;
- desconexão temporária não remove a vaga imediatamente.

### Board

O alvo inicial é 12 camadas por jogador. Este valor deve permanecer em configuração do modo até benchmark e balanceamento validarem:

- duração;
- memória;
- carga de renderização;
- taxa de deadlock;
- dificuldade;
- volume de estado sincronizado.

A UI não é obrigada a renderizar todas as camadas simultaneamente.

### Relay

- exatamente 3 espaços compartilhados;
- inserir/retirar exige comando válido;
- duas ações concorrentes nunca podem consumir/ocupar o mesmo slot com sucesso;
- o servidor determina ordem final por revisão/sequência;
- Relay não pode duplicar peças.

### Pulse

O Trio possui componente compartilhado de Pulse. O contrato exato de geração/custo será balanceado em fase própria, mas estas invariantes já ficam congeladas:

- geração vem de ações válidas;
- gasto é atômico;
- não existe saldo negativo;
- concorrência não permite gasto duplo;
- UI não decide saldo.

### Support Mode

Support Mode permite que um jogador em condição elegível ajude companheiros por comandos cooperativos contratados. Não permite assumir arbitrariamente o Board de outro jogador nem editar seu estado diretamente.

O catálogo de ações de suporte deve ser pequeno, legível e balanceável.

### Último Stack

Último Stack é uma fase do Trio acionada por condição objetiva, por exemplo quando dois jogadores concluíram e resta um Board elegível. Durante essa fase, regras específicas de suporte podem ser habilitadas sem trocar de motor.

O início e fim de Último Stack são estados autoritativos compartilhados.

### Resultado

Todos os três participantes devem observar o mesmo resultado final e o mesmo identificador de partida. Vitória/derrota/abandono não podem divergir por cliente.

## 4. PvP 1x1

### Participação

- exatamente 2 jogadores;
- Boards separados;
- estado competitivo compartilhado mínimo.

### Justiça

A competição deve favorecer habilidade. O modo precisa usar uma das estratégias aprovadas:

1. mesma seed e mesmo ruleset; ou
2. seeds diferentes previamente classificadas como equivalentes por gerador/validador; ou
3. outra regra comprovadamente balanceada por testes.

Não é permitido gerar vantagem competitiva a partir de aleatoriedade não reproduzível do cliente.

### Interferências

Ataques são comandos limitados e server-authoritative. Cada ataque deve declarar:

- custo;
- alvo;
- efeito;
- duração, se houver;
- imunidades/limites;
- regra anti-chain/anti-stunlock quando necessária.

Ataques devem gerar pressão e decisão, não vitória aleatória inevitável.

### Resultado

O servidor calcula placar, vencedor, razão de término e estatísticas oficiais. O cliente nunca envia `winner=true`, score oficial final ou recompensa.

## 5. Preparação e ciclo de partida

Modos de rede devem seguir estados compatíveis com:

```text
forming -> preparing -> ready_check -> countdown -> playing -> resolving -> finished
```

Estados adicionais como `reconnecting`, `abandoned` e `cancelled` podem existir sem quebrar a máquina principal.

Uma partida não entra em `playing` enquanto o contrato de formação do modo não estiver satisfeito.

## 6. Reconexão

Trio e PvP devem reservar janela de reconexão. Durante a janela:

- identidade da vaga permanece;
- estado continua server-authoritative;
- cliente que retorna recebe snapshot atual + revisão;
- comandos antigos/duplicados não são reaplicados;
- a UI informa claramente a situação.

Após timeout, a política do modo decide abandono, substituição futura (se algum dia existir) ou resolução da partida. Nenhum comportamento será improvisado pelo cliente.

## 7. AFK e farm

Trio e PvP devem expor sinais suficientes ao Match Server para detectar inatividade e padrões anormais sem exigir polling agressivo no cliente.

A penalidade/recompensa não pertence ao Core. O Core apenas fornece fatos de gameplay; Security/Rewards interpreta esses fatos no servidor.

## 8. Compatibilidade entre modos

Primitivas compartilhadas — Board, Tray, trio, score base, combo base, recursos e catálogo de poderes compatíveis — devem manter semântica comum. Se um modo alterar uma regra, a diferença precisa estar explícita no `rulesetVersion` e no contrato do modo.

## 9. Fora de escopo da Fase 0

Não são definidos aqui números finais de balanceamento, catálogo final de poderes, fórmula de Ranking ou fórmula de Player Authority. Esses valores devem ser implementados e validados em suas fases sem violar as invariantes acima.
