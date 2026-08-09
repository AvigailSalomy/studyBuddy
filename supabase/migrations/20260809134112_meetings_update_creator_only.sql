-- StudyBuddy meetings: creator-only update
--
-- Product rule: only the user who created a meeting may edit its
-- details. Being the group owner does NOT grant edit permission on its
-- own.
--
-- Unlike tasks_update_members (kept broad, member-wide, because
-- updateTaskStatus genuinely needs every member to write to that same
-- table), meetings has no equivalent "every member can touch this"
-- operation -- nothing else needs member-wide UPDATE access here. So
-- this policy is narrowed to match the real rule directly, rather than
-- staying broad and relying solely on the application layer, same fix
-- shape as the creator-only DELETE policies already applied to
-- materials/tasks/meetings.
--
-- The original meetings_update_creator_or_owner policy (M1) allowed
-- `created_by = auth.uid() OR is_group_owner(group_id)` in both USING
-- and WITH CHECK -- the owner clause contradicts this product rule, so
-- it's replaced (not merely bypassed at the application layer).
-- Renamed, not just altered, so the policy name doesn't keep implying
-- "or owner" once that's no longer true.

drop policy "meetings_update_creator_or_owner" on public.meetings;

create policy "meetings_update_creator_only"
  on public.meetings for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
