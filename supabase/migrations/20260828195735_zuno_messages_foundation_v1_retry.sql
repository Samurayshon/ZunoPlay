create schema if not exists private;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  direct_key text unique,
  title text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  last_message_id uuid,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type='direct' and direct_key is not null) or (type='group' and direct_key is null))
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  last_read_message_id uuid,
  last_read_at timestamptz,
  muted_until timestamptz,
  archived_at timestamptz,
  pinned_at timestamptz,
  primary key (conversation_id,user_id)
);

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists type text not null default 'text';
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists client_id uuid;
alter table public.messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.messages alter column receiver_id drop not null;
alter table public.messages alter column content drop not null;
alter table public.messages drop constraint if exists messages_content_length_chk;
alter table public.messages add constraint messages_content_length_chk check (
  deleted_at is not null or type <> 'text' or (content is not null and char_length(btrim(content)) between 1 and 4000)
);
alter table public.messages drop constraint if exists messages_no_self_chk;
alter table public.messages add constraint messages_no_self_chk check (receiver_id is null or sender_id <> receiver_id);
alter table public.messages drop constraint if exists messages_type_chk;
alter table public.messages add constraint messages_type_chk check (type in ('text','image','video','audio','file','gif','sticker','system'));

insert into public.conversations(type,direct_key,created_at,last_message_at)
select 'direct', least(sender_id::text,receiver_id::text)||':'||greatest(sender_id::text,receiver_id::text), min(created_at), max(created_at)
from public.messages
where receiver_id is not null and conversation_id is null
group by least(sender_id::text,receiver_id::text)||':'||greatest(sender_id::text,receiver_id::text)
on conflict (direct_key) do update set last_message_at=greatest(public.conversations.last_message_at,excluded.last_message_at);

update public.messages m
set conversation_id=c.id
from public.conversations c
where m.conversation_id is null
  and m.receiver_id is not null
  and c.direct_key=least(m.sender_id::text,m.receiver_id::text)||':'||greatest(m.sender_id::text,m.receiver_id::text);

insert into public.conversation_members(conversation_id,user_id,role,joined_at)
select m.conversation_id,m.sender_id,'member',min(m.created_at)
from public.messages m where m.conversation_id is not null
group by m.conversation_id,m.sender_id
on conflict (conversation_id,user_id) do nothing;

insert into public.conversation_members(conversation_id,user_id,role,joined_at)
select m.conversation_id,m.receiver_id,'member',min(m.created_at)
from public.messages m where m.conversation_id is not null and m.receiver_id is not null
group by m.conversation_id,m.receiver_id
on conflict (conversation_id,user_id) do nothing;

with latest as (
  select distinct on (m.conversation_id) m.conversation_id,m.id,m.created_at
  from public.messages m where m.conversation_id is not null
  order by m.conversation_id,m.created_at desc,m.id desc
)
update public.conversations c
set last_message_id=x.id,last_message_at=x.created_at,updated_at=greatest(c.updated_at,x.created_at)
from latest x where x.conversation_id=c.id;

alter table public.messages alter column conversation_id set not null;

create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key(message_id,user_id)
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key(message_id,user_id,emoji)
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  kind text not null check (kind in ('image','video','audio','file','gif','sticker')),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  width integer,
  height integer,
  duration_ms integer,
  thumbnail_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','inappropriate','scam','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique(message_id,reporter_id)
);

create table if not exists public.message_user_state (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_at timestamptz,
  primary key(message_id,user_id)
);

create index if not exists idx_conversation_members_user on public.conversation_members(user_id,conversation_id);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc nulls last);
create index if not exists idx_messages_conversation_page on public.messages(conversation_id,created_at desc,id desc);
create unique index if not exists idx_messages_sender_client on public.messages(sender_id,client_id) where client_id is not null;
create index if not exists idx_message_receipts_user on public.message_receipts(user_id,read_at,delivered_at);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);
create index if not exists idx_message_attachments_message on public.message_attachments(message_id);
create index if not exists idx_message_reports_reporter on public.message_reports(reporter_id,created_at desc);

create or replace function private.zuno_is_conversation_member(p_conversation_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id) $$;

create or replace function private.zuno_can_send_message(p_conversation_id uuid,p_receiver_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
select exists(
  select 1 from public.conversations c
  where c.id=p_conversation_id
    and exists(select 1 from public.conversation_members me where me.conversation_id=c.id and me.user_id=auth.uid())
    and (
      (c.type='group' and p_receiver_id is null)
      or (c.type='direct' and p_receiver_id is not null and p_receiver_id<>auth.uid()
       and exists(select 1 from public.conversation_members other where other.conversation_id=c.id and other.user_id=p_receiver_id)
       and exists(select 1 from public.friendships f where (f.user_id=auth.uid() and f.friend_id=p_receiver_id) or (f.user_id=p_receiver_id and f.friend_id=auth.uid()))
       and not exists(select 1 from public.user_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p_receiver_id) or (b.blocker_id=p_receiver_id and b.blocked_id=auth.uid()))
      )
    )
) $$;

revoke all on function private.zuno_is_conversation_member(uuid,uuid) from public,anon;
revoke all on function private.zuno_can_send_message(uuid,uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.zuno_is_conversation_member(uuid,uuid) to authenticated;
grant execute on function private.zuno_can_send_message(uuid,uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reports enable row level security;
alter table public.message_user_state enable row level security;

revoke all on public.conversations,public.conversation_members,public.message_receipts,public.message_reactions,public.message_attachments,public.message_reports,public.message_user_state from anon;
revoke all on public.messages from anon;
revoke all on public.conversations,public.conversation_members,public.message_receipts,public.message_reactions,public.message_attachments,public.message_reports,public.message_user_state from authenticated;
revoke all on public.messages from authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant update(last_read_message_id,last_read_at,muted_until,archived_at,pinned_at) on public.conversation_members to authenticated;
grant select,insert on public.messages to authenticated;
grant update(content,edited_at,deleted_at,read_at,metadata) on public.messages to authenticated;
grant select,insert,update on public.message_receipts to authenticated;
grant select,insert,delete on public.message_reactions to authenticated;
grant select,insert,delete on public.message_attachments to authenticated;
grant select,insert on public.message_reports to authenticated;
grant select,insert,update on public.message_user_state to authenticated;

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated using ((select private.zuno_is_conversation_member(id,(select auth.uid()))));

drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members for select to authenticated using ((select private.zuno_is_conversation_member(conversation_id,(select auth.uid()))));
drop policy if exists conversation_members_update_self on public.conversation_members;
create policy conversation_members_update_self on public.conversation_members for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated using ((select private.zuno_is_conversation_member(conversation_id,(select auth.uid()))));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (sender_id=(select auth.uid()) and (select private.zuno_can_send_message(conversation_id,receiver_id)));
drop policy if exists messages_update_read on public.messages;
drop policy if exists messages_update_participant on public.messages;
create policy messages_update_participant on public.messages for update to authenticated using ((sender_id=(select auth.uid())) or (receiver_id=(select auth.uid()))) with check ((sender_id=(select auth.uid())) or (receiver_id=(select auth.uid())));

drop policy if exists message_receipts_select on public.message_receipts;
create policy message_receipts_select on public.message_receipts for select to authenticated using (exists(select 1 from public.messages m where m.id=message_id and (select private.zuno_is_conversation_member(m.conversation_id,(select auth.uid())))));
drop policy if exists message_receipts_insert on public.message_receipts;
create policy message_receipts_insert on public.message_receipts for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.messages m where m.id=message_id and m.sender_id<>user_id and (select private.zuno_is_conversation_member(m.conversation_id,user_id))));
drop policy if exists message_receipts_update on public.message_receipts;
create policy message_receipts_update on public.message_receipts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions for select to authenticated using (exists(select 1 from public.messages m where m.id=message_id and (select private.zuno_is_conversation_member(m.conversation_id,(select auth.uid())))));
drop policy if exists message_reactions_insert on public.message_reactions;
create policy message_reactions_insert on public.message_reactions for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.messages m where m.id=message_id and (select private.zuno_is_conversation_member(m.conversation_id,user_id))));
drop policy if exists message_reactions_delete on public.message_reactions;
create policy message_reactions_delete on public.message_reactions for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists message_attachments_select on public.message_attachments;
create policy message_attachments_select on public.message_attachments for select to authenticated using (exists(select 1 from public.messages m where m.id=message_id and (select private.zuno_is_conversation_member(m.conversation_id,(select auth.uid())))));
drop policy if exists message_attachments_insert on public.message_attachments;
create policy message_attachments_insert on public.message_attachments for insert to authenticated with check (uploader_id=(select auth.uid()) and exists(select 1 from public.messages m where m.id=message_id and m.sender_id=(select auth.uid())));
drop policy if exists message_attachments_delete on public.message_attachments;
create policy message_attachments_delete on public.message_attachments for delete to authenticated using (uploader_id=(select auth.uid()));

drop policy if exists message_reports_select on public.message_reports;
create policy message_reports_select on public.message_reports for select to authenticated using (reporter_id=(select auth.uid()));
drop policy if exists message_reports_insert on public.message_reports;
create policy message_reports_insert on public.message_reports for insert to authenticated with check (reporter_id=(select auth.uid()) and reporter_id<>reported_user_id and exists(select 1 from public.messages m where m.id=message_id and m.sender_id=reported_user_id and (select private.zuno_is_conversation_member(m.conversation_id,reporter_id))));

drop policy if exists message_user_state_select on public.message_user_state;
create policy message_user_state_select on public.message_user_state for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists message_user_state_insert on public.message_user_state;
create policy message_user_state_insert on public.message_user_state for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.messages m where m.id=message_id and (select private.zuno_is_conversation_member(m.conversation_id,user_id))));
drop policy if exists message_user_state_update on public.message_user_state;
create policy message_user_state_update on public.message_user_state for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create or replace function public.zuno_get_or_create_direct_conversation(p_other_user uuid)
returns uuid language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); v_key text; v_id uuid; begin
 if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_other_user is null or p_other_user=v_me then raise exception 'invalid_recipient' using errcode='22023'; end if;
 if not exists(select 1 from public.friendships f where (f.user_id=v_me and f.friend_id=p_other_user) or (f.user_id=p_other_user and f.friend_id=v_me)) then raise exception 'friendship_required' using errcode='42501'; end if;
 if exists(select 1 from public.user_blocks b where (b.blocker_id=v_me and b.blocked_id=p_other_user) or (b.blocker_id=p_other_user and b.blocked_id=v_me)) then raise exception 'messaging_blocked' using errcode='42501'; end if;
 v_key:=least(v_me::text,p_other_user::text)||':'||greatest(v_me::text,p_other_user::text);
 insert into public.conversations(type,direct_key,created_by) values('direct',v_key,v_me) on conflict(direct_key) do nothing;
 select id into v_id from public.conversations where direct_key=v_key;
 insert into public.conversation_members(conversation_id,user_id,role) values(v_id,v_me,'member'),(v_id,p_other_user,'member') on conflict do nothing;
 return v_id;
end $$;
revoke all on function public.zuno_get_or_create_direct_conversation(uuid) from public,anon;
grant execute on function public.zuno_get_or_create_direct_conversation(uuid) to authenticated;

create or replace function public.zuno_create_group(p_title text,p_member_ids uuid[] default '{}'::uuid[])
returns uuid language plpgsql security definer set search_path=''
as $$declare v_me uuid:=auth.uid(); v_id uuid; v_member uuid; begin
 if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if char_length(btrim(coalesce(p_title,''))) not between 1 and 80 then raise exception 'invalid_group_title' using errcode='22023'; end if;
 if coalesce(array_length(p_member_ids,1),0)>99 then raise exception 'group_too_large' using errcode='22023'; end if;
 insert into public.conversations(type,title,created_by) values('group',btrim(p_title),v_me) returning id into v_id;
 insert into public.conversation_members(conversation_id,user_id,role) values(v_id,v_me,'owner');
 foreach v_member in array coalesce(p_member_ids,'{}'::uuid[]) loop
   if v_member is distinct from v_me and exists(select 1 from public.friendships f where (f.user_id=v_me and f.friend_id=v_member) or (f.user_id=v_member and f.friend_id=v_me)) and not exists(select 1 from public.user_blocks b where (b.blocker_id=v_me and b.blocked_id=v_member) or (b.blocker_id=v_member and b.blocked_id=v_me)) then
      insert into public.conversation_members(conversation_id,user_id,role) values(v_id,v_member,'member') on conflict do nothing;
   end if;
 end loop;
 return v_id;
end $$;
revoke all on function public.zuno_create_group(text,uuid[]) from public,anon;
grant execute on function public.zuno_create_group(text,uuid[]) to authenticated;

create or replace function public.zuno_mark_conversation_read(p_conversation_id uuid,p_message_id uuid default null)
returns void language plpgsql security invoker set search_path='public'
as $$declare v_at timestamptz:=now(); begin
 if not private.zuno_is_conversation_member(p_conversation_id,auth.uid()) then raise exception 'not_conversation_member' using errcode='42501'; end if;
 update public.conversation_members set last_read_message_id=coalesce(p_message_id,last_read_message_id),last_read_at=v_at where conversation_id=p_conversation_id and user_id=auth.uid();
 insert into public.message_receipts(message_id,user_id,delivered_at,read_at)
 select m.id,auth.uid(),v_at,v_at from public.messages m where m.conversation_id=p_conversation_id and m.sender_id<>auth.uid() and m.created_at<=coalesce((select created_at from public.messages where id=p_message_id),v_at)
 on conflict(message_id,user_id) do update set delivered_at=coalesce(public.message_receipts.delivered_at,excluded.delivered_at),read_at=coalesce(public.message_receipts.read_at,excluded.read_at);
end $$;
revoke all on function public.zuno_mark_conversation_read(uuid,uuid) from public,anon;
grant execute on function public.zuno_mark_conversation_read(uuid,uuid) to authenticated;

create or replace function public.zuno_inbox(p_limit integer default 50,p_offset integer default 0)
returns table(conversation_id uuid,conversation_type text,title text,avatar_url text,other_user_id uuid,other_username text,other_avatar_url text,last_message_id uuid,last_message_type text,last_message_content text,last_message_sender_id uuid,last_message_at timestamptz,unread_count bigint,muted_until timestamptz,pinned_at timestamptz,archived_at timestamptz)
language sql security invoker set search_path='public'
as $$select c.id,c.type,c.title,c.avatar_url,other.user_id,p.username,p.avatar_url,lm.id,lm.type,lm.content,lm.sender_id,lm.created_at,
 (select count(*) from public.messages um where um.conversation_id=c.id and um.sender_id<>auth.uid() and um.created_at>coalesce(cm.last_read_at,'epoch'::timestamptz)),cm.muted_until,cm.pinned_at,cm.archived_at
 from public.conversation_members cm join public.conversations c on c.id=cm.conversation_id
 left join lateral (select cm2.user_id from public.conversation_members cm2 where cm2.conversation_id=c.id and cm2.user_id<>auth.uid() order by cm2.joined_at limit 1) other on c.type='direct'
 left join public.profiles p on p.id=other.user_id
 left join lateral (select m.id,m.type,m.content,m.sender_id,m.created_at from public.messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1) lm on true
 where cm.user_id=auth.uid() order by cm.pinned_at desc nulls last,coalesce(lm.created_at,c.created_at) desc
 limit greatest(1,least(coalesce(p_limit,50),100)) offset greatest(coalesce(p_offset,0),0)$$;
revoke all on function public.zuno_inbox(integer,integer) from public,anon;
grant execute on function public.zuno_inbox(integer,integer) to authenticated;

create or replace function public.zuno_message_friends()
returns table(user_id uuid,username text,avatar_url text)
language sql security invoker set search_path='public'
as $$select distinct case when f.user_id=auth.uid() then f.friend_id else f.user_id end,p.username,p.avatar_url
 from public.friendships f join public.profiles p on p.id=case when f.user_id=auth.uid() then f.friend_id else f.user_id end
 where (f.user_id=auth.uid() or f.friend_id=auth.uid()) and not exists(select 1 from public.user_blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=auth.uid())) order by p.username$$;
revoke all on function public.zuno_message_friends() from public,anon;
grant execute on function public.zuno_message_friends() to authenticated;

create or replace function public.zunoplay_protect_message_updates()
returns trigger language plpgsql set search_path=''
as $$begin
 if current_user='authenticated' then
   if new.id is distinct from old.id or new.sender_id is distinct from old.sender_id or new.receiver_id is distinct from old.receiver_id or new.conversation_id is distinct from old.conversation_id or new.created_at is distinct from old.created_at or new.type is distinct from old.type or new.reply_to_id is distinct from old.reply_to_id or new.client_id is distinct from old.client_id then raise exception 'message_fields_are_immutable' using errcode='42501'; end if;
   if auth.uid()=old.sender_id then
     if new.read_at is distinct from old.read_at then raise exception 'sender_cannot_mark_read' using errcode='42501'; end if;
     if new.content is distinct from old.content and old.created_at < now()-interval '15 minutes' then raise exception 'message_edit_window_expired' using errcode='42501'; end if;
   elsif auth.uid()=old.receiver_id then
     if new.content is distinct from old.content or new.edited_at is distinct from old.edited_at or new.deleted_at is distinct from old.deleted_at or new.metadata is distinct from old.metadata then raise exception 'receiver_can_only_mark_read' using errcode='42501'; end if;
   else raise exception 'message_update_forbidden' using errcode='42501'; end if;
 end if; return new; end $$;

create or replace function public.zunoplay_conversation_message_changes()
returns trigger language plpgsql security definer set search_path=''
as $$declare v_conversation uuid:=coalesce(new.conversation_id,old.conversation_id); begin
 perform realtime.broadcast_changes('conversation:'||v_conversation::text||':messages',tg_op,tg_op,tg_table_name,tg_table_schema,new,old);
 if tg_op='INSERT' then update public.conversations set last_message_id=new.id,last_message_at=new.created_at,updated_at=now() where id=v_conversation; end if;
 return null; end $$;
revoke all on function public.zunoplay_conversation_message_changes() from public,anon,authenticated;
drop trigger if exists zunoplay_conversation_messages_broadcast on public.messages;
create trigger zunoplay_conversation_messages_broadcast after insert or update or delete on public.messages for each row execute function public.zunoplay_conversation_message_changes();

create or replace function public.zunoplay_reaction_changes()
returns trigger language plpgsql security definer set search_path='' as $$declare v_conv uuid; begin select m.conversation_id into v_conv from public.messages m where m.id=coalesce(new.message_id,old.message_id); perform realtime.broadcast_changes('conversation:'||v_conv::text||':reactions',tg_op,tg_op,tg_table_name,tg_table_schema,new,old); return null; end $$;
revoke all on function public.zunoplay_reaction_changes() from public,anon,authenticated;
drop trigger if exists zunoplay_reactions_broadcast on public.message_reactions;
create trigger zunoplay_reactions_broadcast after insert or delete on public.message_reactions for each row execute function public.zunoplay_reaction_changes();

create or replace function public.zunoplay_receipt_changes()
returns trigger language plpgsql security definer set search_path='' as $$declare v_conv uuid; begin select m.conversation_id into v_conv from public.messages m where m.id=coalesce(new.message_id,old.message_id); perform realtime.broadcast_changes('conversation:'||v_conv::text||':receipts',tg_op,tg_op,tg_table_name,tg_table_schema,new,old); return null; end $$;
revoke all on function public.zunoplay_receipt_changes() from public,anon,authenticated;
drop trigger if exists zunoplay_receipts_broadcast on public.message_receipts;
create trigger zunoplay_receipts_broadcast after insert or update on public.message_receipts for each row execute function public.zunoplay_receipt_changes();

drop policy if exists zunoplay_receive_conversation_broadcasts on realtime.messages;
create policy zunoplay_receive_conversation_broadcasts on realtime.messages for select to authenticated using (extension='broadcast' and exists(select 1 from public.conversation_members cm where cm.user_id=(select auth.uid()) and (realtime.topic()='conversation:'||cm.conversation_id::text||':messages' or realtime.topic()='conversation:'||cm.conversation_id::text||':typing' or realtime.topic()='conversation:'||cm.conversation_id::text||':receipts' or realtime.topic()='conversation:'||cm.conversation_id::text||':reactions')));
drop policy if exists zunoplay_send_conversation_broadcasts on realtime.messages;
create policy zunoplay_send_conversation_broadcasts on realtime.messages for insert to authenticated with check (extension='broadcast' and exists(select 1 from public.conversation_members cm where cm.user_id=(select auth.uid()) and realtime.topic()='conversation:'||cm.conversation_id::text||':typing'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('message-media','message-media',false,26214400,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/webm','audio/ogg','audio/mpeg','application/pdf','text/plain','application/zip'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists zuno_message_media_select on storage.objects;
create policy zuno_message_media_select on storage.objects for select to authenticated using (bucket_id='message-media' and exists(select 1 from public.conversation_members cm where cm.user_id=(select auth.uid()) and cm.conversation_id::text=(storage.foldername(name))[1]));
drop policy if exists zuno_message_media_insert on storage.objects;
create policy zuno_message_media_insert on storage.objects for insert to authenticated with check (bucket_id='message-media' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.conversation_members cm where cm.user_id=(select auth.uid()) and cm.conversation_id::text=(storage.foldername(name))[1]));
drop policy if exists zuno_message_media_update on storage.objects;
create policy zuno_message_media_update on storage.objects for update to authenticated using (bucket_id='message-media' and owner_id=(select auth.uid())::text and exists(select 1 from public.conversation_members cm where cm.user_id=(select auth.uid()) and cm.conversation_id::text=(storage.foldername(name))[1])) with check (bucket_id='message-media' and owner_id=(select auth.uid())::text);
drop policy if exists zuno_message_media_delete on storage.objects;
create policy zuno_message_media_delete on storage.objects for delete to authenticated using (bucket_id='message-media' and owner_id=(select auth.uid())::text);

