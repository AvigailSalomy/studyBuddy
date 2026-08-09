-- StudyBuddy tasks.description
--
-- The tasks table (M1) has everything the Tasks feature needs except a
-- description field -- title, status, due_date, assignee_id, created_by
-- all already exist and are reused as-is. This is the one genuine gap.
--
-- Plain nullable text, no CHECK constraint, matching the existing
-- groups.description precedent -- length is validated at the app layer
-- (schemas/tasks.ts) via Zod, not the database.
--
-- No RLS/grant changes: tasks_insert_members and tasks_update_members
-- already cover writes to this column the same way they cover every
-- other column on the row.

alter table public.tasks add column description text;
