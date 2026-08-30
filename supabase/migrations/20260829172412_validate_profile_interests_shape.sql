alter table public.profiles
  add constraint profiles_interests_array_check
  check (jsonb_typeof(interests) = 'array')
  not valid;

alter table public.profiles
  validate constraint profiles_interests_array_check;

create or replace function public.complete_zuno_identity(
  p_zuno_id text,
  p_sex text,
  p_nickname text,
  p_interests jsonb default '[]'::jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_interests jsonb := coalesce(p_interests,'[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode='42501';
  end if;
  if p_zuno_id !~ '^[A-Za-z0-9_]{1,12}$' then
    raise exception 'invalid_zuno_id' using errcode='22023';
  end if;
  if p_sex not in ('masculino','feminino') then
    raise exception 'invalid_sex' using errcode='22023';
  end if;
  if char_length(btrim(p_nickname)) not between 1 and 12 then
    raise exception 'invalid_nickname' using errcode='22023';
  end if;

  if jsonb_typeof(v_interests) <> 'array' then
    raise exception 'invalid_interests' using errcode='22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_interests) as e(value)
    where jsonb_typeof(e.value) <> 'string'
  ) then
    raise exception 'invalid_interests' using errcode='22023';
  end if;

  if exists(
    select 1 from public.profiles
    where lower(zuno_id)=lower(p_zuno_id) and id<>v_uid
  ) then
    raise exception 'zuno_id_taken';
  end if;

  update public.profiles
  set zuno_id=p_zuno_id,
      sex=p_sex,
      nickname=btrim(p_nickname),
      username=btrim(p_nickname),
      interests=v_interests,
      identity_locked=true,
      onboarding_step=6,
      onboarding_completed_at=now()
  where id=v_uid
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;

  return v_profile;
end;
$function$;

revoke execute on function public.complete_zuno_identity(text,text,text,jsonb) from public, anon;
grant execute on function public.complete_zuno_identity(text,text,text,jsonb) to authenticated;
