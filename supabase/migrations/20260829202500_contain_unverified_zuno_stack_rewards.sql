-- ZunoPlay production QA containment: Zuno Stack result rewards are currently
-- based on client-provided score/matches/tiles and therefore are not a trusted
-- server-authoritative proof of a completed match.
--
-- Keep the game playable, but disable the privileged reward RPC for browser/app
-- clients until a server-verifiable run/session protocol is implemented.

revoke execute on function public.submit_zuno_stack_result(integer, integer, integer, boolean) from public;
revoke execute on function public.submit_zuno_stack_result(integer, integer, integer, boolean) from anon;
revoke execute on function public.submit_zuno_stack_result(integer, integer, integer, boolean) from authenticated;
