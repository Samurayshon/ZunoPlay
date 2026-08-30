create or replace function public.is_zuno_id_available(p_zuno_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_zuno_id ~ '^[a-z0-9_]{1,12}$'
    and not exists (
      select 1 from public.profiles where lower(zuno_id)=p_zuno_id
    );
$$;

create or replace function public.complete_zuno_identity(
  p_zuno_id text,
  p_sex text,
  p_nickname text,
  p_interests jsonb default '[]'::jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_interests jsonb := coalesce(p_interests,'[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode='42501';
  end if;
  if p_zuno_id !~ '^[a-z0-9_]{1,12}$' then
    raise exception 'invalid_zuno_id' using errcode='22023';
  end if;
  if p_sex not in ('masculino','feminino') then
    raise exception 'invalid_sex' using errcode='22023';
  end if;
  if p_nickname is null or char_length(p_nickname) not between 1 and 12 then
    raise exception 'invalid_nickname' using errcode='22023';
  end if;
  if jsonb_typeof(v_interests) <> 'array' then
    raise exception 'invalid_interests' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_interests) as e(value)
    where jsonb_typeof(e.value) <> 'string'
  ) then
    raise exception 'invalid_interests' using errcode='22023';
  end if;
  if exists (
    select 1 from public.profiles
    where lower(zuno_id)=p_zuno_id and id<>v_uid
  ) then
    raise exception 'zuno_id_taken';
  end if;
  update public.profiles
  set zuno_id=p_zuno_id,
      sex=p_sex,
      nickname=p_nickname,
      username=p_nickname,
      interests=v_interests,
      identity_locked=true,
      onboarding_step=2,
      onboarding_completed_at=now()
  where id=v_uid
  returning * into v_profile;
  if v_profile.id is null then
    raise exception 'profile_not_found';
  end if;
  return v_profile;
end;
$$;

revoke all on function public.is_zuno_id_available(text) from public, anon;
grant execute on function public.is_zuno_id_available(text) to authenticated;
revoke all on function public.complete_zuno_identity(text,text,text,jsonb) from public, anon;
grant execute on function public.complete_zuno_identity(text,text,text,jsonb) to authenticated;
