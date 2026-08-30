create or replace function public.update_zuno_profile(p_nickname text, p_bio text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nickname text := btrim(coalesce(p_nickname,''));
  v_bio text := nullif(btrim(coalesce(p_bio,'')),'');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode='42501';
  end if;
  if char_length(v_nickname) < 1 or char_length(v_nickname) > 12 then
    raise exception 'invalid_nickname' using errcode='23514';
  end if;
  update public.profiles
     set nickname = v_nickname,
         bio = v_bio
   where id = v_uid;
  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;
revoke all on function public.update_zuno_profile(text,text) from public;
grant execute on function public.update_zuno_profile(text,text) to authenticated;
