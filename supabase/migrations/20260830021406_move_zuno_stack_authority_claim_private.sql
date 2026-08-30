create or replace function zuno_private.claim_zuno_stack_authority_internal(p_user_id uuid,p_room_id uuid)
returns table(applied boolean,transaction_id uuid,authority bigint,aura_tier smallint,aura_name text,next_tier smallint,next_aura_name text,next_threshold bigint,awarded_amount bigint)
language plpgsql security definer set search_path=''
as $$
declare v_row public.zuno_stack_match_state%rowtype; v_engine jsonb; v_kind text; v_started_ms bigint; v_duration integer; v_removed integer; v_matches integer; v_score integer; v_won boolean; v_base bigint; v_result record; v_match_id text;
begin
 if p_user_id is null or p_room_id is null then raise exception 'invalid_stack_authority_claim' using errcode='22023'; end if;
 if not (exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id) or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=p_user_id)) then raise exception 'stack_room_membership_required' using errcode='42501'; end if;
 select * into v_row from public.zuno_stack_match_state s where s.room_id=p_room_id; if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
 v_engine:=v_row.state->'engine'; v_kind:=coalesce(v_row.state->>'kind','');
 if jsonb_typeof(v_engine)<>'object' or coalesce((v_engine->>'active')::boolean,true) then raise exception 'stack_match_not_finished' using errcode='22023'; end if;
 if v_kind not in ('win','finish','timeout') then raise exception 'stack_result_not_server_confirmed' using errcode='22023'; end if;
 if jsonb_typeof(v_engine->'tiles')<>'array' or jsonb_array_length(v_engine->'tiles')<>90 then raise exception 'invalid_stack_round_shape' using errcode='22023'; end if;
 v_started_ms:=coalesce((v_engine->>'startedAt')::bigint,0); if v_started_ms<=0 then raise exception 'invalid_stack_started_at' using errcode='22023'; end if;
 v_duration:=greatest(0,floor(extract(epoch from (v_row.updated_at-to_timestamp(v_started_ms/1000.0))))::integer);
 select count(*)::integer into v_removed from jsonb_array_elements(v_engine->'tiles') t(tile) where coalesce((t.tile->>'removed')::boolean,false);
 v_matches:=coalesce((v_engine->>'matches')::integer,0); v_score:=coalesce((v_engine->>'score')::integer,0); v_won:=(v_kind='win' and v_removed=90);
 if v_removed<3 or v_matches<1 or v_matches*3>v_removed then raise exception 'insufficient_stack_participation' using errcode='22023'; end if;
 v_base:=5+least(5,v_matches/5)+case when v_won then 5 else 0 end; v_match_id:=p_room_id::text||':'||v_started_ms::text;
 select * into v_result from public.award_game_authority(p_user_id,'zuno_stack',v_match_id,v_base,case when v_won then 'zuno_stack_win' else 'zuno_stack_complete' end,v_duration,true,false,false,null,jsonb_build_object('room_id',p_room_id,'server_revision',v_row.revision,'server_kind',v_kind,'score',v_score,'matches',v_matches,'tiles_cleared',v_removed,'won',v_won));
 return query select v_result.applied,v_result.transaction_id,v_result.authority,v_result.aura_tier,v_result.aura_name,v_result.next_tier,v_result.next_aura_name,v_result.next_threshold,v_result.awarded_amount;
end;$$;
revoke all on function zuno_private.claim_zuno_stack_authority_internal(uuid,uuid) from public,anon,authenticated;
grant execute on function zuno_private.claim_zuno_stack_authority_internal(uuid,uuid) to service_role;
drop function public.claim_zuno_stack_authority(uuid);

