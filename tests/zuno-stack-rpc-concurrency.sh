#!/usr/bin/env bash
set -euo pipefail

DB=(psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -X -v ON_ERROR_STOP=1 -At)
export PGPASSWORD=postgres
ROOM='10000000-0000-0000-0000-000000000001'
USER_ID='00000000-0000-0000-0000-000000000001'

reset_common_fixture() {
  "${DB[@]}" <<SQL
begin;
delete from public.zuno_stack_game_events where room_id='$ROOM';
update public.zuno_stack_match_state
set revision=1,
    state=jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(state,'{engine,tray}','[]'::jsonb,false),
            '{engine,relay}','[null,null,null]'::jsonb,false
          ),
          '{engine,active}','true'::jsonb,false
        ),
        '{engine,serverUndo}','null'::jsonb,false
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
}

run_tile() {
  local expected="$1" action_id="$2" tile_id="$3" out="$4"
  "${DB[@]}" >"$out" 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$USER_ID',true);
select revision from public.zuno_stack_apply_tile('$ROOM',$expected,'$action_id','$tile_id');
commit;
SQL
}

run_undo() {
  local expected="$1" action_id="$2" out="$3"
  "${DB[@]}" >"$out" 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$USER_ID',true);
select revision from public.zuno_stack_apply_undo('$ROOM',$expected,'$action_id');
commit;
SQL
}

run_relay_send() {
  local expected="$1" action_id="$2" tray_index="$3" out="$4"
  "${DB[@]}" >"$out" 2>&1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$USER_ID',true);
select revision from public.zuno_stack_relay_send('$ROOM',$expected,'$action_id',$tray_index);
commit;
SQL
}

assert_one_success_one_revision_conflict() {
  local s1="$1" s2="$2" log1="$3" log2="$4" label="$5"
  cat "$log1"
  cat "$log2"
  if [[ "$s1" -eq 0 && "$s2" -eq 0 ]]; then
    echo "$label: both concurrent actions succeeded; expected one serialized revision conflict." >&2
    exit 1
  fi
  if [[ "$s1" -ne 0 && "$s2" -ne 0 ]]; then
    echo "$label: both concurrent actions failed; expected exactly one success." >&2
    exit 1
  fi
  if ! grep -q 'revision_conflict' "$log1" && ! grep -q 'revision_conflict' "$log2"; then
    echo "$label: losing concurrent action did not fail with revision_conflict." >&2
    exit 1
  fi
}

# Case 1: Tile x Tile at the same expected revision.
reset_common_fixture
set +e
run_tile 1 qa-concur-0001 t85 /tmp/stack-concur-a.log & p1=$!
run_tile 1 qa-concur-0002 t86 /tmp/stack-concur-b.log & p2=$!
wait "$p1"; s1=$?
wait "$p2"; s2=$?
set -e
assert_one_success_one_revision_conflict "$s1" "$s2" /tmp/stack-concur-a.log /tmp/stack-concur-b.log 'Tile x Tile'
read -r revision events removed < <("${DB[@]}" -F ' ' -c "select s.revision,(select count(*) from public.zuno_stack_game_events e where e.room_id=s.room_id and e.action_id in ('qa-concur-0001','qa-concur-0002')),(select count(*) from jsonb_array_elements(s.state->'engine'->'tiles') t where (t->>'removed')::boolean) from public.zuno_stack_match_state s where s.room_id='$ROOM';")
if [[ "$revision" != '2' || "$events" != '1' || "$removed" != '1' ]]; then
  echo "Tile x Tile: unexpected final state revision=$revision events=$events removed=$removed" >&2
  exit 1
fi
echo 'zuno_stack_rpc_two_session_concurrency_ok'

# Case 2: Tile x Undo. A real Tile first creates serverUndo at revision 2;
# then Tile and Undo race against that same revision. Both contracts lock the
# same match-state row before checking revision, so exactly one may commit.
reset_common_fixture
"${DB[@]}" <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$USER_ID',true);
select revision from public.zuno_stack_apply_tile('$ROOM',1,'qa-undo-seed1','t85');
commit;
SQL
set +e
run_tile 2 qa-tu-tile001 t86 /tmp/stack-tu-tile.log & p1=$!
run_undo 2 qa-tu-undo001 /tmp/stack-tu-undo.log & p2=$!
wait "$p1"; s1=$?
wait "$p2"; s2=$?
set -e
assert_one_success_one_revision_conflict "$s1" "$s2" /tmp/stack-tu-tile.log /tmp/stack-tu-undo.log 'Tile x Undo'
read -r revision race_events < <("${DB[@]}" -F ' ' -c "select s.revision,(select count(*) from public.zuno_stack_game_events e where e.room_id=s.room_id and e.action_id in ('qa-tu-tile001','qa-tu-undo001')) from public.zuno_stack_match_state s where s.room_id='$ROOM';")
if [[ "$revision" != '3' || "$race_events" != '1' ]]; then
  echo "Tile x Undo: unexpected final state revision=$revision race_events=$race_events" >&2
  exit 1
fi
echo 'zuno_stack_rpc_tile_undo_concurrency_ok'

# Case 3: Tile x Relay Send at the same expected revision. Relay needs a tray
# entry, so the fixture supplies one before the race. Both operations mutate the
# same authoritative match-state row and must serialize through revision.
reset_common_fixture
"${DB[@]}" -c "update public.zuno_stack_match_state set state=jsonb_set(state,'{engine,tray}','[\"qa-r\"]'::jsonb,false) where room_id='$ROOM';"
set +e
run_tile 1 qa-tr-tile001 t85 /tmp/stack-tr-tile.log & p1=$!
run_relay_send 1 qa-tr-relay01 0 /tmp/stack-tr-relay.log & p2=$!
wait "$p1"; s1=$?
wait "$p2"; s2=$?
set -e
assert_one_success_one_revision_conflict "$s1" "$s2" /tmp/stack-tr-tile.log /tmp/stack-tr-relay.log 'Tile x Relay'
read -r revision race_events < <("${DB[@]}" -F ' ' -c "select s.revision,(select count(*) from public.zuno_stack_game_events e where e.room_id=s.room_id and e.action_id in ('qa-tr-tile001','qa-tr-relay01')) from public.zuno_stack_match_state s where s.room_id='$ROOM';")
if [[ "$revision" != '2' || "$race_events" != '1' ]]; then
  echo "Tile x Relay: unexpected final state revision=$revision race_events=$race_events" >&2
  exit 1
fi
echo 'zuno_stack_rpc_tile_relay_concurrency_ok'
