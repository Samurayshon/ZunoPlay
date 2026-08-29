-- Etapa 19 / ZUN-11
-- Prevent authenticated users from creating multiple active rooms concurrently.

create unique index if not exists rooms_one_active_per_owner_idx
  on public.rooms (owner_id)
  where status = 'active';

create or replace function public.create_voice_room(
  p_name text,
  p_category text default 'bate_papo'::text,
  p_visibility text default 'public'::text,
  p_mic_access text default 'open'::text,
  p_description text default null::text
)
returns public.rooms
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_room public.rooms;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if char_length(btrim(coalesce(p_name,''))) < 3 or char_length(btrim(p_name)) > 60 then
    raise exception 'invalid_room_name';
  end if;
  if p_category not in ('bate_papo','musica','jogos','amigos','comunidade','evento','outro') then
    raise exception 'invalid_category';
  end if;
  if p_visibility not in ('public','friends','private') then
    raise exception 'invalid_visibility';
  end if;
  if p_mic_access not in ('open','request','invite_only') then
    raise exception 'invalid_mic_access';
  end if;

  if exists (
    select 1
    from public.rooms r
    where r.owner_id = auth.uid()
      and r.status = 'active'
  ) then
    raise exception 'active_room_exists' using errcode='P0001';
  end if;

  begin
    insert into public.rooms(
      owner_id,name,description,category,visibility,mic_access,status,is_discoverable,max_speakers
    )
    values(
      auth.uid(),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),
      p_category,p_visibility,p_mic_access,'active',p_visibility<>'private',8
    )
    returning * into v_room;
  exception
    when unique_violation then
      raise exception 'active_room_exists' using errcode='P0001';
  end;

  return v_room;
end;
$function$;

revoke execute on function public.create_voice_room(text,text,text,text,text) from public;
revoke execute on function public.create_voice_room(text,text,text,text,text) from anon;
grant execute on function public.create_voice_room(text,text,text,text,text) to authenticated;
