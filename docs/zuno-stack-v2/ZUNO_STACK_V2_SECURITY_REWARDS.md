# Zuno Stack V2 — Security & Rewards Contract

Status: Fase 0 — contrato oficial de confiança, antifarm, Ranking e Player Authority.

## 1. Regra principal

O cliente nunca decide resultado oficial, recompensa, Ranking ou Player Authority.

A única ponte permitida entre gameplay e sistemas persistentes é um `VerifiedMatchResult` produzido/validado pelo servidor a partir de estado e ações autoritativas.

Fluxo:

```text
Authoritative Match
-> VerifiedMatchResult
-> Eligibility / Anti-Farm
-> Ranking update
-> Player Authority calculation
-> Rewards / progression
-> Aura reads progression
```

Nunca:

```text
Client score -> reward
Client XP -> database
Client winner -> Ranking
```

## 2. Separação de nomes

Para evitar ambiguidade:

- **Server Authority** / `serverAuthority`: conceito técnico de confiança sobre estado de partida.
- **Player Authority** / `playerAuthority`: progressão pública conquistada jogando.

Código, banco, eventos e documentação devem manter essa separação.

## 3. Modelo de confiança

Todo dado de cliente é tratado como não confiável até validação. Isso inclui:

- tileId;
- comando de poder;
- alvo de suporte/ataque;
- timestamps;
- score exibido;
- estado de Tray;
- conclusão de objetivo;
- duração;
- quantidade de ações;
- reconnect metadata não autenticada.

Identidade do ator deve vir da sessão autenticada e ser vinculada ao match no servidor.

## 4. VerifiedMatchResult

Um resultado verificável deve ser imutável/idempotente após finalização e conter, no mínimo:

- `matchId` único;
- `mode`;
- `rulesetVersion`;
- participantes autenticados;
- início e fim autoritativos;
- motivo de término;
- outcome oficial;
- estatísticas verificadas necessárias aos sistemas posteriores;
- flags de integridade;
- elegibilidade para progressão/recompensa.

Uma partida não pode gerar dois resultados recompensáveis para o mesmo `matchId`.

## 5. Ranking

Ranking é separado por modo: Solo, Trio e PvP possuem métricas/tabelas lógicas independentes.

Atualizações de Ranking devem ser:

- derivadas de `VerifiedMatchResult`;
- transacionais/idempotentes;
- versionadas quando fórmula relevante mudar;
- resistentes a replay do mesmo resultado;
- capazes de excluir/corrigir partidas invalidadas por integridade quando houver processo administrativo definido.

O cliente pode ler Ranking, nunca escrever posição/pontos diretamente.

## 6. Player Authority

Player Authority representa domínio/qualidade de jogo, não apenas volume.

O cálculo futuro pode considerar, conforme modo e ruleset:

- vitória/resultado;
- dificuldade;
- eficiência;
- consistência;
- qualidade de combos;
- decisões cooperativas úteis;
- salvamentos/suporte legítimo;
- desempenho PvP;
- abandono/desconexões recorrentes;
- integridade/antifarm.

A fórmula exata pertence à Fase 9, mas desde já ficam proibidos:

- ganho baseado apenas em valor enviado pelo cliente;
- recompensa infinita por repetir cenário trivial;
- multiplicadores escondidos definidos na UI;
- Authority negativa/positiva por relógio do cliente;
- qualquer caminho direto `localStorage -> Player Authority`.

## 7. Anti-farm

O backend deve possuir mecanismo de elegibilidade e sinais antifarm. Exemplos de sinais possíveis:

- repetição anormal dos mesmos participantes;
- duração irrealisticamente curta;
- sequência de ações incompatível com gameplay humano/plausível;
- abandono coordenado;
- partidas sem atividade suficiente;
- padrões de resultado excessivamente repetitivos;
- múltiplas tentativas de consumir o mesmo resultado;
- abuso de reconnect;
- contas/sessões relacionadas quando houver sinal permitido e proporcional.

Um sinal não precisa causar banimento automático. Pode reduzir/zerar recompensa, marcar revisão ou bloquear progressão conforme política futura.

## 8. AFK

AFK deve ser calculado com fatos observados pelo servidor, não por timer do cliente.

No Trio, o sistema deve distinguir jogador temporariamente desconectado de jogador ausente/abandonando. Penalidades não podem ser aplicadas durante uma janela legítima de reconexão sem regra explícita.

## 9. Segurança de comandos

Cada ação deve validar:

- sessão autenticada;
- participação no match;
- estado atual do match;
- revisão/sequence esperada;
- `actionId` idempotente;
- payload e limites;
- ownership/alvo;
- pré-condições do Core;
- custo/recurso;
- autorização específica do modo.

Nunca confiar em `playerId` enviado sem confrontar a identidade autenticada.

## 10. Recursos compartilhados e concorrência

Relay, Pulse compartilhado, ataques, suporte e qualquer moeda/recurso de partida devem ser atualizados atomicamente no servidor.

Conflitos devem resultar em uma ação aceita e as demais rejeitadas/reconciliadas, nunca em duplicação.

## 11. Recompensas

Nenhuma recompensa persistente é concedida antes da finalização verificável.

O pipeline de recompensa deve ser idempotente por `matchId` + tipo/versão de recompensa. Retry de job/função não pode duplicar XP, item, moeda, Ranking ou Player Authority.

Valores calculados devem ser reproduzíveis por versão de fórmula e dados do `VerifiedMatchResult`.

## 12. Aura

Aura é consumidora somente-leitura de Player Authority/tiers/achievements aprovados. Não participa do cálculo de resultado e nunca concede vantagem competitiva.

A aparência da Aura pode ser calculada no cliente a partir de dados oficiais, mas o nível/tier oficial vem do backend.

## 13. Segredos e privilégios

- credenciais de service role/segredos server-side nunca entram no frontend;
- RPC/endpoints públicos devem expor apenas operações necessárias ao cliente;
- helpers internos permanecem não executáveis por cliente quando não houver necessidade;
- funções críticas usam princípio do menor privilégio;
- validação de RLS/policies e grants faz parte do aceite da implementação futura.

## 14. Auditoria

Eventos críticos devem permitir reconstrução suficiente para investigar:

- resultado;
- conflito;
- duplicação;
- desconexão;
- abuso de recurso compartilhado;
- recompensa;
- alteração de Ranking/Player Authority.

Logs não precisam replicar cada frame nem carregar dados pessoais desnecessários.

## 15. Fail closed

Quando o servidor não consegue provar elegibilidade de recompensa, o comportamento padrão é não conceder recompensa oficial e preservar o resultado/telemetria para reconciliação. A UI deve comunicar indisponibilidade sem inventar progresso.

## 16. Critério para liberar sistemas persistentes

Ranking, Player Authority e recompensas só podem aceitar partidas V2 depois de existirem testes ponta a ponta que provem:

1. partida válida produz um único `VerifiedMatchResult`;
2. replay não duplica resultado/recompensa;
3. cliente alterado não consegue declarar vitória/score;
4. concorrência não duplica recurso;
5. reconnect preserva resultado consistente;
6. regras de abandono/AFK são reproduzíveis;
7. falha parcial pode ser retomada com idempotência.

## 17. Fora de escopo da Fase 0

Não definimos aqui valores finais de Authority, fórmula de elo/Ranking, recompensas econômicas ou sanções. A Fase 0 congela somente a cadeia de confiança e invariantes.
