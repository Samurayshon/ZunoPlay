alter table public.profiles
  drop constraint if exists profiles_username_length_chk;

alter table public.profiles
  add constraint profiles_username_length_chk
  check (char_length(btrim(username)) between 1 and 20);
