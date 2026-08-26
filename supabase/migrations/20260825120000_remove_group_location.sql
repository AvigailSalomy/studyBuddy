-- StudyBuddy: remove groups.location_or_link
--
-- A group can have multiple meetings, and each meeting already has its
-- own location_or_link (initial_schema.sql, made optional in
-- meetings_location_optional.sql). Keeping a second, group-level
-- location_or_link (added in group_location.sql) was redundant with
-- that and could drift out of sync with the group's actual meetings --
-- product decision to drop it and rely on meetings.location_or_link
-- exclusively.
--
-- No FK, no index, no column-specific RLS/grant reference this column,
-- so nothing else needs to change as a result of dropping it.

alter table public.groups drop column location_or_link;
