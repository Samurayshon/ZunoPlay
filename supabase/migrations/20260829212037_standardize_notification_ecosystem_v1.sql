alter table public.notifications
  add constraint notifications_category_chk
  check (category in ('friend_request','message','social','rewards','system'));

alter table public.notifications
  add constraint notifications_priority_chk
  check (priority in ('low','normal','high','critical'));

create or replace function private.zuno_emit_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text default null,
  p_related_user_id uuid default null,
  p_related_id uuid default null,
  p_category text default 'system',
  p_priority text default 'normal',
  p_action_url text default null,
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null,
  p_refresh_existing boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
  v_in_app boolean := true;
  v_category_enabled boolean := true;
  v_count integer := 0;
begin
  if p_user_id is null then return null; end if;
  if p_type not in ('friend_request','message','pulso_like','pulso_comment','pulso_reply','pulso_follow','achievement','reward','coins','avatar','system') then
    raise exception 'invalid_notification_type' using errcode='22023';
  end if;
  if p_category not in ('friend_request','message','social','rewards','system') then
    raise exception 'invalid_notification_category' using errcode='22023';
  end if;
  if p_priority not in ('low','normal','high','critical') then
    raise exception 'invalid_notification_priority' using errcode='22023';
  end if;
  if char_length(btrim(coalesce(p_title,''))) < 1 or char_length(p_title) > 120 then
    raise exception 'invalid_notification_title' using errcode='22023';
  end if;
  if p_message is not null and char_length(p_message) > 300 then
    raise exception 'notification_message_too_long' using errcode='22023';
  end if;
  if p_action_url is not null and (char_length(p_action_url) > 500 or p_action_url like '%://%' or p_action_url like '//%') then
    raise exception 'invalid_notification_action_url' using errcode='22023';
  end if;

  if not (
    (p_type='friend_request' and p_category='friend_request') or
    (p_type='message' and p_category='message') or
    (p_type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow') and p_category='social') or
    (p_type in ('achievement','reward','coins','avatar') and p_category='rewards') or
    (p_type='system' and p_category='system')
  ) then
    raise exception 'notification_type_category_mismatch' using errcode='22023';
  end if;

  select np.in_app_enabled,
         case p_category
           when 'friend_request' then np.friend_requests_enabled
           when 'message' then np.messages_enabled
           when 'social' then np.pulso_enabled
           when 'rewards' then np.rewards_enabled
           when 'system' then np.system_enabled
           else true
         end
    into v_in_app, v_category_enabled
    from public.notification_preferences np
   where np.user_id = p_user_id;

  v_in_app := coalesce(v_in_app,true);
  v_category_enabled := coalesce(v_category_enabled,true);

  if not (p_category='system' and p_priority='critical') then
    if not v_in_app or not v_category_enabled then return null; end if;
  end if;

  if p_category in ('social','friend_request','rewards') and p_related_user_id is not null then
    select count(*) into v_count
      from public.notifications n
     where n.user_id=p_user_id
       and n.type=p_type
       and n.related_user_id=p_related_user_id
       and n.created_at > now()-interval '1 minute';
    if v_count >= 30 then return null; end if;
  end if;

  if p_dedupe_key is not null and p_refresh_existing then
    insert into public.notifications(
      user_id,type,title,message,related_user_id,related_id,category,priority,
      action_url,dedupe_key,expires_at,metadata
    ) values (
      p_user_id,p_type,btrim(p_title),p_message,p_related_user_id,p_related_id,p_category,p_priority,
      p_action_url,p_dedupe_key,p_expires_at,coalesce(p_metadata,'{}'::jsonb)
    )
    on conflict (user_id,dedupe_key) where dedupe_key is not null do update set
      title=excluded.title,
      message=excluded.message,
      related_user_id=excluded.related_user_id,
      related_id=excluded.related_id,
      category=excluded.category,
      priority=excluded.priority,
      action_url=excluded.action_url,
      expires_at=excluded.expires_at,
      metadata=excluded.metadata,
      created_at=now(),
      read_at=null,
      seen_at=null
    returning id into v_id;
  else
    insert into public.notifications(
      user_id,type,title,message,related_user_id,related_id,category,priority,
      action_url,dedupe_key,expires_at,metadata
    ) values (
      p_user_id,p_type,btrim(p_title),p_message,p_related_user_id,p_related_id,p_category,p_priority,
      p_action_url,p_dedupe_key,p_expires_at,coalesce(p_metadata,'{}'::jsonb)
    )
    on conflict (user_id,dedupe_key) where dedupe_key is not null do nothing
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;

revoke all on function private.zuno_emit_notification(uuid,text,text,text,uuid,uuid,text,text,text,text,jsonb,timestamptz,boolean) from public, anon, authenticated;

create or replace function public.create_friend_request_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_sender_name text;
begin
  if new.status='pending' then
    select coalesce(nullif(btrim(p.username),''),'Alguém') into v_sender_name
      from public.profiles p where p.id=new.sender_id;
    perform private.zuno_emit_notification(
      new.receiver_id,'friend_request',coalesce(v_sender_name,'Alguém')||' quer adicionar você',null,
      new.sender_id,new.id,'friend_request','normal','amigos.html','friend_request:'||new.id::text,
      jsonb_build_object('friend_request_id',new.id,'sender_id',new.sender_id,'sender_username',coalesce(v_sender_name,'Alguém')),
      null,false
    );
  end if;
  return new;
end;
$function$;

create or replace function public.pulso_emit_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_user uuid; actor uuid; kind text; msg text; rel uuid; dkey text;
  parent_owner uuid; event_suffix text:=''; actor_name text;
begin
  if tg_table_name='moments_likes' then
    select user_id into target_user from public.moments_posts where id=new.post_id;
    actor:=new.user_id; kind:='pulso_like'; msg:='curtiu sua publicação'; rel:=new.post_id;
  elsif tg_table_name='moments_comments' then
    actor:=new.user_id; rel:=new.post_id; event_suffix:=new.id::text;
    if new.parent_comment_id is not null then
      select user_id into parent_owner from public.moments_comments where id=new.parent_comment_id;
    end if;
    if parent_owner is not null and parent_owner<>actor then
      target_user:=parent_owner; kind:='pulso_reply'; msg:='respondeu seu comentário';
    else
      select user_id into target_user from public.moments_posts where id=new.post_id;
      kind:='pulso_comment'; msg:='comentou na sua publicação';
    end if;
  elsif tg_table_name='moments_follows' then
    target_user:=new.following_id; actor:=new.follower_id; kind:='pulso_follow'; msg:='começou a seguir você'; rel:=null;
  end if;

  if target_user is not null and actor is not null and target_user<>actor then
    select coalesce(nullif(btrim(p.username),''),'Alguém') into actor_name from public.profiles p where p.id=actor;
    dkey:=kind||':'||actor||':'||coalesce(rel::text,target_user::text)||':'||event_suffix;
    perform private.zuno_emit_notification(
      target_user,kind,coalesce(actor_name,'Alguém')||' '||msg,null,actor,rel,'social','normal',
      case when rel is null then 'perfil.html?user='||actor else 'pulso.html?post='||rel end,
      dkey,jsonb_build_object('surface','pulso','event_type',kind,'actor_username',coalesce(actor_name,'Alguém')),
      null,true
    );
  end if;
  return new;
end;
$function$;

create or replace function public.zunoplay_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_sender_name text; v_conv_type text; v_member uuid; v_preview text;
begin
  if new.type='system' then return null; end if;
  select coalesce(nullif(btrim(p.username),''),'ZunoPlay') into v_sender_name from public.profiles p where p.id=new.sender_id;
  select c.type into v_conv_type from public.conversations c where c.id=new.conversation_id;
  v_preview:=case when new.type='text' then left(coalesce(new.content,''),140) else case new.type when 'image' then '📷 Enviou uma foto' when 'video' then '🎬 Enviou um vídeo' when 'audio' then '🎙 Enviou um áudio' when 'file' then '📎 Enviou um arquivo' when 'gif' then 'Enviou um GIF' when 'sticker' then 'Enviou um sticker' else 'Nova mensagem' end end;
  if v_conv_type='direct' and new.receiver_id is not null then
    perform private.zuno_emit_notification(
      new.receiver_id,'message',v_sender_name,v_preview,new.sender_id,new.id,'message','normal',
      'conversas.html?conversation='||new.conversation_id::text,'message:'||new.id::text,
      jsonb_build_object('conversation_id',new.conversation_id,'message_id',new.id,'message_type',new.type),null,false
    );
  elsif v_conv_type='group' then
    for v_member in select cm.user_id from public.conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id loop
      perform private.zuno_emit_notification(
        v_member,'message',v_sender_name,v_preview,new.sender_id,new.id,'message','normal',
        'conversas.html?conversation='||new.conversation_id::text,'message:'||new.id::text||':'||v_member::text,
        jsonb_build_object('conversation_id',new.conversation_id,'message_id',new.id,'message_type',new.type),null,false
      );
    end loop;
  end if;
  return null;
end;
$function$;

create or replace function public.zuno_clear_notifications(p_scope text default 'all', p_read_only boolean default false)
returns integer
language plpgsql
set search_path to ''
as $function$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_scope not in ('all','friend_request','message','social','rewards','system') then
    raise exception 'invalid_notification_scope' using errcode='22023';
  end if;
  delete from public.notifications n
   where n.user_id=v_user
     and (not p_read_only or n.read_at is not null)
     and (p_scope='all' or n.category=p_scope);
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;

revoke all on function public.zuno_clear_notifications(text,boolean) from public, anon;
grant execute on function public.zuno_clear_notifications(text,boolean) to authenticated;

create or replace function public.zuno_notification_defaults()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.type='friend_request' then new.category:='friend_request'; if coalesce(new.action_url,'')='' then new.action_url:='amigos.html'; end if;
  elsif new.type='message' then new.category:='message'; if coalesce(new.action_url,'')='' then new.action_url:='conversas.html'; end if;
  elsif new.type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow') then new.category:='social'; if coalesce(new.action_url,'')='' then new.action_url:='pulso.html'; end if;
  elsif new.type in ('achievement','reward','coins','avatar') then new.category:='rewards'; if coalesce(new.action_url,'')='' then new.action_url:=case new.type when 'avatar' then 'avatar.html' else 'historico.html' end; end if;
  elsif new.type='system' then new.category:='system'; if coalesce(new.action_url,'')='' or new.action_url in ('index.html','./index.html','/','./') then new.action_url:='notificacoes.html'; end if;
  end if;
  if new.dedupe_key is null and new.related_id is not null then new.dedupe_key:=new.type||':'||new.related_id::text; end if;
  return new;
end;
$function$;
