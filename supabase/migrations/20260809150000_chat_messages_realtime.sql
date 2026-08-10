-- StudyBuddy chat: enable Realtime for chat_messages
--
-- The table's schema, indexes, grants, and RLS policies are already
-- exactly right for member-only chat (chat_messages_select_members /
-- chat_messages_insert_members, both keyed off is_group_member(group_id);
-- no update/delete policy or grant exists at all, matching the
-- append-only, no-edit/no-delete product rule). The one missing piece is
-- that no table has ever been added to the supabase_realtime publication,
-- so no Postgres Changes events are emitted yet regardless of RLS.
--
-- Once added, Realtime's Postgres Changes (CDC) delivery already
-- enforces the table's own SELECT RLS policy per subscriber -- a
-- non-member's channel simply never receives INSERT events for a group
-- they're not in, with no extra "private channel"/authorization-table
-- setup needed (that machinery is for Broadcast/Presence, not used
-- here). This migration is purely additive: it does not change any
-- policy, grant, or column.

alter publication supabase_realtime add table public.chat_messages;
