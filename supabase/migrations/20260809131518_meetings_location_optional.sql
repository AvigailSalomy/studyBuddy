-- StudyBuddy meetings.location_or_link: make optional
--
-- The Meetings product rule requires location/link to be optional (a
-- meeting can exist before a location or link has been settled), but
-- the M1 schema had it NOT NULL. Every other field the feature needs
-- (title, meeting_time, created_by) already exists and is unaffected.
--
-- No RLS/grant changes: meetings_insert_members doesn't reference this
-- column specifically, so relaxing its nullability doesn't touch
-- authorization at all.

alter table public.meetings alter column location_or_link drop not null;
