-- Align the legacy username compatibility field with the current Zuno nickname rule.
-- complete_zuno_identity and ensure_unique_profile_username already accept 1..12/1..20,
-- but this stale table constraint still required at least 3 characters.

alter table public.profiles
  drop constraint if exists profiles_username_length_chk;

alter table public.profiles
  add constraint profiles_username_length_chk
  check (char_length(btrim(username)) between 1 and 20);
