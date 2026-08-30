create schema if not exists zuno_private;
revoke all on schema zuno_private from public;

create or replace function zuno_private.get_public_global_xp_level(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.level from public.user_xp_progression u where u.user_id = p_user_id), 1);
$$;

revoke all on function zuno_private.get_public_global_xp_level(uuid) from public;
grant usage on schema zuno_private to authenticated;
grant execute on function zuno_private.get_public_global_xp_level(uuid) to authenticated;

create or replace function public.zuno_public_global_xp_level(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select zuno_private.get_public_global_xp_level(p_user_id);
$$;

revoke all on function public.zuno_public_global_xp_level(uuid) from public;
grant execute on function public.zuno_public_global_xp_level(uuid) to authenticated;
