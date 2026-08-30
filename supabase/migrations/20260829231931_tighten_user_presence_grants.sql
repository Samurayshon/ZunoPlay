revoke all privileges on table public.user_presence from anon;
revoke delete, truncate, trigger, references on table public.user_presence from authenticated;
grant select, insert, update on table public.user_presence to authenticated;
