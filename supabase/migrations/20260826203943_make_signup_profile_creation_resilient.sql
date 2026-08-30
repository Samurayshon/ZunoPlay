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

  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do update
  set username = excluded.username;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
