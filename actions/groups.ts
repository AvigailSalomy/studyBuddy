"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { groupSchema, type GroupInput } from "@/schemas/groups";

type ActionResult =
  | { success: true; groupId: string }
  | { success: false; error: string };

type LeaveResult = { success: true } | { success: false; error: string };
type DeleteResult = { success: true } | { success: false; error: string };

// Both createGroup and updateGroup parse a GroupInput this same way, so
// the shape/target-year handling is factored out rather than duplicated.
function parseGroupInput(input: GroupInput) {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { targetYear, ...rest } = parsed.data;

  let targetYearNumber: number | null = null;
  if (targetYear.length > 0) {
    const parsedYear = Number(targetYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 8) {
      return {
        ok: false as const,
        error: "Target year must be between 1 and 8.",
      };
    }
    targetYearNumber = parsedYear;
  }

  return { ok: true as const, ...rest, targetYearNumber };
}

export async function createGroup(input: GroupInput): Promise<ActionResult> {
  const parsed = parseGroupInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // Two sequential inserts, no multi-statement transaction available via
  // supabase-js -- same pattern already used for completeProfile. RLS
  // covers this correctly: groups_insert_own checks owner_id = auth.uid()
  // (satisfied here), and group_members_insert_by_owner checks
  // is_group_owner(group_id), which becomes true as soon as the groups
  // row above is committed, before this second insert runs.
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: parsed.name,
      description: parsed.description.length > 0 ? parsed.description : null,
      group_type: parsed.groupType,
      course_id: parsed.courseId,
      target_degree:
        parsed.targetDegree.length > 0 ? parsed.targetDegree : null,
      target_year: parsed.targetYearNumber,
      max_members: parsed.maxMembers,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (groupError || !group) {
    return {
      success: false,
      error: groupError?.message ?? "Failed to create group.",
    };
  }

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    profile_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  revalidatePath("/dashboard");
  return { success: true, groupId: group.id };
}

export async function updateGroup(
  groupId: string,
  input: GroupInput,
): Promise<ActionResult> {
  const parsed = parseGroupInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // max_members can't reference group_members' row count via a plain
  // CHECK constraint (Postgres CHECK constraints can't query other
  // tables), so this is enforced here instead -- consistent with how
  // other cross-table rules in this app (e.g. duplicate join requests)
  // are handled at the Server Action layer, not via triggers.
  const { count: memberCount, error: countError } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (memberCount !== null && parsed.maxMembers < memberCount) {
    return {
      success: false,
      error: `Max members can't be less than the current member count (${memberCount}).`,
    };
  }

  // .eq("owner_id", user.id) is redundant with the groups_update_owner
  // RLS policy, but kept explicit as defense in depth -- it also lets us
  // detect "not actually updated" below via .single() failing, rather
  // than silently reporting success on a no-op update.
  const { data: updated, error: updateError } = await supabase
    .from("groups")
    .update({
      name: parsed.name,
      description: parsed.description.length > 0 ? parsed.description : null,
      group_type: parsed.groupType,
      course_id: parsed.courseId,
      target_degree:
        parsed.targetDegree.length > 0 ? parsed.targetDegree : null,
      target_year: parsed.targetYearNumber,
      max_members: parsed.maxMembers,
    })
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error:
        updateError?.message ??
        "You don't have permission to edit this group.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return { success: true, groupId };
}

// Regular members only -- the owner must never be able to leave (it
// would make the group ownerless; ownership transfer isn't built).
// This check is a clear, early error for the normal path -- the actual,
// unbypassable enforcement is the database-level guard added to
// group_members_delete_self_or_owner (the leave_group migration): that
// policy rejects deleting the owner's own row no matter how the
// request is made, not just through this action.
export async function leaveGroup(groupId: string): Promise<LeaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) {
    return { success: false, error: groupError.message };
  }

  if (!group) {
    return { success: false, error: "Group not found." };
  }

  if (group.owner_id === user.id) {
    return {
      success: false,
      error:
        "As the owner, you can't leave this group. Ownership transfer isn't available yet.",
    };
  }

  // group_id + profile_id = auth.uid() together are exactly what RLS
  // requires too -- redundant with it, kept explicit as defense in
  // depth and so this table is never asked to delete a row it wasn't
  // told the caller actually owns.
  const { data: left, error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", user.id)
    .select("group_id")
    .single();

  if (deleteError || !left) {
    return {
      success: false,
      error: deleteError?.message ?? "You're not a member of this group.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// Owner-only, irreversible. group_members/join_requests/materials/
// chat_messages/meetings/tasks all cascade-delete at the DB level once
// the groups row is gone (ON DELETE CASCADE on group_id, see
// initial_schema.sql) -- but that cascade never touches Supabase
// Storage, which is a separate system with no FK to public.materials.
// So Storage objects must be removed first, while the group row (and
// therefore is_group_owner()) still exists to authorize it: the
// materials_bucket_delete_uploader_or_owner policy checks
// is_group_owner(groupId) by looking up public.groups, which would
// stop resolving the instant the group row is deleted. Deleting the
// group row first would strand the files with no permission path left
// to ever clean them up. If Storage cleanup fails, the group row is
// deliberately left intact rather than risking orphaned files.
export async function deleteGroup(groupId: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) {
    return { success: false, error: groupError.message };
  }

  if (!group) {
    return { success: false, error: "Group not found." };
  }

  if (group.owner_id !== user.id) {
    return {
      success: false,
      error: "Only the group owner can delete this group.",
    };
  }

  const { data: files, error: listError } = await supabase.storage
    .from("materials")
    .list(groupId, { limit: 1000 });

  if (listError) {
    return { success: false, error: listError.message };
  }

  if (files && files.length > 0) {
    const paths = files.map((file) => `${groupId}/${file.name}`);
    const { error: removeError } = await supabase.storage
      .from("materials")
      .remove(paths);

    if (removeError) {
      return { success: false, error: removeError.message };
    }
  }

  // .eq("owner_id", user.id) is redundant with the groups_delete_owner
  // RLS policy, but kept explicit as defense in depth -- same pattern
  // as updateGroup/leaveGroup above.
  const { data: deleted, error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (deleteError || !deleted) {
    return {
      success: false,
      error:
        deleteError?.message ??
        "You don't have permission to delete this group.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
