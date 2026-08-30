# ZunoPlay — Sistema Oficial de Aura e Autoridade

**Status do conceito:** APROVADO COMO DIREÇÃO DE PRODUTO  
**Implementação funcional:** ⚫ NÃO IMPLEMENTADO  
**Escopo desta versão:** conceito, regras de progressão, níveis, economia de Autoridade, segurança, integrações e critérios de validação.  
**Fora deste escopo:** arte final, animações, assets e implementação visual das Auras.

---

## 1. Definição

A **Aura** é o sistema global de progressão e prestígio do jogador no ZunoPlay.

Ela representa publicamente a jornada, a dedicação e a atividade legítima do jogador dentro dos jogos do ecossistema ZunoPlay.

A Aura não é IA, não é ranking competitivo e não é um item comprado. Ela é determinada pela **Autoridade** acumulada na conta.

Fluxo central:

`Jogar → gerar Autoridade válida → acumular Autoridade → atingir novo patamar → evoluir Aura`

---

## 2. Autoridade

**Autoridade** é a pontuação global e permanente usada para determinar a Aura atual do jogador.

Princípios:

- pertence à conta do jogador;
- é acumulativa;
- não diminui por derrota;
- não expira por inatividade;
- não deve ser comprada diretamente;
- deve ser conquistada por participação legítima nos jogos;
- deve ser calculada e concedida por lógica confiável no backend;
- deve possuir histórico auditável de origem;
- deve ser protegida contra fraude, duplicidade, AFK e farming artificial.

Autoridade mede **trajetória e participação**, não habilidade competitiva atual.

Ranking competitivo, MMR, elo ou classificação sazonal devem permanecer sistemas separados.

---

## 3. Progressão oficial de Aura

A V1 possui **15 Auras**.

| Nível | Aura | Autoridade mínima | Faixa de Autoridade |
|---:|---|---:|---:|
| 1 | Iniciante | 0 | 0–99 |
| 2 | Explorador | 100 | 100–249 |
| 3 | Reconhecido | 250 | 250–499 |
| 4 | Veterano | 500 | 500–999 |
| 5 | Especialista | 1.000 | 1.000–1.999 |
| 6 | Elite | 2.000 | 2.000–4.999 |
| 7 | Mestre | 5.000 | 5.000–9.999 |
| 8 | Ascendente | 10.000 | 10.000–19.999 |
| 9 | Guardião | 20.000 | 20.000–49.999 |
| 10 | Lendário | 50.000 | 50.000–99.999 |
| 11 | Soberano | 100.000 | 100.000–199.999 |
| 12 | Imperador | 200.000 | 200.000–499.999 |
| 13 | Supremo | 500.000 | 500.000–999.999 |
| 14 | Imortal | 1.000.000 | 1.000.000–1.999.999 |
| 15 | Eterno | 2.000.000 | 2.000.000+ |

A mudança de Aura deve ocorrer automaticamente quando a Autoridade acumulada alcançar o mínimo do próximo nível.

---

## 4. Filosofia da curva

A curva deve ser rápida no início e progressivamente mais exigente.

Objetivo:

- dar feedback cedo para novos jogadores;
- criar progressão de médio prazo;
- tornar as Auras superiores símbolos reais de prestígio;
- evitar que o nível máximo seja alcançado em poucos dias;
- permitir expansão futura sem invalidar a progressão existente.

Faixas conceituais:

- **Introdução:** Iniciante → Especialista;
- **Progressão ativa:** Elite → Ascendente;
- **Prestígio:** Guardião → Lendário;
- **Alta autoridade:** Soberano → Imperador;
- **Endgame social:** Supremo → Imortal → Eterno.

Os valores aprovados são os thresholds oficiais da V1, mas o balanceamento de geração de Autoridade por jogo deve ser validado com telemetria real antes de produção.

---

## 5. Como ganhar Autoridade

A Autoridade deve ser conquistada principalmente ao jogar os jogos do ZunoPlay.

A recompensa exata pode variar por jogo, duração e dificuldade, mas deve seguir um padrão global.

Referência inicial de recompensa:

| Evento | Autoridade de referência |
|---|---:|
| Participação legítima | +2 |
| Conclusão de partida | +3 |
| Vitória | +5 |
| Bom desempenho | +1 a +5 |
| Primeira vitória do dia | +10 |
| Desafio diário | +10 a +30 |
| Conquista especial | variável |
| Abandono / AFK / partida inválida | 0 |

Uma partida normal válida tende a ficar aproximadamente na faixa de **5 a 15 de Autoridade**, mas cada jogo deve ser calibrado individualmente.

O objetivo não é premiar somente vitória. Jogar legitimamente deve gerar progresso; desempenho e vitória aceleram esse progresso.

---

## 6. Autoridade global entre jogos

Existe **uma única Autoridade global por conta**.

Todos os jogos elegíveis alimentam o mesmo progresso:

`Jogo A ─┐`

`Jogo B ─┤`

`Jogo C ─┼→ Autoridade global → Aura`

`Jogo D ─┤`

`Jogo E ─┘`

Cada transação deve registrar a origem para permitir histórico, auditoria e métricas por jogo.

Um novo jogo pode ser integrado ao sistema de Aura sem criar uma progressão paralela.

---

## 7. Regras de concessão

A Autoridade não deve ser enviada pelo cliente como valor confiável.

Fluxo esperado:

`partida criada → participação validada → partida encerrada → resultado validado → backend calcula recompensa → transação registrada → Autoridade atualizada → Aura recalculada`

Princípios obrigatórios:

- idempotência por partida/evento;
- validação server-side;
- não aceitar `authority_amount` arbitrário vindo do frontend;
- impedir dupla recompensa da mesma partida;
- registrar motivo e origem de cada alteração;
- permitir reversão administrativa auditável quando fraude for comprovada;
- manter integridade mesmo após reconexão ou retries.

---

## 8. Anti-AFK e anti-farm

O sistema deve reduzir ou negar recompensa quando detectar comportamento artificial.

Casos mínimos:

- jogador entra e não participa;
- abandono precoce;
- repetição excessiva contra o mesmo adversário quando aplicável;
- criação artificial de partidas curtas;
- múltiplas submissões do mesmo resultado;
- botting ou automação;
- manipulação de request;
- conluio entre contas para gerar Autoridade;
- exploração de bugs de pontuação.

A política pode aplicar redução progressiva de recompensa em padrões repetitivos, conforme o tipo de jogo.

Exemplo conceitual de redução:

`100% → 100% → 75% → 50% → 25% → 10% → 0%`

Essa curva não é regra universal; cada jogo pode exigir critérios próprios.

---

## 9. Ledger de Autoridade

A Autoridade deve possuir histórico transacional auditável.

Modelo conceitual de cada transação:

- `user_id`;
- `game_id`;
- `match_id` ou `source_id`;
- `amount`;
- `reason`;
- `source_type`;
- `created_at`;
- identificador idempotente;
- metadados de validação quando necessários.

O saldo final deve ser derivável ou reconciliável com esse histórico.

Alterações administrativas devem ser identificadas explicitamente e não misturadas com recompensas normais de jogo.

---

## 10. Regras econômicas

### Autoridade não é moeda

Autoridade não deve substituir Zuno Coins ou outras moedas do produto.

### Autoridade não é comprável

A V1 adota como regra:

> Autoridade não pode ser comprada diretamente.

O objetivo é preservar o significado social da Aura.

Itens cosméticos, passes, efeitos, roupas ou outros produtos podem ser monetizados separadamente sem converter pagamento diretamente em Autoridade.

### Autoridade não diminui por derrota

Derrotas não removem Autoridade.

Punições por fraude, reversões de erro ou ações administrativas são exceções e devem ser auditáveis.

---

## 11. Exibição funcional futura

A Aura deverá ser uma característica socialmente reconhecível do jogador.

Integrações previstas, quando implementadas:

- perfil;
- avatar;
- salas;
- lista de jogadores;
- cartões de usuário;
- resultados dos jogos;
- rankings e histórico, quando aplicável;
- Home;
- notificações de evolução;
- conquistas e eventos.

Nesta etapa, **nenhum efeito visual específico está definido como implementação**.

O sistema visual será especificado separadamente.

---

## 12. Experiência de progressão

O produto deve conseguir mostrar, quando a UI for implementada:

- Aura atual;
- Autoridade atual;
- requisito da próxima Aura;
- progresso percentual;
- quantidade restante;
- histórico ou fontes relevantes de Autoridade;
- evento de evolução de Aura.

Exemplo conceitual:

`Guardião — 32.480 / 50.000`

`Faltam 17.520 para Lendário`

Ao atingir o threshold, a promoção deve ser automática e consistente em todas as superfícies do produto.

---

## 13. Separação de sistemas

Aura/Autoridade não deve ser confundida com:

- nível específico de um jogo;
- ranking competitivo;
- MMR/elo;
- Zuno Coins;
- inventário;
- conquistas;
- badges;
- passe de temporada;
- status administrativo;
- assinatura/VIP.

Esses sistemas podem interagir, mas não devem compartilhar a mesma fonte de verdade sem decisão arquitetural explícita.

---

## 14. Integrações arquiteturais previstas

O sistema deverá integrar-se com:

### Jogos

Produzem eventos elegíveis para Autoridade.

### Backend/Supabase

Responsável por persistência, validação e regras protegidas.

### Perfil

Exibe Aura e Autoridade do jogador.

### Avatar Studio

No futuro, receberá a camada visual da Aura.

### Realtime

Pode propagar evolução de Aura e mudanças relevantes entre clientes.

### Notificações

Pode informar promoções e marcos.

### PostHog

Deve medir progressão, tempo para evolução, distribuição de Auras, taxa de ganho e sinais de abuso.

---

## 15. Segurança obrigatória

Frontend não é barreira de segurança.

O usuário não pode alterar diretamente:

- Autoridade total;
- Aura atual;
- threshold;
- valor de recompensa;
- origem da recompensa;
- resultado final de uma partida protegida.

A implementação deve considerar RLS, funções server-side ou mecanismo equivalente conforme a arquitetura real.

Testes mínimos:

- usuário legítimo recebe recompensa correta;
- request adulterada é rejeitada;
- usuário A não altera Autoridade de B;
- mesma partida não paga duas vezes;
- abandono não gera recompensa indevida;
- fraude/farm não gera progressão ilimitada;
- reconexão não duplica pagamento;
- rollback/retry mantém consistência.

---

## 16. Métricas de produto

Quando instrumentado, acompanhar pelo menos:

- Autoridade média por jogador ativo;
- Autoridade média gerada por jogo;
- distribuição de jogadores por Aura;
- tempo médio/mediano para cada Aura;
- Autoridade por sessão;
- Autoridade por dia ativo;
- taxa de promoção entre níveis;
- abandono antes/depois de promoção;
- retenção por Aura;
- frequência de redução anti-farm;
- transações revertidas;
- outliers de geração de Autoridade.

Essas métricas servirão para rebalanceamento sem depender de percepção subjetiva.

---

## 17. Critérios de validação futura

A funcionalidade só poderá receber **✅ VALIDADO** após evidência ponta a ponta.

Fluxo mínimo:

`jogador → jogo → resultado válido → backend → ledger → saldo → Aura → interface → outro cliente`

Validar:

- uso normal;
- derrota;
- vitória;
- AFK;
- abandono;
- manipulação de request;
- duplicidade;
- múltiplos usuários;
- concorrência;
- reconexão;
- progressão atravessando threshold;
- nível máximo;
- segurança cross-user;
- regressões em jogos e perfil.

---

## 18. Estado atual

### Conceito e direção de produto

**✅ APROVADO** como decisão de produto.

### Implementação técnica

**⚫ NÃO IMPLEMENTADO** até que banco, lógica server-side, integração com jogos e interface existam e sejam verificados.

### Visual das Auras

**⚫ NÃO IMPLEMENTADO / FORA DE ESCOPO DESTA ETAPA.**

Nenhuma arte, animação, asset ou efeito visual deve ser tratado como implementação apenas por existir referência conceitual.

---

## 19. Decisões oficiais da V1

1. Aura é o sistema global de prestígio por progressão em jogos.
2. Autoridade é permanente e acumulativa.
3. Existem 15 Auras na V1.
4. A progressão vai de Iniciante (0) até Eterno (2.000.000+).
5. Todos os jogos elegíveis alimentam a mesma Autoridade global.
6. Autoridade não é comprável diretamente.
7. Derrota não reduz Autoridade.
8. Ranking competitivo é separado.
9. Recompensas são calculadas e validadas server-side.
10. Toda concessão relevante deve possuir histórico auditável.
11. Anti-AFK, anti-farm, idempotência e proteção contra duplicidade são requisitos obrigatórios.
12. A evolução de Aura é automática ao atingir o threshold.
13. O visual das Auras será uma etapa separada.

---

## 20. Próximas etapas

1. mapear schema atual de progressão e jogos para evitar duplicação;
2. definir schema técnico de Autoridade e ledger;
3. definir contrato de recompensa entre jogos e backend;
4. implementar concessão server-side idempotente;
5. integrar primeiro jogo elegível;
6. implementar leitura da Aura no perfil/Home;
7. instrumentar analytics;
8. executar QA e segurança;
9. balancear geração de Autoridade com dados reais;
10. somente depois iniciar implementação visual das 15 Auras.
