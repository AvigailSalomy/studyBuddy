"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  taskDetailsSchema,
  taskStatusSchema,
  type TaskDetailsInput,
} from "@/schemas/tasks";

type ActionResult = { success: true } | { success: false; error: string };

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

// Shared by createTask and updateTaskDetails -- both validate and
// resolve the exact same field set against the same group. Re-verifies
// the assignee's membership itself (never trusts the client) and
// rejects a past due date; neither check is expressible as a static
// Zod rule since both depend on runtime state (the group's current
// roster, "now").
async function parseTaskDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  input: TaskDetailsInput,
) {
  const parsed = taskDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { title, description, assigneeId, dueDate } = parsed.data;

  let dueDateValue: string | null = null;
  if (dueDate.length > 0) {
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return { ok: false as const, error: "Invalid due date." };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return { ok: false as const, error: "Due date can't be in the past." };
    }
    dueDateValue = dueDate;
  }

  let assigneeIdValue: string | null = null;
  if (assigneeId.length > 0) {
    if (!(await isGroupMember(supabase, groupId, assigneeId))) {
      return {
        ok: false as const,
        error: "Selected assignee is not a member of this group.",
      };
    }
    assigneeIdValue = assigneeId;
  }

  return {
    ok: true as const,
    title,
    description: description.length > 0 ? description : null,
    assigneeIdValue,
    dueDateValue,
  };
}

export async function createTask(
  groupId: string,
  input: TaskDetailsInput,
): Promise<ActionResult> {
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
      error: "You must be a member of this group to create tasks.",
    };
  }

  const parsed = await parseTaskDetails(supabase, groupId, input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const { error: insertError } = await supabase.from("tasks").insert({
    group_id: groupId,
    created_by: user.id,
    assignee_id: parsed.assigneeIdValue,
    title: parsed.title,
    description: parsed.description,
    due_date: parsed.dueDateValue,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// Product rule: only the original creator may edit a task's details --
// being the assignee or the group owner does not grant this on its own,
// same as delete. tasks_update_members (RLS) permits any member to
// update any column, but this action re-checks created_by explicitly
// and is the only write surface for these fields, so the actual
// exposed capability is narrower than what RLS alone would allow --
// same split already used by updateTaskStatus for the opposite
// direction (member-wide, but status-only).
export async function updateTaskDetails(
  taskId: string,
  input: TaskDetailsInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("group_id, created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return { success: false, error: taskError.message };
  }

  if (!task) {
    return {
      success: false,
      error: "Task not found, or you don't have access to it.",
    };
  }

  if (task.created_by !== user.id) {
    return {
      success: false,
      error: "Only the person who created this task can edit it.",
    };
  }

  const parsed = await parseTaskDetails(supabase, task.group_id, input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  // Deliberately never touches status -- that stays exclusively
  // updateTaskStatus's responsibility, available to every member
  // regardless of who created the task.
  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description,
      assignee_id: parsed.assigneeIdValue,
      due_date: parsed.dueDateValue,
    })
    .eq("id", taskId)
    .eq("created_by", user.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? "Couldn't update this task.",
    };
  }

  revalidatePath(`/groups/${task.group_id}`);
  return { success: true };
}

// Deliberately the only write surface exposed for task status --
// tasks_update_members (RLS) permits updating any column, but this
// action only ever sends { status }, keeping the actual exposed
// capability scoped to "status update", available to any member
// regardless of who created the task.
export async function updateTaskStatus(
  taskId: string,
  status: string,
): Promise<ActionResult> {
  const parsedStatus = taskStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { success: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("group_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return { success: false, error: taskError.message };
  }

  if (!task) {
    return {
      success: false,
      error: "Task not found, or you don't have access to it.",
    };
  }

  if (!(await isGroupMember(supabase, task.group_id, user.id))) {
    return {
      success: false,
      error: "You must be a member of this group to update tasks.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({ status: parsedStatus.data })
    .eq("id", taskId)
    .select("id")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? "Couldn't update this task.",
    };
  }

  revalidatePath(`/groups/${task.group_id}`);
  return { success: true };
}

// Product rule: the creator may delete their own task, but only while
// still a current group member -- or the group owner may delete any
// task in their group, regardless of who created it or whether that
// person is still around. Being the assignee does not grant this on
// its own. The button that calls this only shows for the creator
// (while a member) or the owner, but that's a UI convenience, not the
// authorization boundary: this re-checks both paths explicitly, and
// tasks_delete_creator_or_owner independently enforces the same rule
// regardless of what the client sends.
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("group_id, created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return { success: false, error: taskError.message };
  }

  if (!task) {
    return {
      success: false,
      error: "Task not found, or you don't have access to it.",
    };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", task.group_id)
    .maybeSingle();

  if (groupError || !group) {
    return {
      success: false,
      error: groupError?.message ?? "Group not found.",
    };
  }

  const isOwner = group.owner_id === user.id;
  const isCreatorAndMember =
    task.created_by === user.id &&
    (await isGroupMember(supabase, task.group_id, user.id));

  if (!isOwner && !isCreatorAndMember) {
    return {
      success: false,
      error:
        "Only the creator (while a member) or the group owner can delete this task.",
    };
  }

  // No .eq("created_by", user.id) here -- an owner-initiated delete of
  // someone else's task wouldn't match that. RLS
  // (tasks_delete_creator_or_owner) is the actual authority;
  // .select().single() detects whether it actually allowed this delete.
  const { data: deleted, error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id")
    .single();

  if (deleteError || !deleted) {
    return {
      success: false,
      error: deleteError?.message ?? "Couldn't delete this task.",
    };
  }

  revalidatePath(`/groups/${task.group_id}`);
  return { success: true };
}
