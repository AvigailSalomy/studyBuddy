import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { GroupHeader } from "@/components/group/group-header";
import { GroupTabs } from "@/components/group/group-tabs";
import {
  type GroupDetailData,
  type GroupMemberCountRow,
} from "@/types/group";
import type { GroupMemberRow } from "@/types/group-member";
import type { PendingJoinRequest } from "@/types/join-request";
import type { MaterialRow } from "@/types/material";
import type { TaskRow } from "@/types/task";
import type { MeetingRow } from "@/types/meeting";
import type { ChatMessageRow } from "@/types/chat";
import { upcomingMeetingsCutoffIso } from "@/lib/datetime";

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; panel?: string }>;
}) {
  const { id } = await params;
  const { tab: initialTab, panel: initialPanel } = await searchParams;

  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: rows, error } = await supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, max_members, owner_id, created_at, course:courses!inner(id, course_code, course_name, faculty, institution)",
    )
    .eq("id", id)
    .returns<GroupDetailData[]>();

  if (error) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-2 p-4 text-center">
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load this group: {error.message}
        </p>
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const group = rows?.[0];
  if (!group) {
    notFound();
  }

  const isOwner = group.owner_id === user.id;

  const [
    { data: myMembership },
    { data: myPendingRequest },
    pendingRequestsResult,
    { data: ownerProfile },
    { data: memberCounts },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("profile_id")
      .eq("group_id", id)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("join_requests")
      .select("id")
      .eq("group_id", id)
      .eq("profile_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
    isOwner
      ? supabase
          .from("join_requests")
          .select(
            "id, created_at, profile:profiles(id, full_name, institution, faculty, degree, study_year)",
          )
          .eq("group_id", id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .returns<PendingJoinRequest[]>()
      : Promise.resolve({ data: null }),
    // profiles SELECT is open to any authenticated user, unlike
    // group_members -- so the owner's name is visible to every viewer,
    // not just fellow members.
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", group.owner_id)
      .maybeSingle(),
    // Via the group_member_counts() RPC, not an embedded
    // group_members(count) -- see types/group.ts for why. No
    // .returns<T[]>() here: without generated Database types,
    // supabase-js can't confirm this RPC returns a set rather than a
    // scalar, so .returns<T[]>() produces a branded type-error type
    // instead of a clean cast -- cast explicitly below instead.
    supabase.rpc("group_member_counts", { p_group_ids: [id] }),
  ]);

  const isMember = myMembership !== null;
  const hasPendingRequest = myPendingRequest !== null;
  const pendingRequests = pendingRequestsResult.data ?? [];
  const memberCount =
    (memberCounts as GroupMemberCountRow[] | null)?.[0]?.member_count ?? 0;

  // The full roster, materials, tasks, meetings, and chat history are
  // all RLS-restricted to fellow members (group_members_select_fellow_
  // members / materials_select_members / tasks_select_members /
  // meetings_select_members / chat_messages_select_members, unchanged)
  // -- only fetched (and only rendered) when the viewer is themself a
  // member.
  const [
    { data: members },
    { data: materials },
    { data: tasks },
    { data: meetings },
    { data: recentChatMessages },
  ] =
    isMember
      ? await Promise.all([
          supabase
            .from("group_members")
            .select("role, profile:profiles(id, full_name, contact_email)")
            .eq("group_id", id)
            .order("joined_at", { ascending: true })
            .returns<GroupMemberRow[]>(),
          supabase
            .from("materials")
            .select(
              "id, title, file_name, category, file_size, created_at, uploader:profiles(id, full_name)",
            )
            .eq("group_id", id)
            .order("created_at", { ascending: false })
            .returns<MaterialRow[]>(),
          supabase
            .from("tasks")
            // profiles!assignee_id disambiguates the embed: tasks has two
            // FKs to profiles (created_by and assignee_id), so a plain
            // profiles(...) embed is ambiguous to PostgREST and errors
            // out rather than guessing which relationship to follow.
            .select(
              "id, title, description, status, due_date, created_at, created_by, assignee:profiles!assignee_id(id, full_name)",
            )
            .eq("group_id", id)
            .order("created_at", { ascending: false })
            .returns<TaskRow[]>(),
          supabase
            .from("meetings")
            // Upcoming only, soonest first -- past meetings aren't shown
            // (no separate "past meetings" view requested).
            // profiles!created_by is only one valid relationship here
            // (meetings has a single FK to profiles), but the explicit
            // hint is kept for consistency/defensiveness with the tasks
            // query above.
            .select(
              "id, title, meeting_time, location_or_link, created_by, creator:profiles!created_by(id, full_name)",
            )
            .eq("group_id", id)
            .gt("meeting_time", upcomingMeetingsCutoffIso())
            .order("meeting_time", { ascending: true })
            .returns<MeetingRow[]>(),
          // Latest 50, newest first -- the only way to get the *latest*
          // N via a single query -- reversed below into chronological
          // order for display. chat_messages_group_id_created_at_idx
          // (group_id, created_at) serves this directly.
          supabase
            .from("chat_messages")
            .select(
              "id, content, created_at, sender_id, sender:profiles!sender_id(id, full_name)",
            )
            .eq("group_id", id)
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<ChatMessageRow[]>(),
        ])
      : [
          { data: null },
          { data: null },
          { data: null },
          { data: null },
          { data: null },
        ];

  const chatMessages = recentChatMessages
    ? [...recentChatMessages].reverse()
    : null;

  return (
    <AppShell active="group" userName={profile.full_name}>
      <GroupHeader
        group={group}
        isOwner={isOwner}
        isMember={isMember}
        hasPendingRequest={hasPendingRequest}
      />
      <GroupTabs
        group={group}
        groupId={group.id}
        currentUserId={user.id}
        isOwner={isOwner}
        isMember={isMember}
        ownerName={ownerProfile?.full_name ?? "Unknown"}
        memberCount={memberCount}
        createdAt={group.created_at}
        members={members}
        materials={materials}
        tasks={tasks}
        meetings={meetings}
        chatMessages={chatMessages}
        pendingRequests={pendingRequests}
        initialTab={initialTab}
        initialPanel={initialPanel}
      />
    </AppShell>
  );
}
