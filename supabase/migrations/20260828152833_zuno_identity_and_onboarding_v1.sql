alter table public.profiles add column if not exists zuno_id text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists identity_locked boolean not null default false;
alter table public.profiles add column if not exists onboarding_step integer not null default 0;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists interests jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_zuno_id_format_check;
alter table public.profiles add constraint profiles_zuno_id_format_check check (zuno_id is null or zuno_id ~ '^[A-Za-z0-9_]{1,12}$');
alter table public.profiles drop constraint if exists profiles_nickname_length_check;
alter table public.profiles add constraint profiles_nickname_length_check check (nickname is null or char_length(btrim(nickname)) between 1 and 12);
alter table public.profiles drop constraint if exists profiles_sex_zuno_check;
alter table public.profiles add constraint profiles_sex_zuno_check check (sex in ('masculino','feminino'));
alter table public.profiles drop constraint if exists profiles_onboarding_step_check;
alter table public.profiles add constraint profiles_onboarding_step_check check (onboarding_step between 0 and 6);

create unique index if not exists profiles_zuno_id_unique_ci on public.profiles (lower(zuno_id)) where zuno_id is not null;

create or replace function public.protect_zuno_permanent_identity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.identity_locked then
    if new.zuno_id is distinct from old.zuno_id then raise exception 'zuno_id_locked'; end if;
    if new.sex is distinct from old.sex then raise exception 'sex_locked'; end if;
    if new.identity_locked is distinct from true then raise exception 'identity_lock_cannot_be_removed'; end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_protect_zuno_permanent_identity on public.profiles;
create trigger trg_protect_zuno_permanent_identity before update on public.profiles for each row execute function public.protect_zuno_permanent_identity();

create or replace function public.is_zuno_id_available(p_zuno_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select p_zuno_id ~ '^[A-Za-z0-9_]{1,12}$' and not exists(select 1 from public.profiles where lower(zuno_id)=lower(p_zuno_id));
$$;

create or replace function public.complete_zuno_identity(p_zuno_id text,p_sex text,p_nickname text,p_interests jsonb default '[]'::jsonb)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_zuno_id !~ '^[A-Za-z0-9_]{1,12}$' then raise exception 'invalid_zuno_id'; end if;
  if p_sex not in ('masculino','feminino') then raise exception 'invalid_sex'; end if;
  if char_length(btrim(p_nickname)) not between 1 and 12 then raise exception 'invalid_nickname'; end if;
  if exists(select 1 from public.profiles where lower(zuno_id)=lower(p_zuno_id) and id<>v_uid) then raise exception 'zuno_id_taken'; end if;
  update public.profiles set zuno_id=p_zuno_id,sex=p_sex,nickname=btrim(p_nickname),username=btrim(p_nickname),interests=coalesce(p_interests,'[]'::jsonb),identity_locked=true,onboarding_step=6,onboarding_completed_at=now() where id=v_uid returning * into v_profile;
  if v_profile.id is null then raise exception 'profile_not_found'; end if;
  return v_profile;
end;$$;

grant execute on function public.is_zuno_id_available(text) to authenticated;
grant execute on function public.complete_zuno_identity(text,text,text,jsonb) to authenticated;
