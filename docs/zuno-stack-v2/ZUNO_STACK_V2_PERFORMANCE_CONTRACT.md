# Zuno Stack V2 — Performance Contract

Status: Fase 0 — contrato oficial e obrigatório de performance.

## 1. Princípio

Performance é critério de produto e gate de fase. Uma feature que torne o Stack perceptivelmente travado, atrasado ou instável não é considerada concluída, mesmo que funcionalmente correta.

Prioridade:

**input imediato > estado correto > leitura clara > animação > decoração.**

## 2. Arquitetura obrigatória

- Core sem DOM, rede ou timers de UI.
- Um estado canônico de gameplay por match.
- UI orientada a mudanças de estado/eventos, sem varredura global contínua.
- Proibido `MutationObserver` global para lógica do jogo.
- Proibido polling agressivo para sincronizar gameplay.
- Proibidos múltiplos loops independentes recalculando o mesmo estado.
- Servidor sincroniza comandos/estado; nunca frames de animação.
- Efeitos decorativos não podem ser pré-requisito para regra do jogo.
- Solo, Trio e PvP reutilizam o Core sem carregar módulos de outros modos que não sejam necessários à partida atual.

## 3. Orçamento de resposta ao toque

No dispositivo Android de referência intermediário, em gameplay normal:

- feedback visual inicial de toque: alvo p95 <= 100 ms;
- trabalho síncrono de uma ação comum no main thread: alvo p95 <= 50 ms;
- nenhuma ação comum deve causar congelamento perceptível >= 200 ms por trabalho local do jogo;
- confirmação de rede não deve bloquear o feedback visual local quando for seguro apresentar estado especulativo.

Se a rede estiver lenta, a UI deve continuar responsiva e indicar confirmação/reconciliação sem congelar a tela.

## 4. Frames e animações

- alvo primário: 60 fps em Android intermediário suportado;
- degradação aceitável: manter jogabilidade responsiva em ~30 fps em dispositivo mais fraco, reduzindo decoração;
- animações de gameplay devem preferir `transform` e `opacity`;
- evitar animações de propriedades que forçam layout/reflow contínuo;
- blur, box-shadow amplo, filtros e partículas têm orçamento limitado;
- `will-change` não pode ser aplicado de forma permanente a grandes quantidades de elementos;
- efeitos devem respeitar `prefers-reduced-motion` quando aplicável.

A UI deve possuir um modo de efeitos reduzidos acionável por capacidade/medição sem alterar regras.

## 5. Renderização incremental

Uma ação não deve reconstruir todo o Board, Tray, HUD e overlays se apenas uma pequena parte mudou.

A camada de apresentação deve trabalhar com atualizações incrementais por identidade estável:

- peça alterada/removida;
- slots da Tray afetados;
- trio resolvido;
- contadores alterados;
- recurso/poder alterado;
- estado compartilhado alterado.

Full render/hydration é reservado a boot, mudança estrutural, snapshot de reconexão ou recuperação de desync.

## 6. Board e camadas

O Core pode conter todas as camadas lógicas; a UI só deve materializar o necessário para interação/leitura.

Para o Trio com alvo de 12 camadas por jogador:

- 12 camadas não significam 12 camadas visualmente pesadas simultâneas;
- peças ocultas podem permanecer apenas em estado lógico;
- preview/mini-board deve usar representação compacta, não duplicar o DOM completo do Board;
- nenhum Board remoto deve renderizar o mesmo nível de detalhe do Board local quando isso não trouxer benefício ao jogador.

O número final de camadas do Trio só será congelado após benchmark real.

## 7. Rede

Gameplay normal deve usar mensagens compactas por ação e deltas/eventos quando possível.

Regras:

- não enviar snapshot completo a cada toque;
- não transmitir animações;
- não transmitir estado visual;
- agrupar telemetria quando seguro;
- aplicar backpressure/limites a eventos não críticos;
- reconnect pode usar snapshot completo;
- o cliente não deve manter polling de alta frequência se Realtime/eventos já fornecem atualização.

Metas iniciais para orientar implementação (ajustáveis somente por benchmark documentado):

- comando comum: tipicamente < 1 KB;
- ack/delta comum: tipicamente < 4 KB;
- frequência de sincronização determinada por ações, não por frame.

## 8. Timers e schedulers

- gameplay não deve depender de vários `setInterval` concorrentes;
- relógios visuais podem derivar de um timestamp autoritativo e um scheduler compartilhado;
- tarefas visuais não críticas param/reduzem quando a página/app está em background;
- timers precisam ser desmontados ao sair da partida;
- nenhuma lógica deve criar polling sem lifecycle/cleanup explícito.

## 9. Memória

Objetivos obrigatórios:

- nenhuma referência permanente a peças/DOM de partidas encerradas;
- listeners, channels, timers e observers sempre possuem cleanup;
- caches possuem limite/tamanho definido;
- históricos para Undo/replay em memória são limitados ao necessário;
- estado não cresce indefinidamente com eventos já consolidados.

Teste de soak deve executar partidas repetidas e verificar ausência de crescimento monotônico não explicado. Onde a medição de heap permitir, após GC/estabilização o uso não deve continuar crescendo a cada partida.

## 10. Boot e carregamento

O jogador não deve baixar/carregar funcionalidades pesadas de fases/modos não utilizados para iniciar Solo.

- carregar caminho crítico primeiro;
- módulos de Trio/PvP/Ranking/Aura podem ser lazy quando não necessários ao boot atual;
- evitar injeção cascata de dezenas de scripts/folhas de estilo independentes;
- preferir composição previsível/bundles por responsabilidade;
- fontes/imagens/áudio não podem bloquear o primeiro estado jogável.

Orçamentos exatos de bundle serão congelados na Fase 1 após medir a stack de build escolhida; a ausência de número inicial não autoriza crescimento sem revisão.

## 11. Áudio e haptics

- áudio deve reutilizar contexto/recursos, não criar infraestrutura nova por toque;
- vibração deve ser curta e baseada em eventos importantes;
- falha de áudio/haptic nunca bloqueia transição;
- preload é limitado aos assets realmente usados no modo atual.

## 12. Telemetria de performance

Builds de teste devem medir, de forma amostral e barata:

- input-to-feedback;
- duração das transições do Core;
- render/update da UI;
- long tasks;
- FPS/jank quando tecnicamente disponível;
- tamanho/frequência de mensagens;
- tempo de snapshot/reconnect;
- memória/cleanup em testes controlados.

Telemetria de produção não pode, por si só, causar jank relevante.

## 13. Gates por fase

Antes de avançar qualquer fase que altere gameplay executável:

1. testes funcionais verdes;
2. benchmark no Android de referência;
3. sem regressão perceptível de input;
4. sem novo freeze >= 200 ms atribuível à feature em ação comum;
5. sem vazamento conhecido;
6. sem polling/observer proibido;
7. comparação com baseline anterior registrada.

Se uma feature falhar no gate, corrige-se a feature antes de avançar.

## 14. Estratégia de degradação

Quando o dispositivo estiver sob pressão, reduzir nesta ordem:

1. partículas e decoração;
2. blur/glow/sombras caras;
3. animações secundárias;
4. detalhe de mini-boards remotos;
5. frequência de telemetria visual.

Nunca degradar:

- precisão do input;
- regras do Core;
- estado autoritativo;
- legibilidade de peça/Tray;
- informação crítica de risco/objetivo.

## 15. Testes mínimos futuros

- benchmark de 1 Board Solo;
- stress de Tray/combo/poderes;
- soak de partidas repetidas;
- background/foreground;
- rede lenta/offline/reconnect;
- Trio com 3 Boards lógicos e previews;
- concorrência de Relay/Pulse;
- PvP com troca rápida de comandos;
- aparelhos com CPU/GPU/memória mais fracos que a referência quando disponíveis.

## 16. Regra de produto

**Nenhuma feature nova entra no Zuno Stack V2 se exigir sacrificar a fluidez básica do jogo.**

A dificuldade deve vir do Stack, não do aparelho tentando acompanhar a interface.
