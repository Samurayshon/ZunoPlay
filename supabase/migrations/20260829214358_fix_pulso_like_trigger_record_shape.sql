create or replace function public.pulso_emit_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_user uuid; actor uuid; kind text; msg text; rel uuid; dkey text;
  parent_owner uuid; event_suffix text:=''; actor_name text; reaction_target text:=null;
  v_comment_id uuid:=null;
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
  elsif tg_table_name='moments_comment_likes' then
    actor:=new.user_id;
    v_comment_id:=new.comment_id;
    select c.user_id,c.post_id into target_user,rel from public.moments_comments c where c.id=v_comment_id;
    kind:='pulso_like'; msg:='curtiu seu comentário'; event_suffix:=v_comment_id::text; reaction_target:='comment';
  elsif tg_table_name='moments_follows' then
    target_user:=new.following_id; actor:=new.follower_id; kind:='pulso_follow'; msg:='começou a seguir você'; rel:=null;
  end if;

  if target_user is not null and actor is not null and target_user<>actor then
    select coalesce(nullif(btrim(p.username),''),'Alguém') into actor_name from public.profiles p where p.id=actor;
    dkey:=kind||':'||actor||':'||coalesce(rel::text,target_user::text)||':'||event_suffix;
    perform private.zuno_emit_notification(
      target_user,kind,coalesce(actor_name,'Alguém')||' '||msg,null,actor,rel,'social','normal',
      case when rel is null then 'perfil.html?user='||actor else 'pulso.html?post='||rel end,
      dkey,
      jsonb_strip_nulls(jsonb_build_object(
        'surface','pulso',
        'event_type',case when reaction_target='comment' then 'pulso_comment_like' else kind end,
        'actor_username',coalesce(actor_name,'Alguém'),
        'reaction_target',reaction_target,
        'comment_id',v_comment_id
      )),
      null,true
    );
  end if;
  return new;
end;
$function$;

revoke all on function public.pulso_emit_notification() from public, anon, authenticated;
