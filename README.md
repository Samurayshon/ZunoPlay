# ZunoPlay

Aplicativo social de chat, salas de voz, comunidades e jogos.

## Estado de lançamento

A base do aplicativo está funcional e passa por estabilização para produção.

### Concluído

- Supabase Auth + perfis protegidos por RLS
- Campos sensíveis de progressão/economia (`level` e `coins`) protegidos contra alteração direta pelo cliente
- Usernames case-insensitive protegidos por índice único; não há duplicados legados no banco atual
- Não há perfis órfãos no banco atual
- Realtime global com Presence, Broadcast e Postgres Changes separados por finalidade
- Tópicos privados de sala autorizados para mensagens, voz, reações/Pulse, presentes e convites de jogo
- Presence reservado para presença/entrada/saída; estados rápidos de voz (`speaking`, `listening`, `muted`) usam Broadcast
- Conversas e mensagens de sala via canais privados
- Integridade de mensagens e notificações protegida: o cliente só pode alterar estado de leitura
- Assentos protegidos: participante só atualiza heartbeat; dono só move assentos de outros participantes
- Salas de voz WebRTC P2P
- Reconexão de ICE, reconexão de canal Realtime e recuperação após queda de rede
- Limpeza de assentos abandonados integrada ao fluxo de entrada
- Cadastro de usuários
- PWA com manifest, shortcuts e cache das telas essenciais

### Bloqueadores externos antes do lançamento público

1. Configurar um provedor TURN de produção para redes onde conexão P2P direta não é possível.
2. Ativar **Leaked Password Protection** no Supabase Auth.
3. Executar teste final em Android, iPhone, Wi-Fi residencial e rede móvel.
4. Fazer o reset dos dados de teste somente quando houver decisão explícita de lançamento.

### Trabalho de produto ainda pendente

- Multiplayer sincronizado de verdade (estado da partida, perguntas, cronômetro e placar compartilhados)
- Loja/Zuno Coins com operações econômicas exclusivamente server-side
- Conquistas e eventos
- Consolidação dos módulos da sala e cobertura automatizada de regressão

## TURN / WebRTC

`voz-sala.js` nunca deve receber segredo permanente de TURN diretamente no GitHub Pages.

O módulo aceita duas formas seguras de configuração.

### Provider JavaScript

```js
window.ZunoVoiceICEProvider = async ({ roomId, userId, supabase }) => ({
  iceServers: [{
    urls: ["turn:turn.example.com:3478"],
    username: "temporary-user",
    credential: "temporary-password"
  }]
});
```

### Endpoint autenticado

```js
window.ZUNO_TURN_ENDPOINT = "https://backend.example.com/turn-credentials";
```

O ZunoPlay envia o JWT atual no header `Authorization: Bearer <token>` e espera credenciais TURN temporárias. Se TURN não estiver configurado ou estiver indisponível, a voz continua tentando conexão direta usando STUN.

## Dados de teste

Não executar limpeza destrutiva antes da decisão explícita de lançamento. Os dados atuais continuam sendo usados para testes funcionais e serão resetados apenas na etapa final de pré-lançamento.
