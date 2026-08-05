-- StudyBuddy indexes
-- Postgres does not auto-index foreign key columns, so every FK that is
-- actually filtered/joined on in the app's query patterns gets an explicit
-- index here. Purely additive; safe to run against an empty database.

-- Reverse direction of profile_courses' PK (profile_id, course_id):
-- used by the recommendation engine to find users studying a given course.
create index profile_courses_course_id_idx on public.profile_courses (course_id);

-- groups: filtered by course in search/recommendations, and by owner on
-- the "groups I created" dashboard view.
create index groups_course_id_idx on public.groups (course_id);
create index groups_owner_id_idx on public.groups (owner_id);

-- group_members: reverse direction of the PK (group_id, profile_id),
-- needed for "my groups" queries.
create index group_members_profile_id_idx on public.group_members (profile_id);

-- join_requests: owner viewing pending requests for their group, and a
-- user viewing their own request history.
create index join_requests_group_id_idx on public.join_requests (group_id);
create index join_requests_profile_id_idx on public.join_requests (profile_id);

-- Enforces "no duplicate pending join request" at the database level.
-- Partial (not a plain unique constraint) so a user can re-request after a
-- past rejection.
create unique index join_requests_one_pending_idx
  on public.join_requests (group_id, profile_id)
  where (status = 'pending');

-- materials: primary access pattern is "list this group's materials".
create index materials_group_id_idx on public.materials (group_id);

-- chat_messages: "last N messages for this group, ordered by time" is the
-- only real query pattern, and what the Realtime subscription filters on.
create index chat_messages_group_id_created_at_idx
  on public.chat_messages (group_id, created_at);

-- meetings: list a group's meetings, plus a partial index that directly
-- serves the Cron job's "meetings needing a reminder" query. Partial so
-- the index stays small (only not-yet-reminded rows) instead of covering
-- the whole table.
create index meetings_group_id_idx on public.meetings (group_id);
create index meetings_pending_reminder_idx
  on public.meetings (meeting_time)
  where (reminder_sent = false);

-- tasks: list a group's tasks, plus a possible future "my tasks across
-- groups" view.
create index tasks_group_id_idx on public.tasks (group_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
