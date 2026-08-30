create or replace function public.zuno_group_add_member(p_conversation_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); v_role text; begin
 if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select cm.role into v_role from public.conversation_members cm join public.conversations c on c.id=cm.conversation_id where cm.conversation_id=p_conversation_id and cm.user_id=v_me and c.type='group';
 if v_role not in ('owner','admin') then raise exception 'group_admin_required' using errcode='42501'; end if;
 if p_user_id is null or p_user_id=v_me then return; end if;
 if not exists(select 1 from public.friendships f where (f.user_id=v_me and f.friend_id=p_user_id) or (f.user_id=p_user_id and f.friend_id=v_me)) then raise exception 'friendship_required' using errcode='42501'; end if;
 if exists(select 1 from public.user_blocks b where (b.blocker_id=v_me and b.blocked_id=p_user_id) or (b.blocker_id=p_user_id and b.blocked_id=v_me)) then raise exception 'messaging_blocked' using errcode='42501'; end if;
 if (select count(*) from public.conversation_members where conversation_id=p_conversation_id)>=100 then raise exception 'group_full' using errcode='22023'; end if;
 insert into public.conversation_members(conversation_id,user_id,role) values(p_conversation_id,p_user_id,'member') on conflict do nothing;
 insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
 values(p_conversation_id,v_me,null,'system',null,jsonb_build_object('event','member_added','user_id',p_user_id));
end $$;
revoke all on function public.zuno_group_add_member(uuid,uuid) from public,anon; grant execute on function public.zuno_group_add_member(uuid,uuid) to authenticated;

create or replace function public.zuno_group_remove_member(p_conversation_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); v_me_role text; v_target_role text; begin
 if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select role into v_me_role from public.conversation_members where conversation_id=p_conversation_id and user_id=v_me;
 select role into v_target_role from public.conversation_members where conversation_id=p_conversation_id and user_id=p_user_id;
 if p_user_id=v_me then
   if v_target_role='owner' then raise exception 'owner_cannot_leave_without_transfer' using errcode='42501'; end if;
 else
   if v_me_role not in ('owner','admin') then raise exception 'group_admin_required' using errcode='42501'; end if;
   if v_target_role='owner' then raise exception 'owner_cannot_be_removed' using errcode='42501'; end if;
   if v_me_role='admin' and v_target_role='admin' then raise exception 'owner_required_for_admin_removal' using errcode='42501'; end if;
 end if;
 delete from public.conversation_members where conversation_id=p_conversation_id and user_id=p_user_id;
 insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
 values(p_conversation_id,v_me,null,'system',null,jsonb_build_object('event','member_removed','user_id',p_user_id));
end $$;
revoke all on function public.zuno_group_remove_member(uuid,uuid) from public,anon; grant execute on function public.zuno_group_remove_member(uuid,uuid) to authenticated;

create or replace function public.zuno_group_set_role(p_conversation_id uuid,p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); v_me_role text; begin
 if p_role not in ('admin','member') then raise exception 'invalid_role' using errcode='22023'; end if;
 select role into v_me_role from public.conversation_members where conversation_id=p_conversation_id and user_id=v_me;
 if v_me_role<>'owner' then raise exception 'group_owner_required' using errcode='42501'; end if;
 if p_user_id=v_me then raise exception 'owner_role_is_fixed' using errcode='42501'; end if;
 update public.conversation_members set role=p_role where conversation_id=p_conversation_id and user_id=p_user_id;
end $$;
revoke all on function public.zuno_group_set_role(uuid,uuid,text) from public,anon; grant execute on function public.zuno_group_set_role(uuid,uuid,text) to authenticated;

create or replace function public.zuno_group_transfer_owner(p_conversation_id uuid,p_new_owner uuid)
returns void language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); begin
 if not exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=v_me and role='owner') then raise exception 'group_owner_required' using errcode='42501'; end if;
 if not exists(select 1 from public.conversation_members where conversation_id=p_conversation_id and user_id=p_new_owner) then raise exception 'new_owner_must_be_member' using errcode='22023'; end if;
 update public.conversation_members set role='member' where conversation_id=p_conversation_id and user_id=v_me;
 update public.conversation_members set role='owner' where conversation_id=p_conversation_id and user_id=p_new_owner;
end $$;
revoke all on function public.zuno_group_transfer_owner(uuid,uuid) from public,anon; grant execute on function public.zuno_group_transfer_owner(uuid,uuid) to authenticated;
