# Zuno Stack V2 — Match Protocol

Status: Fase 0 — contrato oficial de comunicação, sincronização e resultado de partida.

## 1. Objetivo

O protocolo conecta clientes ao Match Server sem transformar o cliente em fonte de verdade. O cliente envia intenções; o servidor valida comandos contra o estado autoritativo e publica transições confirmadas.

Fluxo canônico:

```text
Client Input
-> Client Command Envelope
-> Match Server
-> Core + ModeRules
-> Authoritative Transition
-> Persist/Sequence
-> Ack/Events/Delta
-> Clients
```

## 2. Envelope de comando

Todo comando de rede deve conter apenas os campos necessários para identidade, ordenação e intenção:

```text
CommandEnvelope
- matchId
- playerId/session identity (derivada da sessão autenticada; nunca confiada apenas no payload)
- actionId
- expectedRevision
- type
- payload
- clientSentAt (telemetria, nunca autoridade temporal)
```

`actionId` deve ser único por tentativa lógica e usado para idempotência. Reenvio do mesmo `actionId` não pode executar a ação duas vezes.

## 3. Revisão e sequência

Cada transição autoritativa aceita incrementa uma revisão/sequence monotônica do match.

O servidor rejeita ou reconcilia comandos com revisão incompatível conforme a política da ação. O cliente não deve tentar resolver conflito alterando o estado local por conta própria.

## 4. Estado e mensagens

O servidor pode responder com:

- `ACK_ACCEPTED` + nova revisão;
- `ACK_REJECTED` + código estável de rejeição;
- `STATE_DELTA` quando seguro e menor;
- `STATE_SNAPSHOT` para bootstrap/reconexão/desync;
- eventos de domínio confirmados;
- `MATCH_STATUS_CHANGED`;
- `MATCH_FINISHED`.

Durante gameplay normal, deve-se preferir comandos e deltas compactos. Snapshot completo não deve ser transmitido a cada toque.

## 5. Feedback local

A UI pode apresentar feedback visual imediato ao toque quando isso não comprometer consistência. Esse feedback é especulativo/apresentacional e deve ser reconciliável.

O cliente não pode confirmar visualmente como definitivo:

- vitória oficial;
- recompensa;
- Ranking;
- Player Authority;
- consumo compartilhado contestado;
- resultado de ação que depende de concorrência.

A experiência deve parecer imediata sem mentir sobre estado oficial.

## 6. Formação e preparação

Para modos online, o Match Server controla:

```text
forming
preparing
ready_check
countdown
playing
resolving
finished
```

Trio só passa ao fluxo de início quando existirem exatamente 3 vagas válidas formadas segundo o contrato. PvP só inicia com exatamente 2 participantes válidos.

Ready state, countdown e início devem possuir timestamps/sequence de servidor suficientes para que todos os clientes apresentem a mesma fase.

## 7. Reconexão e recuperação

Ao reconectar, o cliente envia identidade da sessão/match e sua última revisão conhecida. O servidor retorna estado necessário para convergir ao estado atual.

Regras obrigatórias:

- não reaplicar `actionId` já processado;
- preservar a vaga do jogador durante a janela contratada;
- recuperar Board, Tray, recursos, fase e estado compartilhado;
- reidratar UI a partir do estado canônico, não de caches visuais;
- descartar animações antigas que já não representam o estado atual;
- detectar snapshot incompatível por `schemaVersion/rulesetVersion`.

## 8. Concorrência

Relay, Pulse compartilhado, poderes cooperativos, ataques PvP e qualquer recurso compartilhado devem ser serializados/validados no servidor.

Exemplo: dois jogadores tentam retirar o mesmo slot do Relay. Somente um comando pode ser aceito para a revisão aplicável; o outro recebe rejeição/reconciliação. Nenhum cliente pode gerar uma segunda cópia da peça.

## 9. Host técnico

A V2 não deve depender de um cliente-host como autoridade final. Se alguma otimização futura usar coordenação por host, ela é auxiliar e substituível; o servidor continua dono do estado oficial e do resultado.

Falha/saída de qualquer cliente não pode eliminar a autoridade da partida.

## 10. Tempo

Regras competitivas e recompensáveis que dependam de tempo usam relógio do servidor ou relógio lógico derivado de timestamps autoritativos.

`Date.now()` do cliente pode ser usado para animação/interpolação, nunca para provar duração, cooldown oficial, AFK ou vitória.

## 11. AFK, abandono e desconexão

O protocolo deve registrar fatos server-side suficientes para diferenciar:

- conexão temporariamente perdida;
- ausência de comandos por período relevante;
- abandono explícito;
- timeout;
- término normal.

A política final pertence ao modo/security contract. O cliente pode exibir aviso, mas não decide penalidade.

## 12. Anti-duplicação

No mínimo, o servidor deve combinar:

- `actionId` idempotente;
- revisão esperada;
- identidade autenticada;
- validação de ownership/alvo;
- transação/lock apropriado para recursos concorrentes;
- persistência de resultado final idempotente.

A mesma ação não pode gerar duas peças, dois gastos, dois scores ou duas recompensas.

## 13. Resultado autoritativo

Toda partida elegível para sistemas persistentes termina com um objeto conceitual `VerifiedMatchResult` criado pelo servidor:

```text
VerifiedMatchResult
- resultVersion
- matchId
- mode
- rulesetVersion
- participants
- startedAt
- finishedAt
- terminationReason
- outcome
- verifiedStats
- integrityFlags
- rewardEligibility
```

`verifiedStats` é derivado do histórico/estado autoritativo. Nenhum valor final vindo do cliente pode substituir esses dados.

## 14. Observabilidade

O Match Server deve produzir telemetria suficiente para diagnosticar:

- rejeições por revisão;
- comandos duplicados;
- reconexões;
- latência de comando;
- divergência/desync;
- abandono/AFK;
- duração;
- taxa de erro;
- integridade do resultado.

Telemetria não deve exigir spam de rede por frame.

## 15. Segurança de payload

Todo payload recebido é não confiável. O servidor valida tipo, tamanho, enumerações, limites e relação do ator com o alvo. Dados desconhecidos não devem ser executados nem persistidos cegamente.

## 16. Compatibilidade

Mensagens e snapshots devem carregar versões suficientes para impedir que cliente e servidor interpretem o mesmo payload com regras incompatíveis. Incompatibilidade crítica deve interromper/recarregar a sessão de forma clara, nunca continuar silenciosamente.

## 17. Fora de escopo da Fase 0

Transporte específico (Supabase Realtime, WebSocket dedicado, Edge Function ou outra opção) não é congelado aqui. A implementação futura deve obedecer ao protocolo independentemente do transporte escolhido.
