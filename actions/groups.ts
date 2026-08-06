"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { groupSchema, type GroupInput } from "@/schemas/groups";

type ActionResult =
  | { success: true; groupId: string }
  | { success: false; error: string };

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
      location_or_link:
        parsed.locationOrLink.length > 0 ? parsed.locationOrLink : null,
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
      location_or_link:
        parsed.locationOrLink.length > 0 ? parsed.locationOrLink : null,
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
