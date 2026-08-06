import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardFilters } from "@/components/dashboard-filters";
import { GroupCard } from "@/components/group-card";
import { buttonVariants } from "@/components/ui/button";
import { normalizeWhitespace } from "@/lib/text";
import type {
  GroupCardData,
  GroupCardStatus,
  GroupMemberCountRow,
} from "@/types/group";

type DashboardSearchParams = {
  course?: string;
  faculty?: string;
  degree?: string;
  year?: string;
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

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Welcome, {profile.full_name}</h1>
        <div className="flex items-center gap-2">
          <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
            Profile
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Groups</h2>
        <Link href="/groups/new" className={buttonVariants({})}>
          Create group
        </Link>
      </div>

      <DashboardFilters
        initialCourse={courseFilter}
        initialFaculty={facultyFilter}
        initialDegree={degreeFilter}
        initialYear={yearFilter}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load groups: {error.message}
        </p>
      )}

      {!error && (groups?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          No groups match your filters yet. Try widening your search, or{" "}
          <Link href="/groups/new" className="underline underline-offset-4">
            create one
          </Link>
          .
        </p>
      )}

      {!error && groups && groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              memberCount={memberCountByGroupId.get(group.id) ?? 0}
              status={cardStatus(group)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
