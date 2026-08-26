import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { GroupCard } from "@/components/group-card";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { computeGroupMatch, compareMatchTier } from "@/lib/recommendation-tier";
import type { GroupCardData, GroupMemberCountRow } from "@/types/group";

// Recommendations needs `created_at` (for the within-tier recency
// tie-break) on top of everything GroupCard already expects -- an
// intersection rather than a new shared type, since nothing else in
// the app needs this combination.
type RecommendedGroupRow = GroupCardData & { created_at: string };

// A reasonably generous cap on the *candidate* set fetched per request
// (already narrowed to one institution by the query below) -- ranking
// happens in-memory over this bounded set, then the top MAX_RESULTS are
// shown. Not a pagination limit, just a defensive ceiling.
const CANDIDATE_LIMIT = 200;
const MAX_RESULTS = 20;

export default async function RecommendationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, institution, faculty, degree")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  // Three independent queries, one round-trip each, run in parallel --
  // same "no N+1" shape as the Dashboard's existing browse/home views.
  const [candidatesResult, ownMembershipsResult, ownPendingRequestsResult] =
    await Promise.all([
      // Same institution is a hard filter, not a scored signal: courses
      // are only ever created within their creator's own institution
      // (courses_insert_own_institution_faculty), so course.institution
      // reliably reflects the group's institution. groups_select_
      // authenticated already permits browsing across institutions, so
      // this narrows that down to ones actually relevant to the viewer.
      supabase
        .from("groups")
        .select(
          "id, name, description, group_type, target_degree, target_year, max_members, owner_id, created_at, course:courses!inner(id, course_name, faculty, institution)",
        )
        .eq("course.institution", profile.institution)
        .order("created_at", { ascending: false })
        .limit(CANDIDATE_LIMIT)
        .returns<RecommendedGroupRow[]>(),
      // group_members_select_fellow_members: a user's own rows always
      // satisfy is_group_member(group_id) (the row itself is the
      // proof), so this returns exactly "groups I already belong to".
      supabase
        .from("group_members")
        .select("group_id")
        .eq("profile_id", user.id),
      // join_requests_select_requester_or_owner's `profile_id =
      // auth.uid()` branch covers this -- my own pending requests,
      // regardless of who owns those groups.
      supabase
        .from("join_requests")
        .select("group_id")
        .eq("profile_id", user.id)
        .eq("status", "pending"),
    ]);

  const { data: candidates, error } = candidatesResult;
  const excludedGroupIds = new Set([
    ...(ownMembershipsResult.data ?? []).map((row) => row.group_id),
    ...(ownPendingRequestsResult.data ?? []).map((row) => row.group_id),
  ]);

  const joinable = (candidates ?? []).filter(
    (group) => !excludedGroupIds.has(group.id),
  );

  // Member counts for the remaining candidates, in bulk -- same
  // group_member_counts() RPC the Dashboard/My Groups/Explore Groups
  // views already use, not a query per card.
  const joinableIds = joinable.map((group) => group.id);
  const { data: memberCounts } =
    joinableIds.length > 0
      ? ((await supabase.rpc("group_member_counts", {
          p_group_ids: joinableIds,
        })) as unknown as { data: GroupMemberCountRow[] | null })
      : { data: [] as GroupMemberCountRow[] };
  const memberCountByGroupId = new Map(
    (memberCounts ?? []).map((row) => [row.group_id, row.member_count]),
  );

  const notFull = joinable.filter((group) => {
    const memberCount = memberCountByGroupId.get(group.id) ?? 0;
    // Defensive: max_members is `not null` in the schema today, so this
    // can't actually happen, but a missing limit is treated as
    // "unlimited" rather than silently excluding the group.
    if (group.max_members == null) return true;
    return memberCount < group.max_members;
  });

  // Tier classification (both faculty+degree / one of them / neither),
  // never a numeric score -- see lib/recommendation-tier.ts. Same
  // institution alone is no longer enough to be recommended: "none"
  // (matches neither faculty nor degree) is filtered out entirely here,
  // not just ranked last -- institution stays a hard filter upstream
  // (the query itself), faculty/degree relevance is now also required,
  // not merely scored. Sorted by tier, then recency within a tier.
  const ranked = notFull
    .map((group) => ({ group, match: computeGroupMatch(profile, group) }))
    .filter(({ match }) => match.tier !== "none")
    .sort((a, b) => {
      const tierDiff = compareMatchTier(a.match.tier, b.match.tier);
      if (tierDiff !== 0) return tierDiff;
      return (
        new Date(b.group.created_at).getTime() -
        new Date(a.group.created_at).getTime()
      );
    })
    .slice(0, MAX_RESULTS);

  return (
    <AppShell active="recommendations" userName={profile.full_name}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recommendations
        </h1>
        <p className="text-sm text-muted-foreground">
          Groups picked for you based on your profile.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Based on your institution, faculty, and degree. Groups you&apos;ve
        already joined, already requested to join, or that are full aren&apos;t
        shown.
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load recommendations: {error.message}
        </p>
      )}

      {!error && ranked.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No recommendations right now"
          description="We couldn't find any joinable groups at your institution that aren't already yours. Try exploring all groups instead."
          action={
            <Link
              href="/dashboard?scope=explore"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Compass className="size-4" />
              Explore groups
            </Link>
          }
        />
      )}

      {!error && ranked.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ group, match }) => (
            <GroupCard
              key={group.id}
              group={group}
              memberCount={memberCountByGroupId.get(group.id) ?? 0}
              status={null}
              reasons={match.reasons}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
