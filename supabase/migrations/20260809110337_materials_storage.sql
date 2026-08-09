-- StudyBuddy materials storage
--
-- The `materials` table (M1) already has everything needed for this
-- feature -- group_id, uploaded_by, file_name, storage_path, category,
-- file_size, created_at, with RLS/grants already correct. No table
-- changes here.
--
-- What's actually missing: no Supabase Storage bucket has ever been
-- created in this project, and storage.objects has zero policies. A
-- private bucket denies all client access by default until policies
-- exist, so without this migration no file could be uploaded or
-- downloaded at all, independent of the materials table.
--
-- Access is scoped by reusing the existing public.is_group_member()
-- function (already used by the materials/chat/meetings/tasks table
-- policies) against the group id embedded as the first path segment of
-- the object name (files are stored as <groupId>/<unique-file-name>) --
-- same authorization rule as the table, just applied to Storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  20971520, -- 20MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do nothing;

create policy "materials_bucket_select_members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'materials'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

create policy "materials_bucket_insert_members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'materials'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

-- No update/delete storage policy: this task's scope is upload +
-- list/view only. The materials table's own delete policy
-- (materials_delete_uploader_or_owner) already exists, unused, for
-- whenever delete is actually implemented.
