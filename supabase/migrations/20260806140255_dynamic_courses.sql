-- StudyBuddy dynamic course creation
--
-- Reworks `courses` from a pre-seeded institution catalog (deduped by an
-- official course_code) into a table students populate organically when
-- creating groups: type a course name, get case-insensitive suggestions
-- scoped to their own institution/faculty, or create a new one if nothing
-- matches. course_id/groups.course_id and the courses table itself are
-- otherwise unchanged, so existing search/recommendation queries keep
-- working against the same relationship.
--
-- The 6 seeded courses (and anything from manual testing) predate the
-- institution column and are cleared here; supabase/seed.sql has been
-- rewritten with fresh rows carrying an institution value. No group can
-- reference them yet (group creation isn't built until M4), so this
-- delete is safe -- if it weren't, the FK from groups.course_id
-- (ON DELETE RESTRICT) would abort this migration rather than silently
-- orphan a group.

delete from public.courses;

-- course_code no longer has a source of truth (no more official catalog),
-- so it's kept as an optional field rather than dropped outright.
alter table public.courses alter column course_code drop not null;
alter table public.courses drop constraint courses_course_code_key;

alter table public.courses add column institution text not null;

-- Replaces the old course_code-based uniqueness. Case-insensitive and
-- scoped per institution+faculty, so e.g. "Intro to Psychology" can
-- legitimately exist as separate rows at two different institutions, but
-- not twice at the same one. This same index also serves the typeahead
-- suggestion query efficiently (equality on institution/faculty + prefix
-- match on lower(course_name)).
create unique index courses_unique_name_ci
  on public.courses (institution, faculty, lower(course_name));

-- courses previously had no INSERT policy at all (pure admin-managed
-- reference data). Dynamic creation needs one. Scoped to the creating
-- user's own institution AND faculty (both, for consistency with how
-- suggestions themselves are scoped) so users can't populate course rows
-- for institutions/faculties they're not part of.
create policy "courses_insert_own_institution_faculty"
  on public.courses for insert
  to authenticated
  with check (
    institution = (
      select institution from public.profiles where id = auth.uid()
    )
    and faculty = (
      select faculty from public.profiles where id = auth.uid()
    )
  );

grant insert on table public.courses to authenticated;
