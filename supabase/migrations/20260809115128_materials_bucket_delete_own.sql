-- StudyBuddy materials bucket: delete-own-object policy
--
-- The direct-upload refactor moves the actual file upload to the
-- browser (via a signed upload token), which means orphan cleanup on a
-- failed metadata write now has to run as a real DELETE against
-- storage.objects (from finalizeMaterialUpload, server-side, using the
-- uploader's own session) -- and no DELETE policy exists yet for this
-- bucket (the original materials_storage migration deliberately scoped
-- to upload + list/view only).
--
-- This is infrastructure for that automatic rollback path, not a
-- user-facing delete feature -- there is still no delete UI anywhere in
-- the product. Scoped as narrowly as possible: `owner` is a column
-- Supabase Storage sets automatically to the uploader's auth.uid() at
-- upload time, so this only ever lets someone delete an object they
-- themselves just uploaded.

create policy "materials_bucket_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materials'
    and owner = auth.uid()
  );
