create or replace function public.normalize_profile_user_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.username := pg_catalog.btrim(new.username);
  if new.bio is not null then
    new.bio := nullif(pg_catalog.btrim(new.bio), '');
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profile_user_fields_trigger on public.profiles;
create trigger normalize_profile_user_fields_trigger
before insert or update of username, bio on public.profiles
for each row execute function public.normalize_profile_user_fields();
