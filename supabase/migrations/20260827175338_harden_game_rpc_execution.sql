revoke all on function public.submit_desafio_result(integer,integer,integer,integer) from public, anon;
grant execute on function public.submit_desafio_result(integer,integer,integer,integer) to authenticated;

revoke all on function public.submit_partida_zuno_result(uuid,text,integer,integer,integer,integer) from public, anon;
grant execute on function public.submit_partida_zuno_result(uuid,text,integer,integer,integer,integer) to authenticated;

revoke all on function public.submit_zuno_catalog_game_result(text,integer,integer) from public, anon;
grant execute on function public.submit_zuno_catalog_game_result(text,integer,integer) to authenticated;

revoke all on function public.send_game_challenge(uuid,text,integer,text) from public, anon;
grant execute on function public.send_game_challenge(uuid,text,integer,text) to authenticated;

revoke all on function public.respond_game_challenge(uuid,boolean) from public, anon;
grant execute on function public.respond_game_challenge(uuid,boolean) to authenticated;

revoke all on function public.complete_game_challenge(uuid,integer) from public, anon;
grant execute on function public.complete_game_challenge(uuid,integer) to authenticated;

revoke all on function public.get_game_leaderboard(integer) from public, anon;
grant execute on function public.get_game_leaderboard(integer) to authenticated;

revoke all on function public.get_friend_game_leaderboard(integer) from public, anon;
grant execute on function public.get_friend_game_leaderboard(integer) to authenticated;

revoke all on function public.zuno_are_friends(uuid,uuid) from public, anon;
grant execute on function public.zuno_are_friends(uuid,uuid) to authenticated;
