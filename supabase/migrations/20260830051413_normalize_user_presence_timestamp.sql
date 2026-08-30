create or replace function public.zunoplay_normalize_user_presence_time()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if current_user='authenticated' then
    new.last_seen_at := pg_catalog.now();
  end if;
  return new;
end;
$$;
drop trigger if exists zunoplay_normalize_user_presence_time_trigger on public.user_presence;
create trigger zunoplay_normalize_user_presence_time_trigger before insert or update on public.user_presence for each row execute function public.zunoplay_normalize_user_presence_time();
