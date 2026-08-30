create or replace function public.award_authority(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_source_type text,
  p_idempotency_key text,
  p_game_id text default null,
  p_match_id text default null,
  p_source_id text default null,
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
  next_threshold bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx_id uuid;
  v_authority bigint;
  v_tier smallint;
  v_name text;
  v_next_tier smallint;
  v_next_name text;
  v_next_threshold bigint;
  v_applied boolean := false;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = '22004';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'authority_amount_must_be_positive' using errcode = '22023';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  if p_source_type is null or btrim(p_source_type) = '' then
    raise exception 'source_type_required' using errcode = '22023';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;

  if length(p_reason) > 120 or length(p_source_type) > 64 or length(p_idempotency_key) > 200
     or coalesce(length(p_game_id), 0) > 80 or coalesce(length(p_match_id), 0) > 200
     or coalesce(length(p_source_id), 0) > 200 then
    raise exception 'authority_input_too_long' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'authority_user_not_found' using errcode = '23503';
  end if;

  insert into public.player_authority as pa (user_id, authority, updated_at)
  values (p_user_id, 0, now())
  on conflict (user_id) do nothing;

  insert into public.authority_transactions (
    user_id, game_id, match_id, source_type, source_id,
    amount, reason, idempotency_key, metadata, created_at
  ) values (
    p_user_id,
    nullif(btrim(p_game_id), ''),
    nullif(btrim(p_match_id), ''),
    btrim(p_source_type),
    nullif(btrim(p_source_id), ''),
    p_amount,
    btrim(p_reason),
    btrim(p_idempotency_key),
    coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_tx_id;

  if v_tx_id is not null then
    update public.player_authority pa
       set authority = pa.authority + p_amount,
           updated_at = now()
     where pa.user_id = p_user_id
     returning pa.authority into v_authority;
    v_applied := true;
  else
    select at.id
      into v_tx_id
      from public.authority_transactions at
     where at.user_id = p_user_id
       and at.idempotency_key = btrim(p_idempotency_key);

    select pa.authority
      into v_authority
      from public.player_authority pa
     where pa.user_id = p_user_id;
  end if;

  select t.tier, t.name
    into v_tier, v_name
    from public.aura_tiers t
   where t.min_authority <= v_authority
   order by t.min_authority desc
   limit 1;

  select t.tier, t.name, t.min_authority
    into v_next_tier, v_next_name, v_next_threshold
    from public.aura_tiers t
   where t.min_authority > v_authority
   order by t.min_authority asc
   limit 1;

  return query
  select v_applied, v_tx_id, v_authority, v_tier, v_name,
         v_next_tier, v_next_name, v_next_threshold;
end;
$$;

revoke all on function public.award_authority(uuid,bigint,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.award_authority(uuid,bigint,text,text,text,text,text,text,jsonb) to service_role;
