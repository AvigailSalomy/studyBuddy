import type { Course } from "@/types/course";

export type GroupCardData = {
  id: string;
  name: string;
  description: string | null;
  group_type: "study" | "project";
  target_degree: string | null;
  target_year: number | null;
  location_or_link: string | null;
  max_members: number;
  course: {
    id: string;
    course_name: string;
    faculty: string;
  };
  group_members: { count: number }[];
};

// Superset of GroupCardData: adds owner_id (to determine edit access) and
// the full Course (not just id/name/faculty) so the detail/edit pages can
// pre-fill CoursePicker, which displays/tracks a whole Course object.
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
  course: Course;
  group_members: { count: number }[];
};

export const GROUP_TYPE_LABELS: Record<GroupCardData["group_type"], string> = {
  study: "Study group",
  project: "Task / project group",
};
