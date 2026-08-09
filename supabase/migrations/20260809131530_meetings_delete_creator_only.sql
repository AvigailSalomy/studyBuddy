-- StudyBuddy meetings: creator-only delete
--
-- Product rule: only the user who created a meeting may delete it.
-- Being the group owner does NOT grant delete permission on its own --
-- same rule, same fix shape, as materials_delete_uploader_only and
-- tasks_delete_creator_only.
--
-- The original meetings_delete_creator_or_owner policy (M1) allowed
-- `created_by = auth.uid() OR is_group_owner(group_id)` -- the owner
-- clause contradicts this product rule, so it's replaced (not merely
-- bypassed at the application layer). Renamed, not just altered, so the
-- policy name doesn't keep implying "or owner" once that's no longer
-- true.
--
-- meetings_update_creator_or_owner is left untouched: no editing
-- capability is being built in this milestone, so that policy remains
-- unused, same as it's been since M1.

drop policy "meetings_delete_creator_or_owner" on public.meetings;

create policy "meetings_delete_creator_only"
  on public.meetings for delete
  to authenticated
  using (created_by = auth.uid());
