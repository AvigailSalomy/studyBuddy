"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  taskStatusSchema,
  type CreateTaskInput,
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

export async function createTask(
  groupId: string,
  input: CreateTaskInput,
): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { title, description, assigneeId, dueDate } = parsed.data;

  let dueDateValue: string | null = null;
  if (dueDate.length > 0) {
    const parsedDate = new Date(dueDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return { success: false, error: "Invalid due date." };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return { success: false, error: "Due date can't be in the past." };
    }
    dueDateValue = dueDate;
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
      error: "You must be a member of this group to create tasks.",
    };
  }

  let assigneeIdValue: string | null = null;
  if (assigneeId.length > 0) {
    // Never trust that the client-selected assignee is actually a
    // member -- re-verify against group_members directly.
    if (!(await isGroupMember(supabase, groupId, assigneeId))) {
      return {
        success: false,
        error: "Selected assignee is not a member of this group.",
      };
    }
    assigneeIdValue = assigneeId;
  }

  const { error: insertError } = await supabase.from("tasks").insert({
    group_id: groupId,
    created_by: user.id,
    assignee_id: assigneeIdValue,
    title,
    description: description.length > 0 ? description : null,
    due_date: dueDateValue,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// Deliberately the only write surface exposed for existing tasks --
// tasks_update_members (RLS) permits updating any column, but this
// action only ever sends { status }, keeping the actual exposed
// capability scoped to "status update", per the agreed product scope
// (no title/description/assignee editing in this step).
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

// Product rule: only the original creator may delete a task -- being
// the assignee or the group owner does not grant this on its own. The
// button that calls this is only shown to the creator, but that's a UI
// convenience, not the authorization boundary: this re-checks ownership
// itself (backed by the creator-only DELETE RLS policy), so calling it
// directly as anyone else fails regardless of what the client sends.
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

  if (task.created_by !== user.id) {
    return {
      success: false,
      error: "Only the person who created this task can delete it.",
    };
  }

  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("created_by", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath(`/groups/${task.group_id}`);
  return { success: true };
}
