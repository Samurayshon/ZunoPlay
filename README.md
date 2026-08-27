# ZunoPlay

Aplicativo social de chat, salas de voz, comunidades e jogos.

## Estado de lançamento

A base do aplicativo está funcional e a preparação para produção está em andamento.

### Concluído

- Supabase Auth + perfis protegidos por RLS
- Realtime global com Presence, Broadcast e Postgres Changes separados por finalidade
- Presence reservado para presença/entrada/saída; estados rápidos de voz (`speaking`, `listening`, `muted`) usam Broadcast para evitar rate limit do Presence
- Conversas e mensagens de sala via Broadcast privado
- Salas de voz WebRTC P2P
- Reconexão de ICE, reconexão de canal Realtime e recuperação após queda de rede
- Cadastro de usuários
- PWA com manifest, shortcuts e cache das telas essenciais

### Bloqueadores antes do lançamento público

1. Configurar um provedor TURN de produção para redes onde conexão P2P direta não é possível.
2. Ativar **Leaked Password Protection** no Supabase Auth.
3. Fazer o reset dos dados de teste.
4. Resolver os usernames duplicados legados antes de criar o índice único definitivo case-insensitive.
5. Remover perfis órfãos de testes que não possuem usuário correspondente em `auth.users`.
6. Executar teste final em Android, iPhone, Wi-Fi residencial e rede móvel.

## TURN / WebRTC

`voz-sala.js` nunca deve receber segredo permanente de TURN diretamente no GitHub Pages.

O módulo aceita duas formas seguras de configuração:

### Provider JavaScript

Defina uma função antes de ativar a voz:

```js
window.ZunoVoiceICEProvider = async ({ roomId, userId, supabase }) => {
  return {
    iceServers: [
      {
        urls: ["turn:turn.example.com:3478"],
        username: "temporary-user",
        credential: "temporary-password"
      }
    ]
  };
};
```

### Endpoint autenticado

Também é possível definir:

```js
window.ZUNO_TURN_ENDPOINT = "https://backend.example.com/turn-credentials";
```

O ZunoPlay envia o JWT atual no header `Authorization: Bearer <token>` e espera a resposta:

```json
{
  "iceServers": [
    {
      "urls": ["turn:turn.example.com:3478"],
      "username": "temporary-user",
      "credential": "temporary-password"
    }
  ]
}
```

Se TURN não estiver configurado ou estiver temporariamente indisponível, a voz continua tentando conexão direta usando STUN.

## Dados de teste

Não executar limpeza destrutiva antes da decisão explícita de lançamento. Os dados atuais continuam sendo usados para testes funcionais e serão resetados na etapa final de pré-lançamento.
