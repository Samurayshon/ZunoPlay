-- ZunoPlay notification ecosystem v1
-- Functional contract only; no visual changes.

alter table public.notification_preferences
  add column if not exists rooms_enabled boolean not null default true,
  add column if not exists games_enabled boolean not null default true;

alter table public.notifications drop constraint if exists notifications_category_chk;
alter table public.notifications add constraint notifications_category_chk
  check (category = any (array['friend_request','message','social','rooms','games','rewards','system']::text[]));

create schema if not exists private;

create or replace function private.zuno_emit_notification(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_message text default null,
  p_actor_id uuid default null,
  p_entity_id uuid default null,
  p_priority text default 'normal',
  p_action_url text default null,
  p_dedupe_key text default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id uuid;
begin
  if p_user_id is null then return null; end if;
  if p_category not in ('friend_request','message','social','rooms','games','rewards','system') then
    raise exception 'invalid_notification_category' using errcode='22023';
  end if;
  if p_priority not in ('low','normal','high','critical') then
    raise exception 'invalid_notification_priority' using errcode='22023';
  end if;
  if p_actor_id is not null and p_actor_id = p_user_id and p_type not in ('achievement','reward','coins','system') then
    return null;
  end if;

  insert into public.notifications(
    user_id,type,title,message,related_user_id,related_id,category,priority,
    action_url,dedupe_key,expires_at,metadata
  ) values (
    p_user_id,p_type,left(coalesce(p_title,'ZunoPlay'),160),left(p_message,500),p_actor_id,p_entity_id,p_category,p_priority,
    p_action_url,p_dedupe_key,p_expires_at,coalesce(p_metadata,'{}'::jsonb)
  ) on conflict do nothing
  returning id into v_id;

  if v_id is null and p_dedupe_key is not null then
    select n.id into v_id from public.notifications n
     where n.user_id=p_user_id and n.dedupe_key=p_dedupe_key limit 1;
  end if;
  return v_id;
end;
$function$;

revoke all on function private.zuno_emit_notification(uuid,text,text,text,text,uuid,uuid,text,text,text,timestamptz,jsonb) from public, anon, authenticated;

create or replace function public.zuno_notification_defaults()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.type='friend_request' then
    new.category:='friend_request'; new.action_url:=coalesce(new.action_url,'amigos.html');
  elsif new.type='message' then
    new.category:='message'; new.action_url:=coalesce(new.action_url,'conversas.html');
  elsif new.type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow') then
    new.category:='social'; new.action_url:=coalesce(new.action_url,'pulso.html');
  elsif new.type in ('room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation') then
    new.category:='rooms'; new.action_url:=coalesce(new.action_url,'salas.html');
  elsif new.type in ('game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed') then
    new.category:='games'; new.action_url:=coalesce(new.action_url,'jogos.html');
  elsif new.type in ('achievement','reward','coins','avatar','room_reward') then
    new.category:='rewards'; new.action_url:=coalesce(new.action_url,'historico.html');
  elsif new.type='system' then
    new.category:='system'; new.action_url:=coalesce(new.action_url,'notificacoes.html');
  end if;

  if new.dedupe_key is null and new.related_id is not null then
    new.dedupe_key:=new.type||':'||new.related_id::text;
  end if;
  return new;
end;
$function$;

create or replace function public.zuno_notification_scope_guard()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.category in ('friend_request','message','social','rooms','games','rewards','system') then return new; end if;
  return null;
end;
$function$;

create or replace function public.zuno_notify_room_invite()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_actor text; v_room text;
begin
  if new.invitee_id is null or new.revoked_at is not null then return null; end if;
  select coalesce(nullif(btrim(p.username),''),'Alguém') into v_actor from public.profiles p where p.id=new.inviter_id;
  select coalesce(nullif(btrim(r.name),''),'uma sala') into v_room from public.rooms r where r.id=new.room_id;
  perform private.zuno_emit_notification(new.invitee_id,'room_invite','rooms',v_actor||' convidou você para '||v_room,
    null,new.inviter_id,new.id,'high','salas.html?room='||new.room_id::text,
    'room_invite:'||new.id::text,new.expires_at,jsonb_build_object('room_id',new.room_id,'invite_id',new.id));
  return null;
end;
$function$;

create or replace function public.zuno_notify_game_challenge()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_actor text;
begin
  if new.status <> 'pending' then return null; end if;
  select coalesce(nullif(btrim(p.username),''),'Um jogador') into v_actor from public.profiles p where p.id=new.challenger_id;
  perform private.zuno_emit_notification(new.challenged_id,'game_challenge','games',v_actor||' desafiou você',
    case when nullif(btrim(new.message),'') is not null then left(new.message,140) else 'Novo desafio em '||new.game_id end,
    new.challenger_id,new.id,'high','jogos.html','game_challenge:'||new.id::text,null,
    jsonb_build_object('challenge_id',new.id,'game_id',new.game_id,'target_score',new.target_score));
  return null;
end;
$function$;

create or replace function public.zuno_notify_game_challenge_status()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_actor text; v_type text; v_title text; v_target uuid;
begin
  if new.status is not distinct from old.status then return null; end if;
  select coalesce(nullif(btrim(p.username),''),'Jogador') into v_actor from public.profiles p where p.id=new.challenged_id;
  if new.status='accepted' then v_type:='game_challenge_accepted'; v_title:=v_actor||' aceitou seu desafio'; v_target:=new.challenger_id;
  elsif new.status='rejected' then v_type:='game_challenge_rejected'; v_title:=v_actor||' recusou seu desafio'; v_target:=new.challenger_id;
  elsif new.status='completed' then v_type:='game_challenge_completed'; v_title:='Desafio concluído'; v_target:=new.challenger_id;
  else return null; end if;
  perform private.zuno_emit_notification(v_target,v_type,'games',v_title,null,new.challenged_id,new.id,'normal','jogos.html',
    v_type||':'||new.id::text,null,jsonb_build_object('challenge_id',new.id,'game_id',new.game_id,'status',new.status));
  return null;
end;
$function$;

create or replace function public.zuno_notify_achievement()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform private.zuno_emit_notification(new.user_id,'achievement','rewards','Conquista desbloqueada',new.achievement_id,
    null,null,'normal','historico.html','achievement:'||new.user_id::text||':'||new.achievement_id,null,
    jsonb_build_object('achievement_id',new.achievement_id));
  return null;
end;
$function$;

create or replace function public.zuno_notify_room_reward()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform private.zuno_emit_notification(new.user_id,'room_reward','rewards','Recompensa recebida',
    case when new.coins>0 then new.coins::text||' moedas recebidas' else 'Recompensa da sala recebida' end,
    null,new.id,'low','historico.html','room_reward:'||new.id::text,null,
    jsonb_build_object('room_id',new.room_id,'reward_key',new.reward_key,'coins',new.coins));
  return null;
end;
$function$;

create or replace function public.zuno_notify_voice_room_reward()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform private.zuno_emit_notification(new.user_id,'room_reward','rewards','Recompensa de voz recebida',
    new.coins::text||' moedas recebidas',null,new.id,'low','historico.html','voice_room_reward:'||new.id::text,null,
    jsonb_build_object('room_id',new.room_id,'coins',new.coins,'reward_date',new.reward_date));
  return null;
end;
$function$;

revoke all on function public.zuno_notify_room_invite() from public,anon,authenticated;
revoke all on function public.zuno_notify_game_challenge() from public,anon,authenticated;
revoke all on function public.zuno_notify_game_challenge_status() from public,anon,authenticated;
revoke all on function public.zuno_notify_achievement() from public,anon,authenticated;
revoke all on function public.zuno_notify_room_reward() from public,anon,authenticated;
revoke all on function public.zuno_notify_voice_room_reward() from public,anon,authenticated;

drop trigger if exists trg_zuno_room_invite_notification on public.room_invites;
create trigger trg_zuno_room_invite_notification after insert on public.room_invites for each row execute function public.zuno_notify_room_invite();
drop trigger if exists trg_zuno_game_challenge_notification on public.game_challenges;
create trigger trg_zuno_game_challenge_notification after insert on public.game_challenges for each row execute function public.zuno_notify_game_challenge();
drop trigger if exists trg_zuno_game_challenge_status_notification on public.game_challenges;
create trigger trg_zuno_game_challenge_status_notification after update of status on public.game_challenges for each row execute function public.zuno_notify_game_challenge_status();
drop trigger if exists trg_zuno_achievement_notification on public.game_achievements;
create trigger trg_zuno_achievement_notification after insert on public.game_achievements for each row execute function public.zuno_notify_achievement();
drop trigger if exists trg_zuno_room_reward_notification on public.room_reward_claims;
create trigger trg_zuno_room_reward_notification after insert on public.room_reward_claims for each row execute function public.zuno_notify_room_reward();
drop trigger if exists trg_zuno_voice_room_reward_notification on public.room_voice_reward_claims;
create trigger trg_zuno_voice_room_reward_notification after insert on public.room_voice_reward_claims for each row execute function public.zuno_notify_voice_room_reward();

create index if not exists notifications_user_category_created_idx on public.notifications(user_id,category,created_at desc);
create index if not exists notifications_user_unseen_idx on public.notifications(user_id,created_at desc) where seen_at is null;

