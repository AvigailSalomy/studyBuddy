-- StudyBuddy Row Level Security
-- Enables RLS on every table and defines the policies agreed on in M1.
-- RLS is the primary permission layer for this project (not just
-- application-level checks in Server Actions). No destructive statements.

-- ---------------------------------------------------------------------
-- Helper functions
--
-- security definer so they bypass RLS internally when checking
-- membership/ownership. Without this, a policy that queries
-- group_members from within a group_members policy (or groups from a
-- policy on a dependent table) would re-apply RLS to that inner query,
-- which is unnecessary overhead here since these functions only ever
-- check a single narrow condition. set search_path pins name resolution
-- for security, per Postgres's security definer guidance.
-- ---------------------------------------------------------------------

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where id = p_group_id
      and owner_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- Open SELECT to any authenticated user (confirmed decision) so names
-- can be displayed on chat/materials/tasks/meetings and in group search
-- results. Writes are restricted to the row's own owner.
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: profile deletion is out of scope for this version
-- (Technical Design doc, section 4).

-- ---------------------------------------------------------------------
-- courses
-- Reference data: readable by any authenticated user, not writable from
-- the app (seeded/managed data only).
-- ---------------------------------------------------------------------

alter table public.courses enable row level security;

create policy "courses_select_authenticated"
  on public.courses for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- profile_courses
-- A user manages only their own course list.
-- ---------------------------------------------------------------------

alter table public.profile_courses enable row level security;

create policy "profile_courses_select_self"
  on public.profile_courses for select
  to authenticated
  using (profile_id = auth.uid());

create policy "profile_courses_insert_self"
  on public.profile_courses for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "profile_courses_delete_self"
  on public.profile_courses for delete
  to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------
-- groups
-- Search/browse is available to all authenticated users, including
-- non-members (product spec: search & filter is a general capability).
-- Only the owner can modify or delete their group.
-- ---------------------------------------------------------------------

alter table public.groups enable row level security;

create policy "groups_select_authenticated"
  on public.groups for select
  to authenticated
  using (true);

create policy "groups_insert_own"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "groups_update_owner"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "groups_delete_owner"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- group_members
-- Visible to fellow group members only (not the whole app). Rows are
-- only ever inserted by the group owner (covers both "creator becomes
-- first member" at group creation and "approve join request" later,
-- since groups.owner_id is set before either insert happens). A member
-- can remove themself (leave); the owner can remove anyone. No update
-- policy: role changes after the fact are not a documented feature.
-- ---------------------------------------------------------------------

alter table public.group_members enable row level security;

create policy "group_members_select_fellow_members"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group_members_insert_by_owner"
  on public.group_members for insert
  to authenticated
  with check (public.is_group_owner(group_id));

create policy "group_members_delete_self_or_owner"
  on public.group_members for delete
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_group_owner(group_id)
  );

-- ---------------------------------------------------------------------
-- join_requests
-- Visible to the requester and the group owner only. A user can only
-- create a request on their own behalf; only the owner can change its
-- status (approve/reject). No delete policy: requests are kept as
-- history via status, never removed.
-- ---------------------------------------------------------------------

alter table public.join_requests enable row level security;

create policy "join_requests_select_requester_or_owner"
  on public.join_requests for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_group_owner(group_id)
  );

create policy "join_requests_insert_self"
  on public.join_requests for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "join_requests_update_owner"
  on public.join_requests for update
  to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

-- ---------------------------------------------------------------------
-- materials
-- Visible/uploadable by group members only. Deletable by the uploader
-- or the group owner. No update policy for now: the Technical Design
-- doc frames editing a material's name/category as conditional
-- ("if necessary"), not a firm requirement -- add one later if needed.
-- ---------------------------------------------------------------------

alter table public.materials enable row level security;

create policy "materials_select_members"
  on public.materials for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "materials_insert_members"
  on public.materials for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and uploaded_by = auth.uid()
  );

create policy "materials_delete_uploader_or_owner"
  on public.materials for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.is_group_owner(group_id)
  );

-- ---------------------------------------------------------------------
-- chat_messages
-- Visible/sendable by group members only. Deliberately no update/delete
-- policy at all: the Technical Design doc states messages cannot be
-- edited or deleted, so those operations are blocked by the absence of
-- a policy rather than by application logic alone.
-- ---------------------------------------------------------------------

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_members"
  on public.chat_messages for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "chat_messages_insert_members"
  on public.chat_messages for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and sender_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- meetings
-- Visible/creatable by group members. Editable/deletable by the
-- creator or the group owner. The Cron reminder job (M8) is not an
-- authenticated user session at all -- it is authenticated by a secret
-- header, not auth.uid() -- so its reads/writes (marking
-- reminder_sent) will go through the Supabase service role key in the
-- /api/cron/meeting-reminders route handler specifically, bypassing RLS
-- for that one trusted, non-user-facing endpoint only. This does not
-- weaken RLS as the primary layer for user-facing operations, all of
-- which still go through the policies below.
-- ---------------------------------------------------------------------

alter table public.meetings enable row level security;

create policy "meetings_select_members"
  on public.meetings for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "meetings_insert_members"
  on public.meetings for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

create policy "meetings_update_creator_or_owner"
  on public.meetings for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_group_owner(group_id)
  )
  with check (
    created_by = auth.uid()
    or public.is_group_owner(group_id)
  );

create policy "meetings_delete_creator_or_owner"
  on public.meetings for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_group_owner(group_id)
  );

-- ---------------------------------------------------------------------
-- tasks
-- Visible to and updatable (status/details) by any group member, since
-- the product spec frames task management as collaborative, not
-- assignee-exclusive. Deletable by the creator or the group owner.
-- ---------------------------------------------------------------------

alter table public.tasks enable row level security;

create policy "tasks_select_members"
  on public.tasks for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "tasks_insert_members"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

create policy "tasks_update_members"
  on public.tasks for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "tasks_delete_creator_or_owner"
  on public.tasks for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_group_owner(group_id)
  );
