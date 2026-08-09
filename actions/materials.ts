"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  materialUploadSchema,
  MAX_MATERIAL_FILE_SIZE,
  ALLOWED_MATERIAL_MIME_TYPES,
  ALLOWED_MATERIAL_EXTENSIONS,
} from "@/schemas/materials";

type ActionResult = { success: true } | { success: false; error: string };
type PrepareResult =
  | { success: true; path: string; token: string }
  | { success: false; error: string };
type DownloadResult =
  | { success: true; url: string }
  | { success: false; error: string };

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

// Storage path segment only -- the original name is preserved separately
// in materials.file_name for display.
function sanitizeFileNameForPath(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .slice(-100);
}

async function isGroupMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("group_members")
    .select("profile_id")
    .eq("group_id", groupId)
    .eq("profile_id", userId)
    .maybeSingle();
  return data !== null;
}

function validateFileMeta(
  fileName: string,
  fileSize: number,
  mimeType: string,
): string | null {
  if (fileSize <= 0) return "Choose a file to upload.";
  if (fileSize > MAX_MATERIAL_FILE_SIZE) return "File is too large (max 20MB).";

  // Browsers don't always set file.type reliably (some OS/file-type
  // combinations report an empty string), so a file is accepted if
  // either its declared MIME type or its extension is on the
  // allow-list, and rejected only if neither is. This is a first-layer,
  // fast-feedback check -- the bucket's own file_size_limit and
  // allowed_mime_types remain the authoritative second layer against
  // the actual uploaded bytes.
  const extension = getExtension(fileName);
  const mimeOk = (ALLOWED_MATERIAL_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
  const extensionOk = (
    ALLOWED_MATERIAL_EXTENSIONS as readonly string[]
  ).includes(extension);

  if (!mimeOk && !extensionOk) return "That file type isn't supported.";

  return null;
}

// Step 1 of the direct-upload flow: validates everything that can be
// checked before any bytes are sent, generates the storage path
// server-side, and mints a signed upload token scoped to that exact
// path. createSignedUploadUrl itself requires `objects: insert` RLS
// permission at creation time (materials_bucket_insert_members,
// unchanged) -- so a non-member can't obtain a token for a path in a
// group they don't belong to even if the explicit check below were
// somehow bypassed. The browser then uploads using this token, which
// only works for this exact path -- it cannot be redirected to a
// different one.
export async function prepareMaterialUpload(
  groupId: string,
  title: string,
  category: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<PrepareResult> {
  const parsed = materialUploadSchema.safeParse({ title, category });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const fileError = validateFileMeta(fileName, fileSize, mimeType);
  if (fileError) {
    return { success: false, error: fileError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!(await isGroupMember(supabase, groupId, user.id))) {
    return {
      success: false,
      error: "You must be a member of this group to upload materials.",
    };
  }

  const storagePath = `${groupId}/${crypto.randomUUID()}-${sanitizeFileNameForPath(fileName)}`;

  const { data: signed, error: signError } = await supabase.storage
    .from("materials")
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) {
    return {
      success: false,
      error: signError?.message ?? "Couldn't prepare the upload.",
    };
  }

  return { success: true, path: signed.path, token: signed.token };
}

// Step 2: called after the browser has uploaded directly to Storage
// using the token from prepareMaterialUpload. Re-checks everything
// rather than trusting the client's account of what happened --
// including confirming the object actually exists at `path` before any
// metadata is written, and using Storage's own recorded file size
// rather than whatever the client claims.
export async function finalizeMaterialUpload(
  groupId: string,
  path: string,
  title: string,
  category: string,
  fileName: string,
): Promise<ActionResult> {
  const parsed = materialUploadSchema.safeParse({ title, category });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Path/group consistency: the claimed groupId must actually match the
  // group segment embedded in the path, not just be asserted.
  if (!path.startsWith(`${groupId}/`)) {
    return {
      success: false,
      error: "Upload path does not match the requested group.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!(await isGroupMember(supabase, groupId, user.id))) {
    return {
      success: false,
      error: "You must be a member of this group to upload materials.",
    };
  }

  const lastSlash = path.lastIndexOf("/");
  const folder = path.slice(0, lastSlash);
  const objectName = path.slice(lastSlash + 1);

  const { data: listing, error: listError } = await supabase.storage
    .from("materials")
    .list(folder, { search: objectName });

  if (listError) {
    return { success: false, error: listError.message };
  }

  const uploadedObject = listing?.find((entry) => entry.name === objectName);
  if (!uploadedObject || uploadedObject.metadata?.size == null) {
    return { success: false, error: "Uploaded file not found. Please try again." };
  }

  const actualFileSize = uploadedObject.metadata.size;
  if (actualFileSize <= 0 || actualFileSize > MAX_MATERIAL_FILE_SIZE) {
    return { success: false, error: "Invalid uploaded file size." };
  }

  const { error: insertError } = await supabase.from("materials").insert({
    group_id: groupId,
    uploaded_by: user.id,
    title: parsed.data.title,
    file_name: fileName,
    storage_path: path,
    category: parsed.data.category,
    file_size: actualFileSize,
  });

  if (insertError) {
    // Roll back the just-uploaded file so a failed metadata write
    // doesn't leave an orphaned object in Storage. Requires the new
    // materials_bucket_delete_own policy (owner = auth.uid()).
    await supabase.storage.from("materials").remove([path]);
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function getMaterialDownloadUrl(
  materialId: string,
): Promise<DownloadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // materials_select_members RLS means a non-member's query for this id
  // returns zero rows (not an error) -- so "not found" here also covers
  // "not authorized to see it", without leaking which is which.
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("storage_path")
    .eq("id", materialId)
    .maybeSingle();

  if (materialError) {
    return { success: false, error: materialError.message };
  }

  if (!material) {
    return {
      success: false,
      error: "Material not found, or you don't have access to it.",
    };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("materials")
    .createSignedUrl(material.storage_path, 60);

  if (signError || !signed) {
    return {
      success: false,
      error: signError?.message ?? "Couldn't generate a download link.",
    };
  }

  return { success: true, url: signed.signedUrl };
}

// Product rule: only the original uploader may delete a material --
// being the group owner does not grant this on its own. The button
// that calls this is only shown to the uploader, but that's a UI
// convenience, not the authorization boundary: this re-checks
// ownership itself (both explicitly, and via the uploader-only DELETE
// RLS policy on both the table and the storage bucket), so calling this
// directly as anyone else fails regardless of what the client sends.
export async function deleteMaterial(materialId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("group_id, uploaded_by, storage_path")
    .eq("id", materialId)
    .maybeSingle();

  if (materialError) {
    return { success: false, error: materialError.message };
  }

  if (!material) {
    return {
      success: false,
      error: "Material not found, or you don't have access to it.",
    };
  }

  if (material.uploaded_by !== user.id) {
    return {
      success: false,
      error: "Only the person who uploaded this material can delete it.",
    };
  }

  // Storage first: if this fails, the DB row is left in place and the
  // error is surfaced -- never delete the metadata for a file that's
  // still sitting in Storage.
  const { error: removeError } = await supabase.storage
    .from("materials")
    .remove([material.storage_path]);

  if (removeError) {
    return { success: false, error: removeError.message };
  }

  const { error: deleteError } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("uploaded_by", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath(`/groups/${material.group_id}`);
  return { success: true };
}
