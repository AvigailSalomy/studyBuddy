"use server";

import { createClient } from "@/lib/supabase/server";
import { chatMessageSchema } from "@/schemas/chat";
import type { ChatMessageRow } from "@/types/chat";

type ActionResult =
  | { success: true; message: ChatMessageRow }
  | { success: false; error: string };

type SimpleActionResult = { success: true } | { success: false; error: string };

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

// Unlike every other create action in this app (createTask,
// createMeeting, ...), this deliberately does NOT call revalidatePath,
// and its caller (ChatPanel) does NOT call router.refresh() afterward.
// Chat is push-driven by the Realtime subscription plus a direct local
// append of the row returned below, not pull-driven by a server
// refetch -- refreshing here would reset the reader's scroll position
// and needlessly re-fetch the whole group page's other tab data for a
// one-message change.
export async function sendChatMessage(
  groupId: string,
  input: { content: string },
): Promise<ActionResult> {
  const parsed = chatMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message.",
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
      error: "You must be a member of this group to send messages.",
    };
  }

  // sender_id is set from the authenticated session, never from
  // `input` -- there is no senderId field on the input type at all, so
  // a forged sender can't even be expressed here, and
  // chat_messages_insert_members's `with check (sender_id = auth.uid())`
  // independently enforces the same thing at the database level.
  const { data: message, error: insertError } = await supabase
    .from("chat_messages")
    .insert({
      group_id: groupId,
      sender_id: user.id,
      content: parsed.data.content,
    })
    .select("id, content, created_at, sender_id")
    .single();

  if (insertError || !message) {
    return {
      success: false,
      error: insertError?.message ?? "Couldn't send this message.",
    };
  }

  // The sender's own name is already known client-side (it's "me"), so
  // the insert only re-selects the row's own columns -- no embedded
  // profiles(...) needed here, unlike the initial-history fetch.
  return { success: true, message: { ...message, sender: null } };
}

// Called by ChatPanel on mount (Chat tab opened) and again whenever the
// visible message list grows while it stays mounted (a message arriving
// live counts as read too -- otherwise a long open session would still
// show as unread on the Dashboard afterward). No revalidatePath/
// router.refresh(), same reasoning as sendChatMessage -- the Dashboard
// picks this up on its own next load, or live via its own Realtime
// watcher, not because Chat forced a refresh.
export async function markChatRead(groupId: string): Promise<SimpleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  // The server's own clock, not the browser's -- same convention as the
  // future-meeting-time check in actions/meetings.ts. Structurally this
  // can't touch another member's row or any column other than
  // last_chat_read_at: group_members_update_own_read_state restricts
  // rows to profile_id = auth.uid(), and the column-level grant
  // (`update (last_chat_read_at)` only, no blanket update grant) makes
  // any other column write-forbidden regardless of what's attempted
  // here.
  const { error: updateError } = await supabase
    .from("group_members")
    .update({ last_chat_read_at: new Date().toISOString() })
    .eq("group_id", groupId)
    .eq("profile_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
