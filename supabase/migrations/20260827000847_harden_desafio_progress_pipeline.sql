revoke update, delete on public.game_scores from authenticated;
grant insert on public.game_scores to authenticated;

drop policy if exists "Users can insert their own game scores" on public.game_scores;
create policy "Users can insert their own game scores"
on public.game_scores
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and questions = 10
  and correct_answers between 0 and 10
  and score = correct_answers * 100
  and game ~ '^Desafio Zuno · Nível ([1-9]|10)$'
);

create or replace function public.apply_desafio_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level integer;
  v_current integer;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_game_owner' using errcode = '42501';
  end if;

  if new.questions <> 10
     or new.correct_answers < 0
     or new.correct_answers > 10
     or new.score <> new.correct_answers * 100
     or new.game !~ '^Desafio Zuno · Nível ([1-9]|10)$' then
    raise exception 'invalid_game_result' using errcode = '22023';
  end if;

  v_level := substring(new.game from 'Nível ([0-9]+)$')::integer;

  select greatest(1, least(10, coalesce(level,1)))
    into v_current
  from public.profiles
  where id = new.user_id
  for update;

  if v_current is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_level > v_current then
    raise exception 'level_locked' using errcode = '42501';
  end if;

  if new.correct_answers >= 8 and v_level = v_current and v_current < 10 then
    update public.profiles
    set level = v_current + 1
    where id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_desafio_progress() from public, anon, authenticated;

drop trigger if exists apply_desafio_progress_after_insert on public.game_scores;
create trigger apply_desafio_progress_after_insert
after insert on public.game_scores
for each row execute function public.apply_desafio_progress();

create or replace function public.submit_desafio_result(
  p_level integer,
  p_correct integer,
  p_score integer,
  p_questions integer default 10
)
returns table(unlocked_level integer, recorded boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_level integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_level < 1 or p_level > 10
     or p_questions <> 10
     or p_correct < 0 or p_correct > p_questions
     or p_score <> p_correct * 100 then
    raise exception 'invalid_game_result' using errcode = '22023';
  end if;

  select greatest(1, least(10, coalesce(level,1)))
    into v_level
  from public.profiles
  where id = v_user;

  if v_level is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if p_level > v_level then
    raise exception 'level_locked' using errcode = '42501';
  end if;

  insert into public.game_scores(user_id, game, score, questions, correct_answers)
  values (v_user, 'Desafio Zuno · Nível ' || p_level::text, p_score, p_questions, p_correct);

  select greatest(1, least(10, coalesce(level,1)))
    into v_level
  from public.profiles
  where id = v_user;

  return query select v_level, true;
end;
$$;

revoke all on function public.submit_desafio_result(integer,integer,integer,integer) from public, anon;
grant execute on function public.submit_desafio_result(integer,integer,integer,integer) to authenticated;
