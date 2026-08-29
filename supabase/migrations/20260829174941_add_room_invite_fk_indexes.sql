-- Cover room_invites foreign keys used by user lifecycle / referential checks.
create index if not exists room_invites_inviter_id_idx
  on public.room_invites(inviter_id);

create index if not exists room_invites_accepted_by_idx
  on public.room_invites(accepted_by)
  where accepted_by is not null;
