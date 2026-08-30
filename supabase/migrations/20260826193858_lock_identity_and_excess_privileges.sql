-- Prevent new case-insensitive username collisions without breaking existing test duplicates
-- when they save unrelated profile fields.
create or replace function public.ensure_unique_profile_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is null or btrim(new.username) = '' then
    raise exception 'username_required' using errcode = '23514';
  end if;

  if tg_op = 'INSERT'
     or lower(btrim(new.username)) is distinct from lower(btrim(old.username)) then
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
$$;

revoke all on function public.ensure_unique_profile_username() from public, anon, authenticated;

drop trigger if exists ensure_unique_profile_username_trigger on public.profiles;
create trigger ensure_unique_profile_username_trigger
before insert or update of username on public.profiles
for each row execute function public.ensure_unique_profile_username();

-- Browser roles never need these SQL-level capabilities.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
