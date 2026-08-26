// Deterministic, explainable group recommendations -- no numeric score
// anywhere, not even internally. A candidate is classified into one of
// three tiers by which of two profile signals it matches; ordering
// between candidates is by tier, then recency, never by an accumulated
// point total.
//
// Only faculty and degree are used. target_year is deliberately not a
// signal (product decision). Courses aren't a signal either -- courses
// are associated at the group level (groups.course_id) only, not per
// profile, so there's no per-user course data to compare against.
// Institution is not compared here at all: it's enforced as a hard
// filter at the query level (only same-institution groups are ever
// fetched as candidates), not a tie-breaking signal.
export type MatchTier = "both" | "one" | "none";

export type GroupMatch = {
  tier: MatchTier;
  reasons: string[];
};

const TIER_ORDER: Record<MatchTier, number> = { both: 0, one: 1, none: 2 };

export function compareMatchTier(a: MatchTier, b: MatchTier): number {
  return TIER_ORDER[a] - TIER_ORDER[b];
}

export function computeGroupMatch(
  profile: { faculty: string; degree: string },
  group: { course: { faculty: string }; target_degree: string | null },
): GroupMatch {
  const facultyMatch = group.course.faculty === profile.faculty;
  // A null target_degree means "open to any degree" -- that's not the
  // same as actually matching the viewer's own degree, so it earns no
  // chip and doesn't count toward a match here.
  const degreeMatch =
    group.target_degree !== null && group.target_degree === profile.degree;

  const reasons: string[] = [];
  if (facultyMatch) reasons.push("Your faculty");
  if (degreeMatch) reasons.push("Your degree");

  const tier: MatchTier =
    facultyMatch && degreeMatch ? "both" : facultyMatch || degreeMatch ? "one" : "none";

  return { tier, reasons };
}
