create or replace function public.ensure_unique_profile_username()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.username is null or char_length(btrim(new.username)) not between 3 and 20 then
    raise exception 'invalid_username' using errcode = '23514';
  end if;

  if tg_op = 'INSERT'
     or lower(btrim(new.username)) is distinct from lower(btrim(old.username)) then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(btrim(new.username)), 0));

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(btrim(p.username)) = lower(btrim(new.username))
    ) then
      raise exception 'username_already_exists' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_username text;
  v_base text;
  v_suffix text;
begin
  v_username := btrim(coalesce(new.raw_user_meta_data->>'username', ''));

  if char_length(v_username) not between 3 and 20 then
    v_base := regexp_replace(split_part(coalesce(new.email,''), '@', 1), '[^a-zA-Z0-9_.-]+', '', 'g');
    if char_length(v_base) < 3 then
      v_base := 'zunoplayer';
    end if;
    v_username := left(v_base, 20);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(v_username), 0));

  if exists (
    select 1 from public.profiles p
    where lower(btrim(p.username)) = lower(v_username)
      and p.id <> new.id
  ) then
    v_suffix := left(replace(new.id::text, '-', ''), 6);
    v_username := left(v_username, 13) || '_' || v_suffix;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(v_username), 0));
  end if;

  insert into public.profiles (id, username, sex)
  values (
    new.id,
    v_username,
    case when new.raw_user_meta_data->>'sex' in ('masculino','feminino') then new.raw_user_meta_data->>'sex' else 'masculino' end
  )
  on conflict (id) do update
  set username = excluded.username,
      sex = excluded.sex;

  return new;
end;
$function$;
