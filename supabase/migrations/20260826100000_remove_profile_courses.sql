-- StudyBuddy: remove public.profile_courses
--
-- This table (many-to-many join between profiles and the courses they
-- study) was created in initial_schema.sql but never wired up to any
-- application code -- no query, Server Action, or RPC in this project
-- has ever read from or written to it (courses are associated only at
-- the group level, via groups.course_id, decided after this table was
-- already in place). The recommendation engine (lib/recommendation-
-- tier.ts) explicitly does not use it either.
--
-- Dropping the table also drops its RLS policies
-- (profile_courses_select_self / _insert_self / _delete_self) and its
-- index (profile_courses_course_id_idx) automatically, since they
-- belong to the table itself. No other table has a foreign key
-- pointing at profile_courses, so this has no effect on `profiles`,
-- `courses`, `groups`, or anything else.

drop table public.profile_courses;
