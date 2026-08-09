-- StudyBuddy materials: uploader-only delete
--
-- Product rule: only the person who originally uploaded a material may
-- delete it. Being the group owner does NOT grant delete permission
-- over another member's material.
--
-- The original materials_delete_uploader_or_owner policy (M1) allowed
-- `uploaded_by = auth.uid() OR is_group_owner(group_id)` -- the owner
-- clause contradicts this product rule, so it's removed here rather
-- than kept and merely bypassed at the application layer. Replaced
-- (not altered) so the policy is renamed too -- keeping the old name
-- with the "or_owner" now untrue would be misleading to future readers.
--
-- The Storage DELETE policy (materials_bucket_delete_own, owner =
-- auth.uid()) already matches this rule exactly and needs no change.

drop policy "materials_delete_uploader_or_owner" on public.materials;

create policy "materials_delete_uploader_only"
  on public.materials for delete
  to authenticated
  using (uploaded_by = auth.uid());
