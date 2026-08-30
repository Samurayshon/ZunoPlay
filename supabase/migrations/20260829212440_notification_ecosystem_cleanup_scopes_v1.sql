create or replace function public.zuno_clear_notifications(p_scope text default 'all', p_read_only boolean default false)
returns integer
language plpgsql
set search_path to ''
as $function$
declare v_user uuid:=auth.uid(); v_count integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_scope not in ('all','friend_request','message','social','rooms','games','rewards','system') then
    raise exception 'invalid_notification_scope' using errcode='22023';
  end if;
  delete from public.notifications n
   where n.user_id=v_user
     and (not p_read_only or n.read_at is not null)
     and (p_scope='all' or n.category=p_scope);
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;
revoke all on function public.zuno_clear_notifications(text,boolean) from public,anon;
grant execute on function public.zuno_clear_notifications(text,boolean) to authenticated;
