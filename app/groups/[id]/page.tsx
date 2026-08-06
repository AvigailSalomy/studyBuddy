import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GROUP_TYPE_LABELS,
  type GroupDetailData,
  type GroupMemberCountRow,
} from "@/types/group";
import {
  GROUP_MEMBER_ROLE_LABELS,
  type GroupMemberRow,
} from "@/types/group-member";
import type { PendingJoinRequest } from "@/types/join-request";
import { JoinRequestButton } from "@/components/join-request-button";
import { JoinRequestsSection } from "@/components/join-requests-section";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: rows, error } = await supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, location_or_link, max_members, owner_id, course:courses!inner(id, course_code, course_name, faculty, institution)",
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
  const isOnlineLink = group.location_or_link
    ? /^https?:\/\//i.test(group.location_or_link)
    : false;

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

  // The full roster is RLS-restricted to fellow members (unchanged,
  // existing group_members_select_fellow_members policy) -- only
  // fetched (and only renders) when the viewer is themself a member.
  const { data: members } = isMember
    ? await supabase
        .from("group_members")
        .select("role, profile:profiles(id, full_name)")
        .eq("group_id", id)
        .order("joined_at", { ascending: true })
        .returns<GroupMemberRow[]>()
    : { data: null };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4 py-12">
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        ← Back to dashboard
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle>{group.name}</CardTitle>
          {isOwner && (
            <Link
              href={`/groups/${group.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit group
            </Link>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {group.description && <p>{group.description}</p>}
          <p className="text-muted-foreground">
            Course: {group.course.course_name}
          </p>
          <p className="text-muted-foreground">
            Type: {GROUP_TYPE_LABELS[group.group_type]}
          </p>
          <p className="text-muted-foreground">
            Target: {group.target_degree ?? "Any degree"} ·{" "}
            {group.target_year ? `Year ${group.target_year}` : "Any year"}
          </p>
          <p className="text-muted-foreground">
            Owner: {ownerProfile?.full_name ?? "Unknown"}
          </p>
          <p className="text-muted-foreground">
            Members: {memberCount}/{group.max_members}
          </p>
          <p className="text-muted-foreground">
            {group.location_or_link
              ? isOnlineLink
                ? "Online"
                : group.location_or_link
              : "Location not specified"}
          </p>

          {!isMember &&
            (hasPendingRequest ? (
              <Button disabled variant="outline" className="mt-2 self-start">
                Request pending
              </Button>
            ) : (
              <div className="mt-2 self-start">
                <JoinRequestButton groupId={group.id} />
              </div>
            ))}
        </CardContent>
      </Card>

      {isMember && (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {(members ?? []).map((member) => (
              <div
                key={member.profile.id}
                className="flex items-center justify-between"
              >
                <span>{member.profile.full_name}</span>
                <span className="text-muted-foreground">
                  {GROUP_MEMBER_ROLE_LABELS[member.role]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isOwner && <JoinRequestsSection requests={pendingRequests} />}
    </div>
  );
}
