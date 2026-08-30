revoke execute on function public.complete_zuno_identity(text,text,text,jsonb) from public, anon;
grant execute on function public.complete_zuno_identity(text,text,text,jsonb) to authenticated;

revoke execute on function public.protect_zuno_permanent_identity() from public, anon, authenticated;

create index if not exists notification_events_notification_id_idx on public.notification_events(notification_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);
