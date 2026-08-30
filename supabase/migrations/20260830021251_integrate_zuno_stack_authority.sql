-- Etapa 6: habilita Zuno Stack como primeiro jogo no sistema global de Autoridade.
-- O valor final nunca vem do cliente: a integração lê o estado autoritativo da partida.
insert into public.authority_game_rules(game_id,enabled,min_participation_seconds,max_base_authority,repeat_window_minutes,repeat_multipliers)
values ('zuno_stack',true,30,15,1440,array[1.00,1.00,0.75,0.50,0.25,0.10,0.00]::numeric[])
on conflict (game_id) do update set enabled=excluded.enabled,min_participation_seconds=excluded.min_participation_seconds,max_base_authority=excluded.max_base_authority,repeat_window_minutes=excluded.repeat_window_minutes,repeat_multipliers=excluded.repeat_multipliers,updated_at=now();

-- A primeira versão pública do claim foi criada nesta migration e imediatamente
-- movida para zuno_private pela migration seguinte após o security advisor apontar
-- a superfície SECURITY DEFINER autenticada. Fresh installs usam a versão privada
-- definitiva da migration 20260830021406.
