alter table public.notifications add column if not exists action_state text not null default 'none';
alter table public.notifications add column if not exists resolved_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='notifications_action_state_chk') then
    alter table public.notifications add constraint notifications_action_state_chk
      check (action_state in ('none','pending','accepted','rejected','cancelled','expired','completed'));
  end if;
end $$;

create index if not exists notifications_user_state_idx
  on public.notifications(user_id,action_state,created_at desc);

create or replace function private.zuno_emit_notification(
  p_user_id uuid, p_type text, p_title text, p_message text default null,
  p_related_user_id uuid default null, p_related_id uuid default null,
  p_category text default 'system', p_priority text default 'normal',
  p_action_url text default null, p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb, p_expires_at timestamptz default null,
  p_refresh_existing boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_in_app boolean:=true; v_category_enabled boolean:=true; v_count int:=0;
begin
  if p_user_id is null then return null; end if;
  if p_type not in ('friend_request','message','pulso_like','pulso_comment','pulso_reply','pulso_follow','room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation','game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed','achievement','reward','coins','avatar','room_reward','system') then raise exception 'invalid_notification_type' using errcode='22023'; end if;
  if p_category not in ('friend_request','message','social','rooms','games','rewards','system') then raise exception 'invalid_notification_category' using errcode='22023'; end if;
  if p_priority not in ('low','normal','high','critical') then raise exception 'invalid_notification_priority' using errcode='22023'; end if;
  if char_length(btrim(coalesce(p_title,'')))<1 or char_length(p_title)>160 then raise exception 'invalid_notification_title' using errcode='22023'; end if;
  if p_message is not null and char_length(p_message)>500 then raise exception 'notification_message_too_long' using errcode='22023'; end if;
  if p_action_url is not null and (char_length(p_action_url)>500 or p_action_url like '%://%' or p_action_url like '//%') then raise exception 'invalid_notification_action_url' using errcode='22023'; end if;
  if not ((p_type='friend_request' and p_category='friend_request') or (p_type='message' and p_category='message') or (p_type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow') and p_category='social') or (p_type in ('room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation') and p_category='rooms') or (p_type in ('game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed') and p_category='games') or (p_type in ('achievement','reward','coins','avatar','room_reward') and p_category='rewards') or (p_type='system' and p_category='system')) then raise exception 'notification_type_category_mismatch' using errcode='22023'; end if;
  if p_related_user_id is not null and p_related_user_id=p_user_id and p_type not in ('achievement','reward','coins','avatar','room_reward','system') then return null; end if;

  select np.in_app_enabled,
    case p_category when 'friend_request' then np.friend_requests_enabled when 'message' then np.messages_enabled when 'social' then np.pulso_enabled when 'rooms' then np.rooms_enabled when 'games' then np.games_enabled when 'rewards' then np.rewards_enabled when 'system' then np.system_enabled else true end
  into v_in_app,v_category_enabled from public.notification_preferences np where np.user_id=p_user_id;

  if not (p_category='system' and p_priority='critical') and (not coalesce(v_in_app,true) or not coalesce(v_category_enabled,true)) then return null; end if;

  if p_category in ('social','friend_request','rooms','games','rewards') and p_related_user_id is not null then
    select count(*) into v_count from public.notifications n where n.user_id=p_user_id and n.type=p_type and n.related_user_id=p_related_user_id and n.created_at>now()-interval '1 minute';
    if v_count>=30 then return null; end if;
  end if;

  insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,expires_at,metadata,action_state)
  values(p_user_id,p_type,btrim(p_title),p_message,p_related_user_id,p_related_id,p_category,p_priority,p_action_url,p_dedupe_key,p_expires_at,coalesce(p_metadata,'{}'::jsonb),case when p_type in ('friend_request','room_invite','room_seat_request','game_challenge') then 'pending' else 'none' end)
  on conflict (user_id,dedupe_key) where dedupe_key is not null do update set
    title=case when p_refresh_existing then excluded.title else public.notifications.title end,
    message=case when p_refresh_existing then excluded.message else public.notifications.message end,
    related_user_id=case when p_refresh_existing then excluded.related_user_id else public.notifications.related_user_id end,
    related_id=case when p_refresh_existing then excluded.related_id else public.notifications.related_id end,
    category=case when p_refresh_existing then excluded.category else public.notifications.category end,
    priority=case when p_refresh_existing then excluded.priority else public.notifications.priority end,
    action_url=case when p_refresh_existing then excluded.action_url else public.notifications.action_url end,
    expires_at=case when p_refresh_existing then excluded.expires_at else public.notifications.expires_at end,
    metadata=case when p_refresh_existing then excluded.metadata else public.notifications.metadata end,
    created_at=case when p_refresh_existing then now() else public.notifications.created_at end,
    read_at=case when p_refresh_existing then null else public.notifications.read_at end,
    seen_at=case when p_refresh_existing then null else public.notifications.seen_at end
  returning id into v_id;
  return v_id;
end $$;

create or replace function private.zuno_emit_notification(
  p_user_id uuid, p_type text, p_category text, p_title text,
  p_message text default null, p_actor_id uuid default null, p_entity_id uuid default null,
  p_priority text default 'normal', p_action_url text default null, p_dedupe_key text default null,
  p_expires_at timestamptz default null, p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
begin
  return private.zuno_emit_notification(p_user_id,p_type,p_title,p_message,p_actor_id,p_entity_id,p_category,p_priority,p_action_url,p_dedupe_key,p_metadata,p_expires_at,false);
end $$;

create or replace function public.zuno_sync_friend_request_notification_state() returns trigger language plpgsql security definer set search_path='' as $$
declare v_state text;
begin
  if tg_op='DELETE' then v_state:='cancelled'; else v_state:=case new.status when 'pending' then 'pending' when 'accepted' then 'accepted' when 'rejected' then 'rejected' else 'none' end; end if;
  update public.notifications n set action_state=v_state,resolved_at=case when v_state='pending' then null else coalesce(n.resolved_at,now()) end,read_at=case when v_state<>'pending' then coalesce(n.read_at,now()) else n.read_at end,seen_at=case when v_state<>'pending' then coalesce(n.seen_at,now()) else n.seen_at end where n.type='friend_request' and n.related_id=coalesce(new.id,old.id) and n.user_id=coalesce(new.receiver_id,old.receiver_id);
  return coalesce(new,old);
end $$;

drop trigger if exists trg_sync_friend_request_notification_state on public.friend_requests;
create trigger trg_sync_friend_request_notification_state after update of status or delete on public.friend_requests for each row execute function public.zuno_sync_friend_request_notification_state();
revoke all on function public.zuno_sync_friend_request_notification_state() from public,anon,authenticated;

update public.notifications n set action_state=case fr.status when 'pending' then 'pending' when 'accepted' then 'accepted' when 'rejected' then 'rejected' else 'none' end,resolved_at=case when fr.status in ('accepted','rejected') then coalesce(n.resolved_at,now()) else n.resolved_at end from public.friend_requests fr where n.type='friend_request' and n.related_id=fr.id;
update public.notifications set action_state='expired',resolved_at=coalesce(resolved_at,now()) where action_state='pending' and expires_at is not null and expires_at<=now();

create or replace function public.zuno_mark_notifications_read(p_scope text default 'all') returns integer language plpgsql set search_path='' as $$
declare v_user uuid:=auth.uid(); v_count int;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_scope not in ('all','friend_request','message','social','rooms','games','rewards','system') then raise exception 'invalid_notification_scope' using errcode='22023'; end if;
  update public.notifications n set read_at=coalesce(n.read_at,now()),seen_at=coalesce(n.seen_at,now()) where n.user_id=v_user and n.read_at is null and (p_scope='all' or n.category=p_scope);
  get diagnostics v_count=row_count; return v_count;
end $$;

create or replace function public.zuno_mark_notifications_seen() returns integer language plpgsql set search_path='' as $$
declare v_user uuid:=auth.uid(); v_count int;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  update public.notifications n set seen_at=coalesce(n.seen_at,now()) where n.user_id=v_user and n.seen_at is null;
  get diagnostics v_count=row_count; return v_count;
end $$;

revoke all on function public.zuno_mark_notifications_read(text) from public,anon;
grant execute on function public.zuno_mark_notifications_read(text) to authenticated;
revoke all on function public.zuno_mark_notifications_seen() from public,anon;
grant execute on function public.zuno_mark_notifications_seen() to authenticated;
revoke all on function private.zuno_emit_notification(uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb,timestamptz,boolean) from public,anon,authenticated;
revoke all on function private.zuno_emit_notification(uuid,text,text,text,text,uuid,uuid,text,text,text,timestamptz,jsonb) from public,anon,authenticated;