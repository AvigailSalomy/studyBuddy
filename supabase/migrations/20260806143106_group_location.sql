-- StudyBuddy groups.location_or_link
--
-- Group cards need to show where/how a group meets. No prior document
-- specified this as a group-level field (only `meetings` has
-- location_or_link) -- this mirrors that existing column name/shape for
-- consistency rather than inventing a new naming convention. Nullable:
-- a group may not have settled on a location/link yet.
--
-- No RLS/grant changes needed; existing groups policies and grants
-- already cover the whole row, not specific columns.

alter table public.groups add column location_or_link text;
