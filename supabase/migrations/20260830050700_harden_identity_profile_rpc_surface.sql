create schema if not exists zuno_private;

alter function public.complete_zuno_identity(text,text,text,jsonb) set schema zuno_private;
alter function public.is_zuno_id_available(text) set schema zuno_private;
alter function public.update_zuno_profile(text,text) set schema zuno_private;

alter function zuno_private.complete_zuno_identity(text,text,text,jsonb) set search_path='';
alter function zuno_private.is_zuno_id_available(text) set search_path='';
alter function zuno_private.update_zuno_profile(text,text) set search_path='';

create function public.complete_zuno_identity(p_zuno_id text,p_sex text,p_nickname text,p_interests jsonb default '[]'::jsonb)
returns public.profiles language sql security invoker set search_path='' as $$ select zuno_private.complete_zuno_identity(p_zuno_id,p_sex,p_nickname,p_interests) $$;
create function public.is_zuno_id_available(p_zuno_id text)
returns boolean language sql stable security invoker set search_path='' as $$ select zuno_private.is_zuno_id_available(p_zuno_id) $$;
create function public.update_zuno_profile(p_nickname text,p_bio text default null)
returns void language sql security invoker set search_path='' as $$ select zuno_private.update_zuno_profile(p_nickname,p_bio) $$;

revoke all on function public.complete_zuno_identity(text,text,text,jsonb),public.is_zuno_id_available(text),public.update_zuno_profile(text,text) from public,anon;
grant execute on function public.complete_zuno_identity(text,text,text,jsonb),public.is_zuno_id_available(text),public.update_zuno_profile(text,text) to authenticated,service_role;
revoke all on function zuno_private.complete_zuno_identity(text,text,text,jsonb),zuno_private.is_zuno_id_available(text),zuno_private.update_zuno_profile(text,text) from public,anon;
grant usage on schema zuno_private to authenticated,service_role;
grant execute on function zuno_private.complete_zuno_identity(text,text,text,jsonb),zuno_private.is_zuno_id_available(text),zuno_private.update_zuno_profile(text,text) to authenticated,service_role;
