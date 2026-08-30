revoke all on public.user_blocks from anon;
revoke all on public.user_blocks from authenticated;
grant select,insert,delete on public.user_blocks to authenticated;
