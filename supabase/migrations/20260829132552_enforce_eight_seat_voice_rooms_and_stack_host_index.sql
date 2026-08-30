update public.rooms set max_speakers = 8 where max_speakers is distinct from 8;
alter table public.rooms alter column max_speakers set default 8;
alter table public.rooms drop constraint if exists rooms_max_speakers_check;
alter table public.rooms add constraint rooms_max_speakers_check check (max_speakers = 8);
create index if not exists zuno_stack_match_state_host_id_idx on public.zuno_stack_match_state(host_id);

create or replace function public.create_voice_room(p_name text, p_category text default 'bate_papo'::text, p_visibility text default 'public'::text, p_mic_access text default 'open'::text, p_description text default null::text)
returns rooms
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_room public.rooms;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 3 or char_length(btrim(p_name)) > 60 then raise exception 'invalid_room_name'; end if;
  if p_category not in ('bate_papo','musica','jogos','amigos','comunidade','evento','outro') then raise exception 'invalid_category'; end if;
  if p_visibility not in ('public','friends','private') then raise exception 'invalid_visibility'; end if;
  if p_mic_access not in ('open','request','invite_only') then raise exception 'invalid_mic_access'; end if;
  insert into public.rooms(owner_id,name,description,category,visibility,mic_access,status,is_discoverable,max_speakers)
  values(auth.uid(),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_category,p_visibility,p_mic_access,'active',p_visibility<>'private',8)
  returning * into v_room;
  return v_room;
end;
$function$;
