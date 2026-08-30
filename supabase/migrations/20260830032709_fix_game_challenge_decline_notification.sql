create or replace function public.zuno_notify_game_challenge_status()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor text;
  v_type text;
  v_title text;
  v_target uuid;
  v_state text;
begin
  if new.status is not distinct from old.status then return null; end if;

  select coalesce(nullif(btrim(p.username),''),'Jogador')
    into v_actor
    from public.profiles p
   where p.id=new.challenged_id;

  if new.status='accepted' then
    v_type:='game_challenge_accepted';
    v_title:=v_actor||' aceitou seu desafio';
    v_target:=new.challenger_id;
    v_state:='accepted';
  elsif new.status='declined' then
    v_type:='game_challenge_rejected';
    v_title:=v_actor||' recusou seu desafio';
    v_target:=new.challenger_id;
    v_state:='rejected';
  elsif new.status='completed' then
    v_type:='game_challenge_completed';
    v_title:='Desafio concluído';
    v_target:=new.challenger_id;
    v_state:='completed';
  else
    return null;
  end if;

  update public.notifications n
     set action_state=v_state,
         resolved_at=case when v_state in ('rejected','completed') then coalesce(n.resolved_at,now()) else n.resolved_at end
   where n.type='game_challenge'
     and n.related_id=new.id
     and n.user_id=new.challenged_id;

  perform private.zuno_emit_notification(
    v_target,v_type,v_title,null,new.challenged_id,new.id,'games','normal','jogos.html',
    v_type||':'||new.id::text,
    jsonb_build_object('challenge_id',new.id,'game_id',new.game_id,'status',new.status),
    null,false
  );
  return null;
end;
$function$;
