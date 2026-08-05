-- StudyBuddy seed data
-- Only reference data (courses) is seeded here. profiles/groups/etc. all
-- require a real auth.users row behind them (profiles.id is a foreign key
-- to auth.users.id), so they can't be faked without also creating fake
-- auth users -- and there's no way to log in as a fake user to actually
-- test the app with one. Once you've signed up 1-2 real test accounts
-- through /register, this file can be extended with sample groups/
-- memberships tied to their real ids.
--
-- Idempotent: safe to re-run, will not create duplicate rows.

insert into public.courses (course_code, course_name, faculty)
values
  ('CS101', 'Introduction to Computer Science', 'Computer Science'),
  ('CS201', 'Data Structures', 'Computer Science'),
  ('CS310', 'Databases', 'Computer Science'),
  ('BUS150', 'Principles of Marketing', 'Business'),
  ('BUS220', 'Financial Accounting', 'Business'),
  ('PSY101', 'Introduction to Psychology', 'Psychology')
on conflict (course_code) do nothing;
