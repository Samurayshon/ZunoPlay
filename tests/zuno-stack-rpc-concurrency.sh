#!/usr/bin/env bash
set -euo pipefail

DB=(psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -X -v ON_ERROR_STOP=1 -At)
export PGPASSWORD=postgres
ROOM='10000000-0000-0000-0000-000000000001'
USER_ID='00000000-0000-0000-0000-000000000001'

# The behavioral characterization intentionally mutates the shared disposable fixture.
# Rebase only test state needed by this concurrency case so it is independent of test order.
"${DB[@]}" <<SQL
begin;
delete from public.zuno_stack_game_events
 where room_id='$ROOM'
   and action_id in ('qa-concur-0001','qa-concur-0002');
update public.zuno_stack_match_state
set revision=1,
    state=jsonb_set(
      jsonb_set(
        jsonb_set(state,'{engine,tray}','[]'::jsonb,false),
        '{engine,active}','true'::jsonb,false
      ),
      '{engine,tiles}',
      (
        select jsonb_agg(
          case when tile->>'id' in ('t85','t86')
               then jsonb_set(tile,'{removed}','false'::jsonb,false)
               else tile end
          order by ord
        )
        from jsonb_array_elements(state->'engine'->'tiles') with ordinality e(tile,ord)
      ),
      false
    )
where room_id='$ROOM';
commit;
SQL

run_action() {
  local action_id="$1" tile_id="$2" out="$3"
  "${DB[@]}" >"$out" 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$USER_ID',true);
select revision from public.zuno_stack_apply_tile('$ROOM',1,'$action_id','$tile_id');
commit;
SQL
}

set +e
run_action qa-concur-0001 t85 /tmp/stack-concur-a.log & p1=$!
run_action qa-concur-0002 t86 /tmp/stack-concur-b.log & p2=$!
wait "$p1"; s1=$?
wait "$p2"; s2=$?
set -e

cat /tmp/stack-concur-a.log
cat /tmp/stack-concur-b.log

if [[ "$s1" -eq 0 && "$s2" -eq 0 ]]; then
  echo 'Both concurrent actions succeeded; expected one serialized revision conflict.' >&2
  exit 1
fi
if [[ "$s1" -ne 0 && "$s2" -ne 0 ]]; then
  echo 'Both concurrent actions failed; expected exactly one success.' >&2
  exit 1
fi
if ! grep -q 'revision_conflict' /tmp/stack-concur-a.log && ! grep -q 'revision_conflict' /tmp/stack-concur-b.log; then
  echo 'Losing concurrent action did not fail with revision_conflict.' >&2
  exit 1
fi

read -r revision events removed < <("${DB[@]}" -F ' ' -c "select s.revision,(select count(*) from public.zuno_stack_game_events e where e.room_id=s.room_id and e.action_id in ('qa-concur-0001','qa-concur-0002')),(select count(*) from jsonb_array_elements(s.state->'engine'->'tiles') t where (t->>'removed')::boolean) from public.zuno_stack_match_state s where s.room_id='$ROOM';")

if [[ "$revision" != '2' || "$events" != '1' || "$removed" != '1' ]]; then
  echo "Unexpected concurrent final state: revision=$revision events=$events removed=$removed" >&2
  exit 1
fi

echo 'zuno_stack_rpc_two_session_concurrency_ok'
