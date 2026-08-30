create unique index if not exists conversation_members_one_owner_per_conversation_idx on public.conversation_members (conversation_id) where role='owner';

create or replace function zuno_private.zuno_group_transfer_owner(p_conversation_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  perform 1 from public.conversations where id=p_conversation_id and type='group' for update;
  if not found then
    raise exception 'group_required' using errcode='22023';
  end if;

  if not exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=v_me and role='owner') then
    raise exception 'group_owner_required' using errcode='42501';
  end if;
  if p_new_owner=v_me then
    return;
  end if;
  if not exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=p_new_owner) then
    raise exception 'new_owner_must_be_member' using errcode='22023';
  end if;

  update public.conversation_members set role='member' where conversation_id=p_conversation_id and user_id=v_me;
  update public.conversation_members set role='owner' where conversation_id=p_conversation_id and user_id=p_new_owner;
end
$function$;
