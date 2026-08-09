import type { Course } from "@/types/course";

// Member count is deliberately NOT embedded here (no group_members
// field) -- it's RLS-restricted to fellow members only, so an embedded
// `group_members(count)` silently shows 0 for any non-member viewer.
// Fetched separately via the group_member_counts() RPC instead, which
// is visible to any authenticated user regardless of membership -- see
// the group_member_count_fix migration.
export type GroupCardData = {
  id: string;
  name: string;
  description: string | null;
  group_type: "study" | "project";
  target_degree: string | null;
  target_year: number | null;
  location_or_link: string | null;
  max_members: number;
  owner_id: string;
  course: {
    id: string;
    course_name: string;
    faculty: string;
  };
};

// The current viewer's relationship to a given group, shown on its
// dashboard card in place of the "View group" action. null means none
// of the three apply (an unrelated, joinable group).
export type GroupCardStatus = "owner" | "member" | "pending";

export const GROUP_CARD_STATUS_LABELS: Record<GroupCardStatus, string> = {
  owner: "Owner",
  member: "Member",
  pending: "Request pending",
};

// Superset of GroupCardData: adds owner_id (to determine edit access) and
// the full Course (not just id/name/faculty) so the detail/edit pages can
// pre-fill CoursePicker, which displays/tracks a whole Course object.
// created_at is used only for display (the Overview tab's Group Info
// card) -- an existing column, not a schema change.
export type GroupDetailData = {
  id: string;
  name: string;
  description: string | null;
  group_type: "study" | "project";
  target_degree: string | null;
  target_year: number | null;
  location_or_link: string | null;
  max_members: number;
  owner_id: string;
  created_at: string;
  course: Course;
};

export const GROUP_TYPE_LABELS: Record<GroupCardData["group_type"], string> = {
  study: "Study group",
  project: "Task / project group",
};

// Row shape returned by the group_member_counts() RPC.
export type GroupMemberCountRow = {
  group_id: string;
  member_count: number;
};
