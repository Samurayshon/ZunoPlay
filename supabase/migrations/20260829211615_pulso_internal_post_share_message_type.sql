alter table public.messages drop constraint if exists messages_type_chk;
alter table public.messages add constraint messages_type_chk check (type = any (array['text','image','video','audio','file','gif','sticker','system','post_share']::text[]));
