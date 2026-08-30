create or replace function public.zuno_notify_room_seat_request() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_actor text; v_room text; begin
 select r.owner_id,coalesce(nullif(btrim(r.name),''),'sala') into v_owner,v_room from public.rooms r where r.id=new.room_id;
 select coalesce(nullif(btrim(p.username),''),'Alguém') into v_actor from public.profiles p where p.id=new.user_id;
 if v_owner is not null and v_owner<>new.user_id then
   perform private.zuno_emit_notification(v_owner,'room_seat_request',v_actor||' quer subir ao palco','Pedido para entrar no assento '||new.requested_seat::text,new.user_id,new.id,'rooms','high','salas.html?room='||new.room_id::text,'room_seat_request:'||new.id::text,jsonb_build_object('room_id',new.room_id,'request_id',new.id,'requested_seat',new.requested_seat),null,false);
 end if;
 return null; end $$;

create or replace function public.zuno_notify_room_seat_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_actor text; v_room text; v_type text; v_title text; v_state text; begin
 if new.status is not distinct from old.status then return null; end if;
 if new.status='approved' then v_type:='room_seat_approved'; v_state:='accepted';
 elsif new.status='rejected' then v_type:='room_seat_rejected'; v_state:='rejected'; else return null; end if;
 select coalesce(nullif(btrim(p.username),''),'Host') into v_actor from public.profiles p where p.id=coalesce(new.resolved_by,(select owner_id from public.rooms where id=new.room_id));
 select coalesce(nullif(btrim(r.name),''),'sala') into v_room from public.rooms r where r.id=new.room_id;
 v_title:=case when new.status='approved' then 'Seu pedido de palco foi aceito' else 'Seu pedido de palco foi recusado' end;
 update public.notifications n set action_state=v_state,resolved_at=coalesce(n.resolved_at,now()),read_at=coalesce(n.read_at,now()),seen_at=coalesce(n.seen_at,now()) where n.type='room_seat_request' and n.related_id=new.id;
 perform private.zuno_emit_notification(new.user_id,v_type,v_title,v_room,coalesce(new.resolved_by,(select owner_id from public.rooms where id=new.room_id)),new.id,'rooms','normal','salas.html?room='||new.room_id::text,v_type||':'||new.id::text,jsonb_build_object('room_id',new.room_id,'request_id',new.id,'status',new.status),null,false);
 return null; end $$;

create or replace function public.zuno_notify_room_moderation() returns trigger language plpgsql security definer set search_path='' as $$
declare v_actor text; v_room text; v_title text; begin
 if new.target_id is null or new.target_id=new.actor_id then return null; end if;
 select coalesce(nullif(btrim(p.username),''),'Moderador') into v_actor from public.profiles p where p.id=new.actor_id;
 select coalesce(nullif(btrim(r.name),''),'sala') into v_room from public.rooms r where r.id=new.room_id;
 v_title:=case new.action when 'mute' then 'Seu microfone foi silenciado' when 'unmute' then 'Seu microfone foi liberado' when 'kick' then 'Você foi removido da sala' when 'ban' then 'Você foi banido da sala' when 'unban' then 'Seu banimento foi removido' else 'Ação de moderação na sala' end;
 perform private.zuno_emit_notification(new.target_id,'room_moderation',v_title,v_room,new.actor_id,new.id,'rooms',case when new.action in ('kick','ban') then 'high' else 'normal' end,'salas.html?room='||new.room_id::text,'room_moderation:'||new.id::text,jsonb_build_object('room_id',new.room_id,'action',new.action,'actor_username',coalesce(v_actor,'Moderador')),null,false);
 return null; end $$;

drop trigger if exists trg_zuno_room_seat_request_notification on public.room_seat_requests;
create trigger trg_zuno_room_seat_request_notification after insert on public.room_seat_requests for each row when (new.status='pending') execute function public.zuno_notify_room_seat_request();
drop trigger if exists trg_zuno_room_seat_status_notification on public.room_seat_requests;
create trigger trg_zuno_room_seat_status_notification after update of status on public.room_seat_requests for each row execute function public.zuno_notify_room_seat_status();
drop trigger if exists trg_zuno_room_moderation_notification on public.room_moderation_actions;
create trigger trg_zuno_room_moderation_notification after insert on public.room_moderation_actions for each row execute function public.zuno_notify_room_moderation();

create or replace function public.zuno_sync_room_invite_notification_state() returns trigger language plpgsql security definer set search_path='' as $$
declare v_state text; begin
 if new.revoked_at is not null then v_state:='cancelled'; elsif new.accepted_at is not null then v_state:='accepted'; elsif new.expires_at<=now() then v_state:='expired'; else v_state:='pending'; end if;
 update public.notifications n set action_state=v_state,resolved_at=case when v_state='pending' then null else coalesce(n.resolved_at,now()) end where n.type='room_invite' and n.related_id=new.id and n.user_id=new.invitee_id;
 return new; end $$;
drop trigger if exists trg_sync_room_invite_notification_state on public.room_invites;
create trigger trg_sync_room_invite_notification_state after update of accepted_at,revoked_at,expires_at on public.room_invites for each row execute function public.zuno_sync_room_invite_notification_state();

create or replace function public.zuno_notify_game_challenge_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_actor text; v_type text; v_title text; v_target uuid; v_state text; begin
 if new.status is not distinct from old.status then return null; end if;
 select coalesce(nullif(btrim(p.username),''),'Jogador') into v_actor from public.profiles p where p.id=new.challenged_id;
 if new.status='accepted' then v_type:='game_challenge_accepted'; v_title:=v_actor||' aceitou seu desafio'; v_target:=new.challenger_id; v_state:='accepted';
 elsif new.status='rejected' then v_type:='game_challenge_rejected'; v_title:=v_actor||' recusou seu desafio'; v_target:=new.challenger_id; v_state:='rejected';
 elsif new.status='completed' then v_type:='game_challenge_completed'; v_title:='Desafio concluído'; v_target:=new.challenger_id; v_state:='completed'; else return null; end if;
 update public.notifications n set action_state=v_state,resolved_at=case when v_state in ('rejected','completed') then coalesce(n.resolved_at,now()) else n.resolved_at end where n.type='game_challenge' and n.related_id=new.id and n.user_id=new.challenged_id;
 perform private.zuno_emit_notification(v_target,v_type,v_title,null,new.challenged_id,new.id,'games','normal','jogos.html',v_type||':'||new.id::text,jsonb_build_object('challenge_id',new.id,'game_id',new.game_id,'status',new.status),null,false);
 return null; end $$;

revoke all on function public.zuno_notify_room_seat_request() from public,anon,authenticated;
revoke all on function public.zuno_notify_room_seat_status() from public,anon,authenticated;
revoke all on function public.zuno_notify_room_moderation() from public,anon,authenticated;
revoke all on function public.zuno_sync_room_invite_notification_state() from public,anon,authenticated;
revoke all on function public.zuno_notify_game_challenge_status() from public,anon,authenticated;
