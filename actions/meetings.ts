"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  meetingDetailsSchema,
  type MeetingDetailsInput,
} from "@/schemas/meetings";

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

// Shared by createMeeting and updateMeetingDetails -- both validate the
// exact same field set and both must reject a non-future meeting time.
// meetingTime arrives as an already-UTC ISO instant (converted
// client-side from the browser's local datetime-local value -- see
// lib/datetime.ts), so this comparison is timezone-safe regardless of
// which timezone this server happens to be running in.
function parseMeetingDetails(input: MeetingDetailsInput) {
  const parsed = meetingDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { title, meetingTime, locationOrLink } = parsed.data;

  const parsedTime = new Date(meetingTime);
  if (parsedTime.getTime() <= Date.now()) {
    return { ok: false as const, error: "Meeting time must be in the future." };
  }

  return {
    ok: true as const,
    title,
    meetingTime,
    locationOrLink: locationOrLink.length > 0 ? locationOrLink : null,
  };
}

export async function createMeeting(
  groupId: string,
  input: MeetingDetailsInput,
): Promise<ActionResult> {
  const parsed = parseMeetingDetails(input);
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

  if (!(await isGroupMember(supabase, groupId, user.id))) {
    return {
      success: false,
      error: "You must be a member of this group to create meetings.",
    };
  }

  const { error: insertError } = await supabase.from("meetings").insert({
    group_id: groupId,
    created_by: user.id,
    title: parsed.title,
    meeting_time: parsed.meetingTime,
    location_or_link: parsed.locationOrLink,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// Product rule: only the original creator may edit a meeting's details
// -- being the group owner does not grant this on its own. The button
// that calls this is only shown to the creator, but that's a UI
// convenience, not the authorization boundary: this re-checks ownership
// itself (backed by the creator-only UPDATE RLS policy), so calling it
// directly as anyone else fails regardless of what the client sends.
export async function updateMeetingDetails(
  meetingId: string,
  input: MeetingDetailsInput,
): Promise<ActionResult> {
  const parsed = parseMeetingDetails(input);
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

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("group_id, created_by")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    return { success: false, error: meetingError.message };
  }

  if (!meeting) {
    return {
      success: false,
      error: "Meeting not found, or you don't have access to it.",
    };
  }

  if (meeting.created_by !== user.id) {
    return {
      success: false,
      error: "Only the person who created this meeting can edit it.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("meetings")
    .update({
      title: parsed.title,
      meeting_time: parsed.meetingTime,
      location_or_link: parsed.locationOrLink,
    })
    .eq("id", meetingId)
    .eq("created_by", user.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? "Couldn't update this meeting.",
    };
  }

  revalidatePath(`/groups/${meeting.group_id}`);
  return { success: true };
}

// Product rule: only the original creator may delete a meeting -- being
// the group owner does not grant this on its own. The button that
// calls this is only shown to the creator, but that's a UI convenience,
// not the authorization boundary: this re-checks ownership itself
// (backed by the creator-only DELETE RLS policy), so calling it
// directly as anyone else fails regardless of what the client sends.
export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("group_id, created_by")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    return { success: false, error: meetingError.message };
  }

  if (!meeting) {
    return {
      success: false,
      error: "Meeting not found, or you don't have access to it.",
    };
  }

  if (meeting.created_by !== user.id) {
    return {
      success: false,
      error: "Only the person who created this meeting can delete it.",
    };
  }

  const { error: deleteError } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId)
    .eq("created_by", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath(`/groups/${meeting.group_id}`);
  return { success: true };
}
