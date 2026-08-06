-- StudyBuddy group member count fix
--
-- Two things, both about the same underlying issue:
--
-- 1. group_member_counts(): group_members_select_fellow_members (RLS
--    migration) correctly restricts the full member list to fellow
--    members only -- but an embedded `group_members(count)` aggregate
--    is just a filtered SELECT under the hood, so it inherited that
--    same restriction. Any viewer who isn't a member of a given group
--    (the common case -- browsing/search is explicitly open to
--    non-members per the M1 design) saw a count of 0 regardless of how
--    many members actually exist, on both the dashboard and the group
--    detail page. The member *count* is meant to be public information
--    (it's shown on dashboard cards, which non-members browse), so it's
--    computed here via a security definer function -- same pattern as
--    is_group_member/is_group_owner in the RLS migration -- rather than
--    by loosening the group_members SELECT policy itself, which would
--    expose the full member list (names) to non-members, not just a
--    number. The full roster continues to go through the existing
--    RLS-restricted SELECT, unchanged.
--
-- 2. A one-time, idempotent backfill: insert an owner group_members row
--    for any existing group that's missing one, in case a group in
--    existing data predates this fix for some other reason (a failed
--    partial write, manual test data, etc). Safe to run repeatedly (the
--    NOT EXISTS guard, plus ON CONFLICT DO NOTHING against the
--    (group_id, profile_id) primary key) and a no-op on a database
--    where nothing is actually missing.

create or replace function public.group_member_counts(p_group_ids uuid[])
returns table (group_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select gm.group_id, count(*)::bigint as member_count
  from public.group_members gm
  where gm.group_id = any(p_group_ids)
  group by gm.group_id;
$$;

grant execute on function public.group_member_counts(uuid[]) to authenticated;

insert into public.group_members (group_id, profile_id, role)
select g.id, g.owner_id, 'owner'
from public.groups g
where not exists (
  select 1
  from public.group_members gm
  where gm.group_id = g.id
    and gm.profile_id = g.owner_id
)
on conflict (group_id, profile_id) do nothing;
