do $$ declare r record; begin for r in select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) args, pg_get_function_result(p.oid) result, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('zuno_create_group','zuno_get_or_create_direct_conversation','zuno_group_add_member','zuno_group_remove_member','zuno_group_set_role','zuno_group_transfer_owner') loop execute replace(replace(r.def, 'FUNCTION public.'||r.proname, 'FUNCTION zuno_private.'||r.proname), 'CREATE OR REPLACE FUNCTION', 'CREATE OR REPLACE FUNCTION'); end loop; end $$;

create or replace function public.zuno_create_group(p_title text, p_member_ids uuid[] default '{}'::uuid[]) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.zuno_create_group(p_title,p_member_ids) $$;
create or replace function public.zuno_get_or_create_direct_conversation(p_other_user uuid) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.zuno_get_or_create_direct_conversation(p_other_user) $$;
create or replace function public.zuno_group_add_member(p_conversation_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_add_member(p_conversation_id,p_user_id) $$;
create or replace function public.zuno_group_remove_member(p_conversation_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_remove_member(p_conversation_id,p_user_id) $$;
create or replace function public.zuno_group_set_role(p_conversation_id uuid,p_user_id uuid,p_role text) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_set_role(p_conversation_id,p_user_id,p_role) $$;
create or replace function public.zuno_group_transfer_owner(p_conversation_id uuid,p_new_owner uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_transfer_owner(p_conversation_id,p_new_owner) $$;

revoke all on function public.zuno_create_group(text,uuid[]) from public,anon;
revoke all on function public.zuno_get_or_create_direct_conversation(uuid) from public,anon;
revoke all on function public.zuno_group_add_member(uuid,uuid) from public,anon;
revoke all on function public.zuno_group_remove_member(uuid,uuid) from public,anon;
revoke all on function public.zuno_group_set_role(uuid,uuid,text) from public,anon;
revoke all on function public.zuno_group_transfer_owner(uuid,uuid) from public,anon;
grant execute on function public.zuno_create_group(text,uuid[]) to authenticated,service_role;
grant execute on function public.zuno_get_or_create_direct_conversation(uuid) to authenticated,service_role;
grant execute on function public.zuno_group_add_member(uuid,uuid) to authenticated,service_role;
grant execute on function public.zuno_group_remove_member(uuid,uuid) to authenticated,service_role;
grant execute on function public.zuno_group_set_role(uuid,uuid,text) to authenticated,service_role;
grant execute on function public.zuno_group_transfer_owner(uuid,uuid) to authenticated,service_role;

grant usage on schema zuno_private to authenticated,service_role;
revoke all on function zuno_private.zuno_create_group(text,uuid[]) from public,anon;
revoke all on function zuno_private.zuno_get_or_create_direct_conversation(uuid) from public,anon;
revoke all on function zuno_private.zuno_group_add_member(uuid,uuid) from public,anon;
revoke all on function zuno_private.zuno_group_remove_member(uuid,uuid) from public,anon;
revoke all on function zuno_private.zuno_group_set_role(uuid,uuid,text) from public,anon;
revoke all on function zuno_private.zuno_group_transfer_owner(uuid,uuid) from public,anon;
grant execute on function zuno_private.zuno_create_group(text,uuid[]) to authenticated,service_role;
grant execute on function zuno_private.zuno_get_or_create_direct_conversation(uuid) to authenticated,service_role;
grant execute on function zuno_private.zuno_group_add_member(uuid,uuid) to authenticated,service_role;
grant execute on function zuno_private.zuno_group_remove_member(uuid,uuid) to authenticated,service_role;
grant execute on function zuno_private.zuno_group_set_role(uuid,uuid,text) to authenticated,service_role;
grant execute on function zuno_private.zuno_group_transfer_owner(uuid,uuid) to authenticated,service_role;
