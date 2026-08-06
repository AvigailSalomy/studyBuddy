-- StudyBuddy table grants
--
-- "Automatically expose new tables" was disabled when this project was
-- created, so PostgREST's authenticated role has RLS policies but no
-- base table-level privileges -- Postgres checks GRANTs before RLS is
-- ever consulted, so every operation was being denied at that first
-- gate regardless of policy. This migration grants exactly the
-- operations each table's existing RLS policies already allow, and
-- nothing more. No grants to anon: every policy in this project is
-- scoped `to authenticated` only, so anon correctly continues to have
-- zero access, matching the design confirmed in M1.
--
-- RLS remains the authorization layer -- these grants only clear the
-- privilege floor PostgREST requires to reach that layer at all; they
-- do not by themselves widen access beyond what each policy permits.

grant usage on schema public to authenticated;

-- profiles: select (all authenticated), insert/update (own row only,
-- enforced by policy). No delete policy exists, so no delete grant.
grant select, insert, update on table public.profiles to authenticated;

-- courses: read-only reference data.
grant select on table public.courses to authenticated;

-- profile_courses: a user manages only their own rows (policy-enforced).
-- No update policy exists.
grant select, insert, delete on table public.profile_courses to authenticated;

-- groups: full CRUD surface, ownership enforced by policy.
grant select, insert, update, delete on table public.groups to authenticated;

-- group_members: no update policy exists (role changes aren't a
-- documented feature).
grant select, insert, delete on table public.group_members to authenticated;

-- join_requests: no delete policy exists (requests are kept as history
-- via status, never removed).
grant select, insert, update on table public.join_requests to authenticated;

-- materials: no update policy exists (Technical Design doc frames
-- editing name/category as conditional, not firm).
grant select, insert, delete on table public.materials to authenticated;

-- chat_messages: append-only by design, no update/delete policy exists.
grant select, insert on table public.chat_messages to authenticated;

-- meetings: full CRUD surface, creator/owner enforced by policy.
grant select, insert, update, delete on table public.meetings to authenticated;

-- tasks: full CRUD surface, membership/creator/owner enforced by policy.
grant select, insert, update, delete on table public.tasks to authenticated;
