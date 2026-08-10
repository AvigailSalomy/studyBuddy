-- StudyBuddy chat: per-(user, group) read tracking
--
-- Adds last_chat_read_at directly to group_members rather than a new
-- table: group_members already has exactly the (group_id, profile_id)
-- granularity needed, a row already exists for every member the moment
-- they join (owner included, via createGroup/approveJoinRequest), and
-- neither insert call site specifies every column, so the new column's
-- default applies to both automatically with no application changes.
--
-- `default now()` is evaluated once for all *existing* rows at
-- migration time, and per-row for all future inserts -- so on ship day,
-- all current chat history is implicitly "read" for existing members
-- (no retroactive unread flood), and only messages sent after this
-- migration count as unread. No new index needed:
-- chat_messages_group_id_created_at_idx (group_id, created_at) already
-- serves the "created_at > last_chat_read_at for this group" comparison
-- unread_chat_summary() runs below.

alter table public.group_members
  add column last_chat_read_at timestamptz not null default now();

-- ---------------------------------------------------------------------
-- RLS: a member may update only their OWN read-state row.
--
-- The row-level policy alone would let a member UPDATE any column on
-- their own row, including `role` -- reopening the "role changes aren't
-- a documented feature" door this project deliberately left closed (no
-- UPDATE policy existed on group_members before this migration). The
-- column-level GRANT below is what actually prevents that: Postgres
-- enforces column privileges for UPDATE independently of RLS, so an
-- UPDATE touching `role`/`group_id`/`profile_id` is rejected by the
-- grant system regardless of what this policy allows.
-- ---------------------------------------------------------------------

create policy "group_members_update_own_read_state"
  on public.group_members for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant update (last_chat_read_at) on public.group_members to authenticated;

-- ---------------------------------------------------------------------
-- unread_chat_summary(): one round trip for the Dashboard's New
-- Messages card -- per group with unread messages, the group name, the
-- unread count, and the single latest unread message (with sender
-- name), computed in one windowed pass instead of one query per group
-- (same "aggregate PostgREST can't express directly -> a SQL function"
-- shape as group_member_counts()).
--
-- Deliberately NOT security definer (unlike group_member_counts(),
-- which must bypass RLS to show member counts for groups the caller
-- hasn't joined). Here the caller should only ever see unread data for
-- their own groups anyway, so running as invoker means RLS
-- (chat_messages_select_members / group_members_select_fellow_members)
-- applies underneath as a second, independent layer on top of this
-- function's own auth.uid() filters -- belt and suspenders, not a
-- bypass.
-- ---------------------------------------------------------------------

create or replace function public.unread_chat_summary()
returns table (
  group_id uuid,
  group_name text,
  unread_count bigint,
  latest_message_id uuid,
  latest_message_content text,
  latest_message_created_at timestamptz,
  latest_sender_id uuid,
  latest_sender_name text
)
language sql
stable
as $$
  select
    ranked.group_id,
    ranked.group_name,
    ranked.unread_count,
    ranked.id,
    ranked.content,
    ranked.created_at,
    ranked.sender_id,
    ranked.sender_name
  from (
    select
      cm.group_id,
      g.name as group_name,
      cm.id,
      cm.content,
      cm.created_at,
      cm.sender_id,
      p.full_name as sender_name,
      count(*) over (partition by cm.group_id) as unread_count,
      row_number() over (partition by cm.group_id order by cm.created_at desc) as rn
    from public.chat_messages cm
    join public.group_members gm
      on gm.group_id = cm.group_id
     and gm.profile_id = auth.uid()
    join public.groups g on g.id = cm.group_id
    join public.profiles p on p.id = cm.sender_id
    where cm.created_at > gm.last_chat_read_at
      and cm.sender_id <> auth.uid()
  ) ranked
  where ranked.rn = 1
  order by ranked.created_at desc;
$$;

grant execute on function public.unread_chat_summary() to authenticated;
