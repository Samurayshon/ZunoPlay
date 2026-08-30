-- A listener must be able to answer a speaker's WebRTC offer to receive audio,
-- but the answer itself must not negotiate an outbound audio direction unless
-- the listener is also an authorized seated speaker.

create or replace function private.zuno_voice_broadcast_allowed(
  p_topic text,
  p_event text,
  p_payload jsonb,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_room_id uuid;
  v_kind text;
  v_state text;
  v_sdp text;
  v_can_publish boolean;
begin
  if p_user_id is null or p_topic is null or p_event is null then
    return false;
  end if;

  if p_topic !~ '^room:[0-9a-fA-F-]{36}:voice$' then
    return false;
  end if;

  begin
    v_room_id := split_part(p_topic,':',2)::uuid;
  exception when others then
    return false;
  end;

  if not exists (
    select 1
      from public.room_members rm
      join public.rooms r on r.id=rm.room_id
     where rm.room_id=v_room_id
       and rm.user_id=p_user_id
       and r.status='active'
  ) then
    return false;
  end if;

  v_can_publish := private.zuno_room_member_can_publish_voice(v_room_id,p_user_id);

  if p_event='signal' then
    if coalesce(p_payload->>'from','')<>p_user_id::text
       or coalesce(p_payload->>'room_id','')<>v_room_id::text then
      return false;
    end if;

    v_kind := coalesce(p_payload->>'kind','');

    if v_kind='offer' then
      return v_can_publish;
    end if;

    if v_kind='answer' then
      if v_can_publish then
        return true;
      end if;
      v_sdp := coalesce(p_payload#>>'{data,sdp}','');
      return v_sdp ~ E'(^|\\r?\\n)a=(recvonly|inactive)(\\r?\\n|$)'
         and v_sdp !~ E'(^|\\r?\\n)a=(sendrecv|sendonly)(\\r?\\n|$)';
    end if;

    return v_kind in ('ice','restart-request','bye');
  end if;

  if p_event='voice-state' then
    if coalesce(p_payload->>'user_id','')<>p_user_id::text
       or coalesce(p_payload->>'room_id','')<>v_room_id::text then
      return false;
    end if;
    v_state := coalesce(p_payload->>'state','online');
    if v_state='speaking' then
      return v_can_publish;
    end if;
    return v_state in ('online','listening');
  end if;

  return true;
end;
$function$;

revoke all on function private.zuno_voice_broadcast_allowed(text,text,jsonb,uuid) from public, anon, authenticated;

delete from public.room_members rm
using public.rooms r
where rm.room_id=r.id
  and r.status='ended';

update public.room_invites ri
   set revoked_at=coalesce(ri.revoked_at,pg_catalog.now())
  from public.rooms r
 where ri.room_id=r.id
   and r.status='ended'
   and ri.accepted_at is null
   and ri.revoked_at is null;
