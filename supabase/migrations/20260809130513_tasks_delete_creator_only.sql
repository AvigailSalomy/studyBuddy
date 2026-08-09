-- StudyBuddy tasks: creator-only delete
--
-- Product rule: only the user who originally created a task may delete
-- it. Being the assignee or the group owner does NOT grant delete
-- permission on its own -- same rule, same fix shape, as the earlier
-- materials_delete_uploader_only change.
--
-- The original tasks_delete_creator_or_owner policy (M1) allowed
-- `created_by = auth.uid() OR is_group_owner(group_id)` -- the owner
-- clause contradicts this product rule, so it's replaced (not merely
-- bypassed at the application layer). Renamed, not just altered, so the
-- policy name doesn't keep implying "or owner" once that's no longer
-- true.

drop policy "tasks_delete_creator_or_owner" on public.tasks;

create policy "tasks_delete_creator_only"
  on public.tasks for delete
  to authenticated
  using (created_by = auth.uid());
