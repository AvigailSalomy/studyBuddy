-- StudyBuddy seed data
--
-- Courses are now created dynamically by users (see the
-- dynamic_courses migration), so this is just a handful of example rows
-- for local testing of the search/suggestion flow -- not a catalog to
-- maintain. They're tagged with a clearly-fake institution so they never
-- surface as suggestions to real users (suggestions are scoped to the
-- searching user's own institution, which won't be "Sample University"
-- unless someone deliberately types that).
--
-- profiles/groups/etc. still aren't seeded here: profiles.id is a
-- foreign key to auth.users.id, so rows can't be faked without also
-- faking auth users -- and there's no way to log in as a fake user to
-- actually test the app with one.
--
-- Idempotent: safe to re-run, will not create duplicate rows.

insert into public.courses (institution, faculty, course_name)
values
  ('Sample University', 'Computer Science', 'Introduction to Computer Science'),
  ('Sample University', 'Computer Science', 'Data Structures'),
  ('Sample University', 'Computer Science', 'Databases'),
  ('Sample University', 'Business', 'Principles of Marketing'),
  ('Sample University', 'Business', 'Financial Accounting'),
  ('Sample University', 'Psychology', 'Introduction to Psychology')
on conflict (institution, faculty, (lower(course_name))) do nothing;
