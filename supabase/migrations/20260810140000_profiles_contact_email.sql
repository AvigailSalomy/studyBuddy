-- StudyBuddy profiles: optional, user-chosen contact email
--
-- Deliberately distinct from profiles.email (the auth/login email,
-- copied from auth.users at onboarding in actions/profile.ts and never
-- displayed anywhere in the app). contact_email is nullable, set only
-- when the user explicitly chooses to share one, and cleared back to
-- null the same way other optional free-text fields in this schema are
-- (materials.title-style empty-string-to-null conversion happens at the
-- Server Action layer, not here).
--
-- No RLS or grant changes needed: profiles_select_authenticated already
-- allows any authenticated user to read every column on a profile row
-- (including this one), and profiles_update_self + the existing
-- `grant update on table public.profiles` (whole-table, not
-- column-restricted, unlike group_members' read-state column) already
-- let a user update their own row's columns, this one included.

alter table public.profiles add column contact_email text;
