-- Public messaging/group RPCs remain compatibility endpoints, but privileged
-- implementations live in the unexposed zuno_private schema.
-- Applied to production through Supabase MCP before this repository record.

do $$ declare r record; begin
  for r in
    select p.oid, p.proname, pg_get_functiondef(p.oid) def
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'zuno_create_group','zuno_get_or_create_direct_conversation',
      'zuno_group_add_member','zuno_group_remove_member',
      'zuno_group_set_role','zuno_group_transfer_owner')
  loop
    execute replace(r.def, 'FUNCTION public.'||r.proname, 'FUNCTION zuno_private.'||r.proname);
  end loop;
end $$;

create or replace function public.zuno_create_group(p_title text,p_member_ids uuid[] default '{}'::uuid[]) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.zuno_create_group(p_title,p_member_ids) $$;
create or replace function public.zuno_get_or_create_direct_conversation(p_other_user uuid) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.zuno_get_or_create_direct_conversation(p_other_user) $$;
create or replace function public.zuno_group_add_member(p_conversation_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_add_member(p_conversation_id,p_user_id) $$;
create or replace function public.zuno_group_remove_member(p_conversation_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_remove_member(p_conversation_id,p_user_id) $$;
create or replace function public.zuno_group_set_role(p_conversation_id uuid,p_user_id uuid,p_role text) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_set_role(p_conversation_id,p_user_id,p_role) $$;
create or replace function public.zuno_group_transfer_owner(p_conversation_id uuid,p_new_owner uuid) returns void language sql security invoker set search_path='' as $$ select zuno_private.zuno_group_transfer_owner(p_conversation_id,p_new_owner) $$;

grant usage on schema zuno_private to authenticated,service_role;

do $$ declare f regprocedure; begin
  foreach f in array array[
    'public.zuno_create_group(text,uuid[])'::regprocedure,'public.zuno_get_or_create_direct_conversation(uuid)'::regprocedure,
    'public.zuno_group_add_member(uuid,uuid)'::regprocedure,'public.zuno_group_remove_member(uuid,uuid)'::regprocedure,
    'public.zuno_group_set_role(uuid,uuid,text)'::regprocedure,'public.zuno_group_transfer_owner(uuid,uuid)'::regprocedure,
    'zuno_private.zuno_create_group(text,uuid[])'::regprocedure,'zuno_private.zuno_get_or_create_direct_conversation(uuid)'::regprocedure,
    'zuno_private.zuno_group_add_member(uuid,uuid)'::regprocedure,'zuno_private.zuno_group_remove_member(uuid,uuid)'::regprocedure,
    'zuno_private.zuno_group_set_role(uuid,uuid,text)'::regprocedure,'zuno_private.zuno_group_transfer_owner(uuid,uuid)'::regprocedure]
  loop execute format('revoke all on function %s from public, anon',f); execute format('grant execute on function %s to authenticated, service_role',f); end loop;
end $$;