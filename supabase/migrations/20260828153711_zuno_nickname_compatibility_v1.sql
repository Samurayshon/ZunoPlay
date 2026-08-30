create or replace function public.ensure_unique_profile_username()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.username is null or char_length(btrim(new.username)) not between 1 and 20 then
    raise exception 'invalid_username' using errcode='23514';
  end if;
  if tg_op='INSERT' or lower(btrim(new.username)) is distinct from lower(btrim(old.username)) then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(btrim(new.username)),0));
    if exists(select 1 from public.profiles p where p.id<>new.id and lower(btrim(p.username))=lower(btrim(new.username))) then
      raise exception 'username_already_exists' using errcode='23505';
    end if;
  end if;
  return new;
end;$$;
