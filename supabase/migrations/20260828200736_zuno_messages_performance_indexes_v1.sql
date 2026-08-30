create index if not exists idx_conversations_created_by on public.conversations(created_by);
create index if not exists idx_message_attachments_uploader on public.message_attachments(uploader_id);
create index if not exists idx_message_reactions_user on public.message_reactions(user_id);
create index if not exists idx_message_reports_reported_user on public.message_reports(reported_user_id);
create index if not exists idx_message_user_state_user on public.message_user_state(user_id);
create index if not exists idx_messages_reply_to on public.messages(reply_to_id);
