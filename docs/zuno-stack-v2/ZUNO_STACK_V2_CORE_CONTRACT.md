# Zuno Stack V2 — Core Contract

Status: Fase 0 — contrato arquitetural oficial do motor.

## 1. Responsabilidade do Core

O Core é um motor de regras puro, determinístico e independente de plataforma. Ele recebe um estado válido e um comando, valida a ação e produz um novo estado mais eventos de domínio.

Contrato conceitual:

```text
State + Command + RulesContext -> TransitionResult
TransitionResult = { state, events, accepted, rejection? }
```

O Core não renderiza UI, não acessa DOM, não acessa Supabase, não abre WebSocket, não usa localStorage/sessionStorage, não emite som/vibração e não concede recompensa externa.

## 2. Determinismo

Toda informação capaz de alterar gameplay deve entrar explicitamente no Core. Isso inclui:

- seed;
- configuração do modo;
- limites/custos;
- relógio lógico quando uma regra depender de tempo;
- comando do jogador;
- estado anterior.

É proibido usar `Math.random()`, `Date.now()` ou estado global como fonte implícita de decisão de gameplay. Aleatoriedade e tempo devem ser injetados de forma reproduzível/testável.

## 3. Estado canônico

A forma concreta poderá evoluir na Fase 1, mas deverá preservar estas fronteiras:

```text
GameState
- schemaVersion
- matchId (opcional no Core puro)
- mode
- seed
- status
- rulesetVersion
- players[]
- shared
- sequence
- startedAtLogical
- finishedAtLogical
```

Cada `PlayerState` pode conter somente estado lógico necessário ao gameplay:

```text
PlayerState
- playerId
- board
- tray
- score
- combo
- pulse
- powers
- resources
- status
```

`shared` contém apenas estado compartilhado definido pelo modo, por exemplo Relay/Pulse cooperativo no Trio ou estado de confronto no PvP.

Nenhum campo puramente visual pertence ao estado canônico. Exemplos proibidos: posição de partículas, estado de modal, animação atual, glow, escala visual, scroll e classes CSS.

## 4. Comandos

Os comandos representam intenção e nunca estado final declarado pelo cliente.

Famílias previstas:

- `START_MATCH`
- `PICK_TILE`
- `UNDO`
- `REQUEST_HINT`
- `USE_RESCUE`
- `USE_PULSE`
- `USE_POWER`
- comandos cooperativos do Trio;
- comandos competitivos do PvP;
- comandos administrativos internos do Match Server quando contratados.

Todo comando deve possuir tipo, ator e payload mínimo. Em contexto de rede, `actionId` e revisão esperada pertencem ao protocolo, não à regra central do comando.

## 5. Transições e eventos

Uma transição aceita deve ser atômica: ou todas as mutações lógicas daquela ação são aplicadas, ou nenhuma.

Eventos de domínio descrevem o que aconteceu e podem ser consumidos pela UI/telemetria sem decidir regras. Exemplos:

- `TILE_PICKED`
- `TRIO_RESOLVED`
- `COMBO_CHANGED`
- `TRAY_RISK_CHANGED`
- `PULSE_CHANGED`
- `POWER_USED`
- `PLAYER_WON`
- `PLAYER_LOST`
- `MATCH_FINISHED`

Eventos não são fonte da verdade do estado corrente; o estado retornado pela transição é a fonte canônica.

## 6. Board

O Board deve ser uma estrutura lógica compacta. Cada peça deve possuir, no mínimo:

- `id` único e estável;
- `family`/`type`;
- posição lógica;
- camada;
- estado lógico necessário para disponibilidade/remoção.

`canPickTile(state, tileId)` deve ser uma função pura. A UI pode pré-calcular/apresentar disponibilidade, mas o Core deve validar novamente antes de aceitar `PICK_TILE`.

O Core deve suportar quantidade configurável de camadas. A meta de 12 camadas do Trio é regra/configuração do modo e não requisito fixo do motor.

## 7. Tray e trio

A capacidade padrão contratada é 7. O Core não deve permitir overflow silencioso.

Ao aceitar uma peça, a resolução de trio deve ocorrer dentro da mesma transição conforme ruleset. O algoritmo precisa ser determinístico e independente da ordem visual dos elementos DOM.

A regra de derrota por Tray deve ocorrer somente depois de todas as resoluções automáticas obrigatórias da mesma ação terem sido aplicadas.

## 8. Undo, Hint e Rescue

- Undo deve trabalhar sobre informação mínima de reversão definida pelo ruleset; não deve depender de snapshot visual.
- Hint deve ser calculável a partir do estado canônico e retornar sugestão/evento, sem editar estado quando a regra não prevê custo/mutação.
- Rescue deve ser uma ação explícita, com elegibilidade, custo e efeito definidos. Não existe `forceWin` ou edição arbitrária de Tray/Board.

## 9. Score, combo, Pulse e poderes

Todos devem ser calculados no Core a partir de ações aceitas.

As fórmulas devem ser versionadas por `rulesetVersion`, permitindo balanceamento futuro sem tornar partidas antigas irreproduzíveis.

Poderes são definidos por catálogo de regras, não por callbacks de UI. Um poder deve declarar:

- id;
- modos permitidos;
- custo;
- pré-condições;
- mutação lógica;
- eventos emitidos;
- limites/cooldown/cargas quando aplicável.

## 10. Separação de modos

O Core expõe primitivas compartilhadas. Cada modo fornece um `ModeRules`/`RulesContext` que define:

- quantidade de jogadores;
- configuração de board;
- objetivos;
- condição de vitória/derrota;
- recursos compartilhados;
- ações extras permitidas;
- regras temporais;
- cálculo de resultado bruto.

É proibido criar três motores independentes para Solo, Trio e PvP.

## 11. Serialização e compatibilidade

O estado deve ser serializável em formato estável e compacto, sem referências cíclicas, funções ou objetos dependentes do navegador.

Toda mudança incompatível exige incremento de `schemaVersion`. Toda mudança de balanceamento que altere resultado exige novo `rulesetVersion`.

Snapshots antigos só precisam ser migrados quando houver contrato explícito de compatibilidade; a ausência de migração nunca pode produzir interpretação silenciosamente incorreta.

## 12. Testabilidade

A Fase 1 só poderá ser aceita se o Core puder ser testado sem navegador e sem backend. Os testes mínimos deverão cobrir:

- determinismo por seed;
- bloqueio/disponibilidade;
- Tray;
- trio;
- vitória/derrota;
- comandos inválidos sem mutação;
- serialização;
- invariantes;
- cenários longos sem crescimento indevido de estado.

## 13. Regra de dependências

Dependências permitidas no sentido arquitetural:

```text
UI -> Application/Match Client -> Core contracts
Match Server -> Core
Tests -> Core
```

Dependências proibidas:

```text
Core -> DOM
Core -> UI
Core -> Supabase
Core -> Realtime/WebSocket
Core -> localStorage
Core -> Player Authority/Ranking/Aura
```

## 14. Critério de congelamento

Este contrato só pode ser alterado futuramente com revisão explícita quando a alteração afetar fronteiras, determinismo ou autoridade. Features de fases futuras não justificam violar estas regras.
