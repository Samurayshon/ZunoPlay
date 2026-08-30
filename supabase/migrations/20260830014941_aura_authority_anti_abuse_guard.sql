create table if not exists public.authority_game_rules (
  game_id text primary key,
  enabled boolean not null default false,
  min_participation_seconds integer not null check (min_participation_seconds >= 0),
  max_base_authority bigint not null check (max_base_authority > 0),
  repeat_window_minutes integer not null default 1440 check (repeat_window_minutes > 0),
  repeat_multipliers numeric[] not null default array[1.00,1.00,0.75,0.50,0.25,0.10,0.00]::numeric[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_game_rules_game_id_nonblank check (btrim(game_id) <> ''),
  constraint authority_game_rules_repeat_multipliers_nonempty check (cardinality(repeat_multipliers) > 0)
);

create table if not exists public.authority_match_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.authority_game_rules(game_id) on delete restrict,
  match_id text not null,
  opponent_id uuid references auth.users(id) on delete set null,
  completed boolean not null,
  abandoned boolean not null default false,
  afk boolean not null default false,
  participation_seconds integer not null check (participation_seconds >= 0),
  base_amount bigint not null check (base_amount > 0),
  repeat_count integer not null check (repeat_count >= 0),
  multiplier numeric not null check (multiplier >= 0 and multiplier <= 1),
  awarded_amount bigint not null check (awarded_amount >= 0),
  authority_transaction_id uuid references public.authority_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint authority_match_claims_match_nonblank check (btrim(match_id) <> ''),
  constraint authority_match_claims_not_self_opponent check (opponent_id is null or opponent_id <> user_id),
  constraint authority_match_claims_unique_match unique (user_id, game_id, match_id)
);

create index if not exists authority_match_claims_opponent_window_idx
  on public.authority_match_claims(user_id, game_id, opponent_id, created_at desc)
  where opponent_id is not null;

alter table public.authority_game_rules enable row level security;
alter table public.authority_match_claims enable row level security;
revoke all privileges on table public.authority_game_rules from anon, authenticated;
revoke all privileges on table public.authority_match_claims from anon, authenticated;

revoke execute on function public.award_authority(uuid,bigint,text,text,text,text,text,text,jsonb) from service_role;

create or replace function public.award_game_authority(
  p_user_id uuid,
  p_game_id text,
  p_match_id text,
  p_base_amount bigint,
  p_reason text,
  p_participation_seconds integer,
  p_completed boolean,
  p_abandoned boolean default false,
  p_afk boolean default false,
  p_opponent_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  applied boolean,
  transaction_id uuid,
  authority bigint,
  aura_tier smallint,
  aura_name text,
  next_tier smallint,
  next_aura_name text,
  next_threshold bigint,
  awarded_amount bigint,
  anti_farm_multiplier numeric,
  repeat_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.authority_game_rules%rowtype;
  v_repeat_count integer := 0;
  v_multiplier numeric := 1;
  v_awarded bigint := 0;
  v_claim_id uuid;
  v_result record;
  v_idempotency text;
begin
  if p_user_id is null then raise exception 'user_id_required' using errcode='22004'; end if;
  if p_game_id is null or btrim(p_game_id)='' then raise exception 'game_id_required' using errcode='22023'; end if;
  if p_match_id is null or btrim(p_match_id)='' then raise exception 'match_id_required' using errcode='22023'; end if;
  if p_base_amount is null or p_base_amount <= 0 then raise exception 'base_authority_must_be_positive' using errcode='22023'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'reason_required' using errcode='22023'; end if;
  if p_participation_seconds is null or p_participation_seconds < 0 then raise exception 'participation_seconds_invalid' using errcode='22023'; end if;
  if coalesce(length(p_game_id),0) > 80 or coalesce(length(p_match_id),0) > 200 or length(p_reason) > 120 then raise exception 'authority_input_too_long' using errcode='22023'; end if;
  if p_opponent_id = p_user_id then raise exception 'self_opponent_not_allowed' using errcode='22023'; end if;

  select r.* into v_rule from public.authority_game_rules r where r.game_id = btrim(p_game_id);
  if not found or not v_rule.enabled then raise exception 'authority_game_not_enabled' using errcode='42501'; end if;
  if p_base_amount > v_rule.max_base_authority then raise exception 'base_authority_exceeds_game_limit' using errcode='22023'; end if;
  if not p_completed or p_abandoned or p_afk then raise exception 'match_not_eligible_for_authority' using errcode='22023'; end if;
  if p_participation_seconds < v_rule.min_participation_seconds then raise exception 'insufficient_participation' using errcode='22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || btrim(p_game_id), 0));

  if exists (select 1 from public.authority_match_claims c where c.user_id=p_user_id and c.game_id=btrim(p_game_id) and c.match_id=btrim(p_match_id)) then
    select c.awarded_amount, c.multiplier, c.repeat_count into v_awarded, v_multiplier, v_repeat_count
    from public.authority_match_claims c where c.user_id=p_user_id and c.game_id=btrim(p_game_id) and c.match_id=btrim(p_match_id);

    return query
      select false,c.authority_transaction_id,pa.authority,cur.tier,cur.name,nxt.tier,nxt.name,nxt.min_authority,c.awarded_amount,c.multiplier,c.repeat_count
      from public.authority_match_claims c
      join public.player_authority pa on pa.user_id=c.user_id
      join lateral (select t.tier,t.name from public.aura_tiers t where t.min_authority<=pa.authority order by t.min_authority desc limit 1) cur on true
      left join lateral (select t.tier,t.name,t.min_authority from public.aura_tiers t where t.min_authority>pa.authority order by t.min_authority asc limit 1) nxt on true
      where c.user_id=p_user_id and c.game_id=btrim(p_game_id) and c.match_id=btrim(p_match_id);
    return;
  end if;

  if p_opponent_id is not null then
    select count(*)::integer into v_repeat_count from public.authority_match_claims c
    where c.user_id=p_user_id and c.game_id=btrim(p_game_id) and c.opponent_id=p_opponent_id
      and c.created_at >= now() - make_interval(mins => v_rule.repeat_window_minutes);
    v_multiplier := coalesce(v_rule.repeat_multipliers[least(v_repeat_count + 1, cardinality(v_rule.repeat_multipliers))],0);
  end if;

  v_awarded := floor(p_base_amount * v_multiplier)::bigint;

  if v_awarded <= 0 then
    insert into public.authority_match_claims(user_id,game_id,match_id,opponent_id,completed,abandoned,afk,participation_seconds,base_amount,repeat_count,multiplier,awarded_amount,authority_transaction_id)
    values (p_user_id,btrim(p_game_id),btrim(p_match_id),p_opponent_id,p_completed,p_abandoned,p_afk,p_participation_seconds,p_base_amount,v_repeat_count,v_multiplier,0,null)
    returning id into v_claim_id;

    return query
      select true,null::uuid,pa.authority,cur.tier,cur.name,nxt.tier,nxt.name,nxt.min_authority,0::bigint,v_multiplier,v_repeat_count
      from public.player_authority pa
      join lateral (select t.tier,t.name from public.aura_tiers t where t.min_authority<=pa.authority order by t.min_authority desc limit 1) cur on true
      left join lateral (select t.tier,t.name,t.min_authority from public.aura_tiers t where t.min_authority>pa.authority order by t.min_authority asc limit 1) nxt on true
      where pa.user_id=p_user_id;
    return;
  end if;

  v_idempotency := 'game:' || btrim(p_game_id) || ':match:' || btrim(p_match_id);

  select * into v_result from public.award_authority(
    p_user_id,v_awarded,p_reason,'game_match',v_idempotency,btrim(p_game_id),btrim(p_match_id),btrim(p_match_id),
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('base_amount',p_base_amount,'participation_seconds',p_participation_seconds,'opponent_id',p_opponent_id,'anti_farm_multiplier',v_multiplier,'repeat_count',v_repeat_count)
  );

  insert into public.authority_match_claims(user_id,game_id,match_id,opponent_id,completed,abandoned,afk,participation_seconds,base_amount,repeat_count,multiplier,awarded_amount,authority_transaction_id)
  values (p_user_id,btrim(p_game_id),btrim(p_match_id),p_opponent_id,p_completed,p_abandoned,p_afk,p_participation_seconds,p_base_amount,v_repeat_count,v_multiplier,v_awarded,v_result.transaction_id);

  return query select v_result.applied,v_result.transaction_id,v_result.authority,v_result.aura_tier,v_result.aura_name,v_result.next_tier,v_result.next_aura_name,v_result.next_threshold,v_awarded,v_multiplier,v_repeat_count;
end;
$$;

revoke all on function public.award_game_authority(uuid,text,text,bigint,text,integer,boolean,boolean,boolean,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.award_game_authority(uuid,text,text,bigint,text,integer,boolean,boolean,boolean,uuid,jsonb) to service_role;
