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
  if p_type not in ('friend_request','message','pulso_like','pulso_comment','pulso_reply','pulso_follow','pulso_comment_like','room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation','game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed','achievement','reward','coins','avatar','room_reward','system') then raise exception 'invalid_notification_type' using errcode='22023'; end if;
  if p_category not in ('friend_request','message','social','rooms','games','rewards','system') then raise exception 'invalid_notification_category' using errcode='22023'; end if;
  if p_priority not in ('low','normal','high','critical') then raise exception 'invalid_notification_priority' using errcode='22023'; end if;
  if char_length(btrim(coalesce(p_title,'')))<1 or char_length(p_title)>160 then raise exception 'invalid_notification_title' using errcode='22023'; end if;
  if p_message is not null and char_length(p_message)>500 then raise exception 'notification_message_too_long' using errcode='22023'; end if;
  if p_action_url is not null and (char_length(p_action_url)>500 or p_action_url like '%://%' or p_action_url like '//%') then raise exception 'invalid_notification_action_url' using errcode='22023'; end if;
  if not ((p_type='friend_request' and p_category='friend_request') or (p_type='message' and p_category='message') or (p_type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow','pulso_comment_like') and p_category='social') or (p_type in ('room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation') and p_category='rooms') or (p_type in ('game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed') and p_category='games') or (p_type in ('achievement','reward','coins','avatar','room_reward') and p_category='rewards') or (p_type='system' and p_category='system')) then raise exception 'notification_type_category_mismatch' using errcode='22023'; end if;
  if p_related_user_id is not null and p_related_user_id=p_user_id and p_type not in ('achievement','reward','coins','avatar','room_reward','system') then return null; end if;
  select np.in_app_enabled,case p_category when 'friend_request' then np.friend_requests_enabled when 'message' then np.messages_enabled when 'social' then np.pulso_enabled when 'rooms' then np.rooms_enabled when 'games' then np.games_enabled when 'rewards' then np.rewards_enabled when 'system' then np.system_enabled else true end into v_in_app,v_category_enabled from public.notification_preferences np where np.user_id=p_user_id;
  if not (p_category='system' and p_priority='critical') and (not coalesce(v_in_app,true) or not coalesce(v_category_enabled,true)) then return null; end if;
  if p_category in ('social','friend_request','rooms','games','rewards') and p_related_user_id is not null then select count(*) into v_count from public.notifications n where n.user_id=p_user_id and n.type=p_type and n.related_user_id=p_related_user_id and n.created_at>now()-interval '1 minute'; if v_count>=30 then return null; end if; end if;
  insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,expires_at,metadata,action_state)
  values(p_user_id,p_type,btrim(p_title),p_message,p_related_user_id,p_related_id,p_category,p_priority,p_action_url,p_dedupe_key,p_expires_at,coalesce(p_metadata,'{}'::jsonb),case when p_type in ('friend_request','room_invite','room_seat_request','game_challenge') then 'pending' else 'none' end)
  on conflict (user_id,dedupe_key) where dedupe_key is not null do update set title=case when p_refresh_existing then excluded.title else public.notifications.title end,message=case when p_refresh_existing then excluded.message else public.notifications.message end,related_user_id=case when p_refresh_existing then excluded.related_user_id else public.notifications.related_user_id end,related_id=case when p_refresh_existing then excluded.related_id else public.notifications.related_id end,category=case when p_refresh_existing then excluded.category else public.notifications.category end,priority=case when p_refresh_existing then excluded.priority else public.notifications.priority end,action_url=case when p_refresh_existing then excluded.action_url else public.notifications.action_url end,expires_at=case when p_refresh_existing then excluded.expires_at else public.notifications.expires_at end,metadata=case when p_refresh_existing then excluded.metadata else public.notifications.metadata end,created_at=case when p_refresh_existing then now() else public.notifications.created_at end,read_at=case when p_refresh_existing then null else public.notifications.read_at end,seen_at=case when p_refresh_existing then null else public.notifications.seen_at end
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.zuno_notification_defaults() returns trigger language plpgsql set search_path='public' as $$
begin
  if new.type='friend_request' then new.category:='friend_request'; new.action_url:=coalesce(new.action_url,'amigos.html');
  elsif new.type='message' then new.category:='message'; new.action_url:=coalesce(new.action_url,'conversas.html');
  elsif new.type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow','pulso_comment_like') then new.category:='social'; new.action_url:=coalesce(new.action_url,'pulso.html');
  elsif new.type in ('room_invite','room_seat_request','room_seat_approved','room_seat_rejected','room_moderation') then new.category:='rooms'; new.action_url:=coalesce(new.action_url,'salas.html');
  elsif new.type in ('game_challenge','game_challenge_accepted','game_challenge_rejected','game_challenge_completed') then new.category:='games'; new.action_url:=coalesce(new.action_url,'jogos.html');
  elsif new.type in ('achievement','reward','coins','avatar','room_reward') then new.category:='rewards'; new.action_url:=coalesce(new.action_url,'historico.html');
  elsif new.type='system' then new.category:='system'; new.action_url:=coalesce(new.action_url,'notificacoes.html'); end if;
  if new.dedupe_key is null and new.related_id is not null then new.dedupe_key:=new.type||':'||new.related_id::text; end if;
  return new;
end $$;

revoke all on function private.zuno_emit_notification(uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb,timestamptz,boolean) from public,anon,authenticated;
