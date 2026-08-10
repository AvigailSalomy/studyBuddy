-- StudyBuddy pre-deployment audit fixes
--
-- Two independent, narrowing-only fixes found during a pre-launch
-- security audit. Neither touches application behavior for anyone who
-- is currently authorized to do what they're already doing.

-- ---------------------------------------------------------------------
-- 1. materials Storage: delete requires *current* group membership too,
--    not just object ownership.
--
--    Path structure (confirmed against the original materials_storage
--    migration and actions/materials.ts, not assumed): objects are
--    stored as `<groupId>/<unique-file-name>`, and
--    materials_bucket_select_members / materials_bucket_insert_members
--    both already derive the group id the same way --
--    `((storage.foldername(name))[1])::uuid` -- and gate on
--    public.is_group_member() against it. materials_bucket_delete_own
--    was the one policy that never got this: it was originally added
--    only to support finalizeMaterialUpload's rollback-on-failed-insert
--    path (where membership was already guaranteed a moment earlier),
--    but it's also the only DELETE policy this bucket has, so it's what
--    actually gates the real deleteMaterial user action too.
--
--    Net effect before this fix: a user who uploaded a file and later
--    left the group could still delete the Storage object itself
--    (`owner = auth.uid()` alone doesn't check membership), even though
--    materials_delete_uploader_only already blocks deleting the
--    corresponding table row for the same reason. That's a real gap --
--    the file's bytes could be permanently destroyed by someone no
--    longer authorized to touch the group's materials at all, contrary
--    to "leaving preserves historical content."
--
--    Fix mirrors materials_delete_uploader_only's own fix exactly: add
--    the same membership check already used by this bucket's other two
--    policies. Anyone currently a member and the uploader is completely
--    unaffected -- this only changes behavior for a former member.
-- ---------------------------------------------------------------------

drop policy "materials_bucket_delete_own" on storage.objects;

create policy "materials_bucket_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materials'
    and owner = auth.uid()
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------
-- 2. Four helper/RPC functions still carried Postgres's default EXECUTE
--    grant to PUBLIC (never explicitly revoked when they were created),
--    inconsistent with this project's stated design that anon has zero
--    access anywhere else.
--
--    is_group_member / is_group_owner: harmless as anon in practice
--    (auth.uid() is null, always returns false) -- tightened for
--    consistency, not because of an active leak.
--
--    unread_chat_summary: also harmless as anon (auth.uid() is null,
--    every row's join condition fails, empty result) -- same reasoning.
--
--    group_member_counts: the one with real, if minor, exposure -- it's
--    security definer with no internal auth check, so an unauthenticated
--    caller who already has/guesses a group id could get its member
--    count without ever logging in. Low severity (an authenticated
--    non-member can already see the same number legitimately through
--    the app), but worth closing for defense in depth.
--
--    All four are already used exclusively by `authenticated`-role RLS
--    policies and Server Component .rpc() calls, so re-granting to
--    authenticated explicitly (rather than relying on the PUBLIC
--    default) changes nothing for any currently-working path.
-- ---------------------------------------------------------------------

revoke execute on function public.is_group_member(uuid) from public;
revoke execute on function public.is_group_owner(uuid) from public;
revoke execute on function public.group_member_counts(uuid[]) from public;
revoke execute on function public.unread_chat_summary() from public;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.group_member_counts(uuid[]) to authenticated;
grant execute on function public.unread_chat_summary() to authenticated;
