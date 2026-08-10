-- StudyBuddy: Meetings Edit matches Delete (creator-or-owner)
--
-- meetings_delete_creator_or_owner already allows the creator (while a
-- current member) or the group owner to delete a meeting. UPDATE
-- (Edit) was left at creator-only, so the same lifecycle gap the
-- delete-side fix closed still existed for editing: a departed
-- creator's meeting became permanently un-editable by anyone,
-- including the owner. This brings UPDATE in line with DELETE --
-- identical shape, Meetings only. Tasks/Materials Edit are untouched
-- (Task status updates stay member-wide via tasks_update_members,
-- unrelated to this; Materials has no update policy at all).

drop policy "meetings_update_creator_only" on public.meetings;

create policy "meetings_update_creator_or_owner"
  on public.meetings for update
  to authenticated
  using (
    (created_by = auth.uid() and public.is_group_member(group_id))
    or public.is_group_owner(group_id)
  )
  with check (
    (created_by = auth.uid() and public.is_group_member(group_id))
    or public.is_group_owner(group_id)
  );
