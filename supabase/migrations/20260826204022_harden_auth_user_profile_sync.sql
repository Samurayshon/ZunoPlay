create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_username text := btrim(coalesce(old.raw_user_meta_data->>'username', ''));
  v_new_username text := btrim(coalesce(new.raw_user_meta_data->>'username', ''));
begin
  if v_new_username is distinct from v_old_username
     and char_length(v_new_username) between 3 and 20
     and not exists (
       select 1
       from public.profiles p
       where p.id <> new.id
         and lower(btrim(p.username)) = lower(v_new_username)
     ) then
    update public.profiles
    set username = v_new_username
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_user_update() from public, anon, authenticated;
