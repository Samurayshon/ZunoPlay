-- ZunoPlay QA/Security containment: complete_game_challenge currently trusts a
-- client-provided score and has no server-authoritative match/result proof.
-- Keep challenge creation/response data intact, but prevent browser/app clients
-- from marking challenges completed until completion is bound to verified game data.

revoke execute on function public.complete_game_challenge(uuid, integer) from public;
revoke execute on function public.complete_game_challenge(uuid, integer) from anon;
revoke execute on function public.complete_game_challenge(uuid, integer) from authenticated;
