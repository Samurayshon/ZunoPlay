create or replace function public.apply_desafio_progress()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_level integer;
  v_current integer;
begin
  -- This trigger protects the legacy Desafio Zuno progression path only.
  -- Other games (for example Zuno Stack) are written through dedicated,
  -- security-definer RPCs and must not be rejected by Desafio invariants.
  if new.game !~ '^Desafio Zuno · Nível ([1-9]|10)$' then
    return new;
  end if;

  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_game_owner' using errcode = '42501';
  end if;

  if new.questions <> 10
     or new.correct_answers < 0
     or new.correct_answers > 10
     or new.score <> new.correct_answers * 100 then
    raise exception 'invalid_game_result' using errcode = '22023';
  end if;

  v_level := substring(new.game from 'Nível ([0-9]+)$')::integer;

  select greatest(1, least(10, coalesce(level,1)))
    into v_current
  from public.profiles
  where id = new.user_id
  for update;

  if v_current is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_level > v_current then
    raise exception 'level_locked' using errcode = '42501';
  end if;

  if new.correct_answers >= 8 and v_level = v_current and v_current < 10 then
    update public.profiles
    set level = v_current + 1
    where id = new.user_id;
  end if;

  return new;
end;
$function$;
