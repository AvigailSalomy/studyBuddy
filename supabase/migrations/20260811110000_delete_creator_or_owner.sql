-- StudyBuddy: consistent creator/uploader-or-owner delete rule
--
-- Materials, Tasks, and Meetings all had the identical lifecycle bug:
-- their DELETE policy was `(creator/uploader = auth.uid()) AND
-- is_group_member(group_id)` with no owner bypass, so once the person
-- who created/uploaded something left the group, that content became
-- permanently undeletable by anyone -- including the group owner.
--
-- New rule, identical shape across all four policies below: the
-- creator/uploader may still delete their own content, but only while
-- still a current member (unchanged from before) -- OR the group owner
-- may delete it regardless of who created/uploaded it or whether that
-- person is still around. Ordinary members still can't touch each
-- other's content: there is no member-wide branch, only "self AND
-- member" OR "owner".
--
-- Deliberately delete-only: UPDATE policies (e.g.
-- meetings_update_creator_only) are untouched -- editing stays
-- creator-only, not extended to the owner, per explicit scope.
--
-- All four renamed (not edited in place): "_only"/"_own" no longer
-- accurately describes what's allowed once an owner branch exists.

drop policy "materials_delete_uploader_only" on public.materials;

create policy "materials_delete_uploader_or_owner"
  on public.materials for delete
  to authenticated
  using (
    (uploaded_by = auth.uid() and public.is_group_member(group_id))
    or public.is_group_owner(group_id)
  );

drop policy "tasks_delete_creator_only" on public.tasks;

create policy "tasks_delete_creator_or_owner"
  on public.tasks for delete
  to authenticated
  using (
    (created_by = auth.uid() and public.is_group_member(group_id))
    or public.is_group_owner(group_id)
  );

drop policy "meetings_delete_creator_only" on public.meetings;

create policy "meetings_delete_creator_or_owner"
  on public.meetings for delete
  to authenticated
  using (
    (created_by = auth.uid() and public.is_group_member(group_id))
    or public.is_group_owner(group_id)
  );

-- Storage: same rule, group id derived from the object path exactly as
-- materials_bucket_select_members / materials_bucket_insert_members
-- already do -- so the table row and the Storage object stay
-- authorized by the same actor set, never able to drift apart (e.g. a
-- table row deletable but its file stranded, or vice versa).

drop policy "materials_bucket_delete_own" on storage.objects;

create policy "materials_bucket_delete_uploader_or_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materials'
    and (
      (owner = auth.uid() and public.is_group_member(((storage.foldername(name))[1])::uuid))
      or public.is_group_owner(((storage.foldername(name))[1])::uuid)
    )
  );
