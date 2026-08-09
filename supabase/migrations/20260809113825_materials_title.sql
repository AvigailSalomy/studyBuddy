-- StudyBuddy materials.title
--
-- Adds a required, free-text title separate from file_name (the
-- original uploaded filename, unchanged) and category (the existing
-- predefined enum, unchanged) -- e.g. title "Machine Learning Exam
-- Summary", category "summary", file_name "machine_learning_notes.pdf".
--
-- Added nullable first, backfilled, then set NOT NULL: any materials
-- rows that already exist (from testing before this change) need a
-- value before the column can be required. file_name is used as the
-- backfill default -- not the ideal user-facing title, but a reasonable
-- placeholder for pre-existing rows with no delete/edit feature yet to
-- fix them by hand.
--
-- No RLS/grant changes: materials_insert_members only checks group
-- membership and uploaded_by, not specific columns, so it already
-- covers inserts that include this new column.

alter table public.materials add column title text;

update public.materials
set title = file_name
where title is null;

alter table public.materials alter column title set not null;

alter table public.materials
  add constraint materials_title_not_blank check (char_length(title) > 0);
