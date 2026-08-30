alter table public.profiles add column if not exists sex text;
update public.profiles set sex='masculino' where sex is null or sex not in ('masculino','feminino');
alter table public.profiles alter column sex set default 'masculino';
alter table public.profiles alter column sex set not null;
alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles add constraint profiles_sex_check check (sex in ('masculino','feminino'));
grant select (sex), update (sex) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_base text;
  v_suffix text;
  v_sex text;
begin
  v_username := btrim(coalesce(new.raw_user_meta_data->>'username', ''));

  if char_length(v_username) not between 3 and 20 then
    v_base := regexp_replace(split_part(coalesce(new.email,''), '@', 1), '[^a-zA-Z0-9_.-]+', '', 'g');
    if char_length(v_base) < 3 then
      v_base := 'zunoplayer';
    end if;
    v_username := left(v_base, 20);
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(btrim(p.username)) = lower(v_username)
      and p.id <> new.id
  ) then
    v_suffix := left(replace(new.id::text, '-', ''), 6);
    v_username := left(v_username, 13) || '_' || v_suffix;
  end if;

  v_sex := lower(btrim(coalesce(new.raw_user_meta_data->>'sex', '')));
  if v_sex not in ('masculino','feminino') then
    v_sex := 'masculino';
  end if;

  insert into public.profiles (id, username, sex)
  values (new.id, v_username, v_sex)
  on conflict (id) do update
  set username = excluded.username,
      sex = excluded.sex;

  return new;
end;
$$;
