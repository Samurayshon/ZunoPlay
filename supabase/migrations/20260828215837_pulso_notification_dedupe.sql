create or replace function public.pulso_emit_notification() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_user uuid; actor uuid; kind text; msg text; rel uuid; dkey text;
begin
  if tg_table_name='moments_likes' then
    select user_id into target_user from public.moments_posts where id=new.post_id;
    actor:=new.user_id; kind:='pulso_like'; msg:='curtiu sua publicação no Pulso'; rel:=new.post_id;
  elsif tg_table_name='moments_comments' then
    select user_id into target_user from public.moments_posts where id=new.post_id;
    actor:=new.user_id; kind:='pulso_comment'; msg:='comentou na sua publicação do Pulso'; rel:=new.post_id;
  elsif tg_table_name='moments_follows' then
    target_user:=new.following_id; actor:=new.follower_id; kind:='pulso_follow'; msg:='começou a seguir você no Pulso'; rel:=null;
  end if;
  if target_user is not null and actor is not null and target_user<>actor then
    dkey:=kind||':'||actor||':'||coalesce(rel::text,target_user::text);
    insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,metadata)
    values(target_user,kind,'Pulso',msg,actor,rel,'social','normal',case when rel is null then 'perfil.html?id='||actor else 'momentos.html?post='||rel end,dkey,jsonb_build_object('surface','pulso'))
    on conflict (user_id,dedupe_key) where dedupe_key is not null do update set
      created_at=now(),read_at=null,seen_at=null,message=excluded.message,action_url=excluded.action_url,metadata=excluded.metadata;
  end if;
  return new;
end;$$;
