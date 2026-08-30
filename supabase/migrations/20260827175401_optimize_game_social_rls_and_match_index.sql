create index if not exists game_match_results_room_id_idx on public.game_match_results(room_id);

drop policy if exists game_challenges_select_participants on public.game_challenges;
create policy game_challenges_select_participants
on public.game_challenges
for select
to authenticated
using (challenger_id = (select auth.uid()) or challenged_id = (select auth.uid()));
