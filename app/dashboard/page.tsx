import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type ActiveNav } from "@/components/app-shell/app-shell";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { GroupCard } from "@/components/group-card";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { normalizeWhitespace } from "@/lib/text";
import type {
  GroupCardData,
  GroupCardStatus,
  GroupMemberCountRow,
} from "@/types/group";
import type {
  DashboardMeetingRow,
  DashboardTaskRow,
  OwnerPendingRequest,
  DashboardGroupPreviewRow,
} from "@/types/dashboard";
import type { UnreadGroupSummary } from "@/types/chat";

type DashboardSearchParams = {
  course?: string;
  faculty?: string;
  degree?: string;
  year?: string;
  scope?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, faculty, degree, study_year")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  // Bare /dashboard (no `scope`) is the attention/activity home --
  // distinct from My Groups (?scope=mine) and Explore Groups
  // (?scope=explore), which keep the exact filtered-browse behavior
  // from before this change, unchanged below.
  if (params.scope !== "mine" && params.scope !== "explore") {
    return (
      <DashboardHomeView
        supabase={supabase}
        userId={user.id}
        userName={profile.full_name}
      />
    );
  }

  const scope = params.scope;

  // A param key absent entirely (first visit, no query string yet) means
  // "use the profile default"; a key present but empty means the user
  // explicitly cleared that filter -- see DashboardFilters. Normalized
  // immediately so the displayed filter values and the actual query
  // always agree on what was searched.
  const courseFilter = normalizeWhitespace(params.course ?? "");
  const facultyFilter = normalizeWhitespace(
    params.faculty !== undefined ? params.faculty : profile.faculty,
  );
  const degreeFilter = normalizeWhitespace(
    params.degree !== undefined ? params.degree : profile.degree,
  );
  const yearFilter =
    params.year !== undefined ? params.year : String(profile.study_year);

  let query = supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, location_or_link, max_members, owner_id, course:courses!inner(id, course_name, faculty)",
    )
    .order("created_at", { ascending: false });

  if (courseFilter.length > 0) {
    query = query.ilike("course.course_name", `%${courseFilter}%`);
  }
  if (facultyFilter.length > 0) {
    // ilike with no wildcards is a case-insensitive *exact* match --
    // unlike course search above, faculty shouldn't be a substring
    // match (a "Science" filter shouldn't pull in an unrelated "Data
    // Science" faculty).
    query = query.ilike("course.faculty", facultyFilter);
  }
  if (degreeFilter.length > 0) {
    // Groups open to any degree (target_degree is null) stay visible
    // alongside a match -- mirrors how the recommendation engine treats
    // an empty target_year as "matches anyone" (architecture.md 8.2),
    // applied here to filtering instead of scoring. ilike (rather than
    // eq) makes the match case-insensitive, same reasoning as faculty
    // above.
    query = query.or(
      `target_degree.ilike.${degreeFilter},target_degree.is.null`,
    );
  }
  if (yearFilter.trim().length > 0) {
    const yearNumber = Number(yearFilter.trim());
    if (Number.isInteger(yearNumber)) {
      query = query.or(`target_year.eq.${yearNumber},target_year.is.null`);
    }
  }

  const { data: groups, error } = await query.returns<GroupCardData[]>();

  const groupIds = (groups ?? []).map((group) => group.id);

  // Member counts, the viewer's own memberships, and the viewer's own
  // pending requests are all loaded in bulk for every visible group at
  // once (one query each, filtered with .in()) rather than per-card, to
  // avoid N+1 queries across a whole page of results.
  const [memberCountsResult, ownMembershipsResult, ownPendingRequestsResult] =
    groupIds.length > 0
      ? await Promise.all([
          // Cast rather than .returns<T[]>(): without generated
          // Database types, supabase-js can't confirm this RPC returns
          // a set rather than a scalar, so .returns<T[]>() produces a
          // branded type-error type here instead of a clean cast, even
          // though the function does return a table (see the
          // group_member_counts migration).
          supabase.rpc("group_member_counts", {
            p_group_ids: groupIds,
          }) as unknown as Promise<{ data: GroupMemberCountRow[] | null }>,
          // group_members RLS (group_members_select_fellow_members)
          // restricts SELECT to fellow members -- but filtering by our
          // own profile_id always satisfies that policy for our own
          // rows (the row itself is the proof of membership), so this
          // correctly returns exactly "which of these groups am I
          // already in", nothing more.
          supabase
            .from("group_members")
            .select("group_id")
            .eq("profile_id", user.id)
            .in("group_id", groupIds),
          supabase
            .from("join_requests")
            .select("group_id")
            .eq("profile_id", user.id)
            .eq("status", "pending")
            .in("group_id", groupIds),
        ])
      : [{ data: [] as GroupMemberCountRow[] }, { data: [] }, { data: [] }];

  const memberCountByGroupId = new Map(
    (memberCountsResult.data ?? []).map((row) => [
      row.group_id,
      row.member_count,
    ]),
  );
  const ownMemberGroupIds = new Set(
    (ownMembershipsResult.data ?? []).map((row) => row.group_id),
  );
  const ownPendingRequestGroupIds = new Set(
    (ownPendingRequestsResult.data ?? []).map((row) => row.group_id),
  );

  // Captured explicitly: TypeScript's narrowing of `user` from the
  // earlier `if (!user) redirect(...)` check doesn't carry into a
  // nested function closure, even though `user` is const.
  const userId = user.id;

  function cardStatus(group: GroupCardData): GroupCardStatus | null {
    if (group.owner_id === userId) return "owner";
    if (ownMemberGroupIds.has(group.id)) return "member";
    if (ownPendingRequestGroupIds.has(group.id)) return "pending";
    return null;
  }

  // "My Groups" / "Explore Groups" (sidebar nav) are a presentational
  // filter over this same already-fetched, already-course/faculty/
  // degree/year-filtered list -- no extra Supabase query, no RLS/schema
  // change. "mine" = groups you own or belong to; "explore" = groups
  // you haven't joined (whether or not a request is pending).
  const visibleGroups = (groups ?? []).filter((group) => {
    const status = cardStatus(group);
    if (scope === "mine") return status === "owner" || status === "member";
    return status === null || status === "pending";
  });

  const activeNav: ActiveNav = scope === "mine" ? "my-groups" : "explore";
  const heading = scope === "mine" ? "My Groups" : "Explore Groups";
  const subheading =
    scope === "mine"
      ? "Groups you own or belong to."
      : "Groups you haven't joined yet.";

  return (
    <AppShell active={activeNav} userName={profile.full_name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">{subheading}</p>
        </div>
        <Link href="/groups/new" className={buttonVariants({})}>
          <Plus className="size-4" />
          Create group
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <DashboardFilters
          initialCourse={courseFilter}
          initialFaculty={facultyFilter}
          initialDegree={degreeFilter}
          initialYear={yearFilter}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load groups: {error.message}
        </p>
      )}

      {!error && visibleGroups.length === 0 && (
        <EmptyState
          icon={scope === "mine" ? Users : Compass}
          title={
            scope === "mine"
              ? "You haven't joined any groups yet"
              : "No groups match your filters"
          }
          description={
            scope === "mine"
              ? "Explore groups or create your own to get started."
              : "Try widening your search, or create a new group."
          }
          action={
            <Link
              href={scope === "mine" ? "/dashboard?scope=explore" : "/groups/new"}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {scope === "mine" ? "Explore groups" : "Create a group"}
            </Link>
          }
        />
      )}

      {!error && visibleGroups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              memberCount={memberCountByGroupId.get(group.id) ?? 0}
              status={cardStatus(group)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

// Isolated as its own async function (rather than inlined in
// DashboardPage) purely so the "home" and "browse" data-fetching paths
// read as two clearly separate branches, given how different their
// query shapes are.
async function DashboardHomeView({
  supabase,
  userId,
  userName,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  userName: string;
}) {
  // Four independent queries, each a single round-trip regardless of
  // data volume: RLS (meetings_select_members / tasks_select_members /
  // join_requests_select_requester_or_owner / group_members_select_
  // fellow_members) already scopes each one to "my" groups without a
  // separate "fetch my group ids first" query -- no N+1 here. The
  // count is requested alongside each limited page of rows (Supabase's
  // combined count+data fetch) so the summary cards above don't need
  // their own extra queries either.
  const [
    meetingsResult,
    tasksResult,
    requestsResult,
    groupsPreviewResult,
    unreadSummaryResult,
  ] =
    await Promise.all([
      supabase
        .from("meetings")
        .select(
          "id, title, meeting_time, location_or_link, group:groups(id, name)",
          { count: "exact" },
        )
        .gt("meeting_time", new Date().toISOString())
        .order("meeting_time", { ascending: true })
        .limit(5)
        .returns<DashboardMeetingRow[]>(),
      // Done tasks are deliberately excluded (not just deprioritized) --
      // the Dashboard home is "what still needs attention"; completed
      // tasks remain visible in the group's own Tasks tab.
      supabase
        .from("tasks")
        .select(
          "id, title, status, due_date, group:groups(id, name)",
          { count: "exact" },
        )
        .eq("assignee_id", userId)
        .in("status", ["todo", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5)
        .returns<DashboardTaskRow[]>(),
      // groups!inner(...) + .eq("group.owner_id", userId) filters on the
      // embedded resource -- the same pattern this file already used for
      // course:courses!inner(...) + .ilike("course.course_name", ...)
      // above. RLS (join_requests_select_requester_or_owner) separately
      // still allows rows where profile_id = auth.uid() (i.e. requests
      // *I* filed) through -- this .eq() is what narrows down to "only
      // where I'm the owner", which is the actual product requirement.
      supabase
        .from("join_requests")
        .select(
          "id, created_at, profile:profiles(id, full_name, institution, faculty, degree, study_year), group:groups!inner(id, name, owner_id)",
          { count: "exact" },
        )
        .eq("status", "pending")
        .eq("group.owner_id", userId)
        .order("created_at", { ascending: true })
        .returns<OwnerPendingRequest[]>(),
      // group_members rather than groups: gives `role` directly (no
      // separate owner_id comparison needed) and, per its own RLS
      // policy, a user's own membership rows always satisfy
      // is_group_member(group_id) (the row itself is the proof).
      supabase
        .from("group_members")
        .select(
          "role, group:groups(id, name, description, group_type, target_degree, target_year, location_or_link, max_members, owner_id, course:courses(id, course_name, faculty))",
          { count: "exact" },
        )
        .eq("profile_id", userId)
        .order("joined_at", { ascending: false })
        .limit(4)
        .returns<DashboardGroupPreviewRow[]>(),
      // Same "cast rather than .returns<T[]>()" reasoning as
      // group_member_counts below: without generated Database types,
      // supabase-js can't confirm this RPC returns a set. One row per
      // group with unread messages, already newest-activity-first and
      // already carrying the latest message's content/sender -- see
      // the migration for the windowed query behind it.
      supabase.rpc("unread_chat_summary") as unknown as Promise<{
        data: UnreadGroupSummary[] | null;
      }>,
    ]);

  // Member counts for just the previewed groups (≤4 ids) -- one bulk
  // RPC call, same as the existing My Groups/Explore Groups view uses
  // for its whole visible list, not a query per card.
  const previewGroupIds = (groupsPreviewResult.data ?? []).map(
    (row) => row.group.id,
  );
  const { data: previewMemberCounts } =
    previewGroupIds.length > 0
      ? ((await supabase.rpc("group_member_counts", {
          p_group_ids: previewGroupIds,
        })) as unknown as { data: GroupMemberCountRow[] | null })
      : { data: [] as GroupMemberCountRow[] };

  return (
    <AppShell active="dashboard" userName={userName}>
      <DashboardHome
        userId={userId}
        userName={userName}
        groupsCount={groupsPreviewResult.count ?? 0}
        tasksCount={tasksResult.count ?? 0}
        meetingsCount={meetingsResult.count ?? 0}
        pendingRequestsCount={requestsResult.count ?? 0}
        meetings={meetingsResult.data ?? []}
        tasks={tasksResult.data ?? []}
        pendingRequests={requestsResult.data ?? []}
        groupsPreview={groupsPreviewResult.data ?? []}
        groupsPreviewMemberCounts={previewMemberCounts ?? []}
        unreadSummaries={unreadSummaryResult.data ?? []}
      />
    </AppShell>
  );
}
