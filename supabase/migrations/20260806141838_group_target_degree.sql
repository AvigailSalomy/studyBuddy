-- StudyBuddy groups.target_degree
--
-- Adds a degree filter dimension to groups, mirroring the existing
-- nullable target_year column. Courses stay scoped to (institution,
-- faculty) only (Model 1, confirmed) -- degree and study_year are
-- attributes of the GROUP being created (defaulted from the creator's
-- own profile, editable), not of the course itself, so the same course
-- stays shared across every degree/year that studies it rather than
-- fragmenting into near-duplicate rows per degree/year combination.
--
-- No new index: same reasoning as target_year in the M1 indexes
-- migration -- low-cardinality filter columns aren't worth a dedicated
-- index at this project's scale. No RLS/grant changes needed either;
-- the existing groups policies and grants already cover all columns on
-- the row, not specific ones.

alter table public.groups add column target_degree text;
