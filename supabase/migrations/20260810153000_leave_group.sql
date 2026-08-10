-- StudyBuddy: Leave Group
--
-- Two independent RLS changes, both narrowing (never widening) existing
-- policies, both required for this feature's stated security rules.
--
-- ---------------------------------------------------------------------
-- 1. group_members: a member may already delete their own row today
--    (group_members_delete_self_or_owner's `profile_id = auth.uid()`
--    branch) -- that part needs no change at all, it's reused as-is for
--    "leave". But that same branch would, today, also let the OWNER
--    delete their OWN row (nothing distinguishes "member leaving their
--    own row" from "owner leaving their own row" -- both are just
--    `profile_id = auth.uid()`), which must never be allowed: it would
--    leave the group ownerless, and ownership transfer isn't built.
--
--    The guard added below (`profile_id <> the group's owner_id`)
--    blocks deleting the OWNER's row specifically, through *either*
--    existing branch -- not just the self-leave path, but also the
--    anticipated-but-not-yet-built "owner removes another member" path
--    (the OR is_group_owner(group_id) branch), which stays intact for
--    a future milestone. A member leaving their own (non-owner) row,
--    or an owner removing someone else's row, are both unaffected.
--
--    groups is openly readable (groups_select_authenticated using
--    (true)), so this subquery needs no security-definer bypass.
-- ---------------------------------------------------------------------

drop policy "group_members_delete_self_or_owner" on public.group_members;

create policy "group_members_delete_self_or_owner"
  on public.group_members for delete
  to authenticated
  using (
    profile_id <> (
      select owner_id from public.groups where id = group_members.group_id
    )
    and (profile_id = auth.uid() or public.is_group_owner(group_id))
  );

-- ---------------------------------------------------------------------
-- 2. materials/tasks/meetings: "creator/uploader can delete (and, for
--    meetings, edit) their own content" was never also conditioned on
--    *current* membership -- so today, a former member who has left a
--    group could still delete a material they uploaded, a task they
--    created, or a meeting they created/edited, purely because
--    uploaded_by/created_by still matches their own id. That's a real
--    gap against this feature's own requirement ("after the user
--    leaves, they should no longer be able to edit/delete member-only
--    content merely because they originally created it").
--
--    Adding `is_group_member(group_id)` to each closes it. For anyone
--    who is still actually a member (the overwhelmingly common case),
--    this changes nothing -- it's already true for them. It only takes
--    effect for someone who has left.
--
--    tasks_update_members and chat_messages are untouched: task status
--    updates are already correctly membership-gated
--    (tasks_update_members using is_group_member(group_id), not
--    created_by), and chat_messages has no update/delete policy at all
--    to begin with (append-only by design already).
-- ---------------------------------------------------------------------

drop policy "materials_delete_uploader_only" on public.materials;

create policy "materials_delete_uploader_only"
  on public.materials for delete
  to authenticated
  using (uploaded_by = auth.uid() and public.is_group_member(group_id));

drop policy "tasks_delete_creator_only" on public.tasks;

create policy "tasks_delete_creator_only"
  on public.tasks for delete
  to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id));

drop policy "meetings_delete_creator_only" on public.meetings;

create policy "meetings_delete_creator_only"
  on public.meetings for delete
  to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id));

drop policy "meetings_update_creator_only" on public.meetings;

create policy "meetings_update_creator_only"
  on public.meetings for update
  to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id))
  with check (created_by = auth.uid() and public.is_group_member(group_id));
