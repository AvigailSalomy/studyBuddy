"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

export async function requestToJoin(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("profile_id")
    .eq("group_id", groupId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return { success: false, error: "You're already a member of this group." };
  }

  const { error } = await supabase.from("join_requests").insert({
    group_id: groupId,
    profile_id: user.id,
    status: "pending",
  });

  if (error) {
    // The partial unique index (group_id, profile_id) WHERE
    // status = 'pending' is what actually enforces "no duplicate
    // pending request" -- this is a fallback for a race (e.g. a second
    // tab) rather than the primary check, since the UI already hides
    // the button once a pending request exists.
    if (error.code === "23505") {
      return {
        success: false,
        error: "You already have a pending request for this group.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function approveJoinRequest(
  requestId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: request, error: requestError } = await supabase
    .from("join_requests")
    .select("id, group_id, profile_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return { success: false, error: requestError.message };
  }

  if (!request) {
    return { success: false, error: "This request no longer exists." };
  }

  if (request.status !== "pending") {
    return { success: false, error: "This request is no longer pending." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id, max_members")
    .eq("id", request.group_id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      success: false,
      error: groupError?.message ?? "Group not found.",
    };
  }

  if (group.owner_id !== user.id) {
    return {
      success: false,
      error: "You don't have permission to approve this request.",
    };
  }

  const { count: memberCount, error: countError } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", request.group_id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (memberCount !== null && memberCount >= group.max_members) {
    return { success: false, error: "This group is already full." };
  }

  // group_members insert first, join_requests status update second: if
  // the insert fails, nothing has changed and the request correctly
  // stays pending. Marking a request "approved" before membership
  // actually exists would risk a request showing approved with no
  // matching member row if the second write failed -- no
  // multi-statement transaction is available via supabase-js, same
  // constraint noted throughout this project's other multi-step writes.
  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: request.group_id,
    profile_id: request.profile_id,
    role: "member",
  });

  if (memberError && memberError.code !== "23505") {
    return { success: false, error: memberError.message };
  }
  // 23505 means they're already a member somehow (e.g. approved twice
  // in a race) -- treat as fine and still clear the pending request
  // below, rather than leaving a stale pending request for someone
  // who's already in.

  const { error: statusError } = await supabase
    .from("join_requests")
    .update({ status: "approved" })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  revalidatePath(`/groups/${request.group_id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectJoinRequest(
  requestId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: request, error: requestError } = await supabase
    .from("join_requests")
    .select("id, group_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return { success: false, error: requestError.message };
  }

  if (!request) {
    return { success: false, error: "This request no longer exists." };
  }

  if (request.status !== "pending") {
    return { success: false, error: "This request is no longer pending." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", request.group_id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      success: false,
      error: groupError?.message ?? "Group not found.",
    };
  }

  if (group.owner_id !== user.id) {
    return {
      success: false,
      error: "You don't have permission to reject this request.",
    };
  }

  const { error: statusError } = await supabase
    .from("join_requests")
    .update({ status: "rejected" })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  revalidatePath(`/groups/${request.group_id}`);
  return { success: true };
}
