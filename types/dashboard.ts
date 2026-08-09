import type { GroupCardData, GroupCardStatus } from "@/types/group";
import type { PendingJoinRequest } from "@/types/join-request";
import type { TaskStatus } from "@/schemas/tasks";

// Row shapes specific to the Dashboard "attention/activity home" screen
// (bare /dashboard, no `scope`) -- each mirrors an existing feature's row
// type but adds the `group` embed needed to show data pulled across
// every group at once, instead of one already-known group.

export type DashboardMeetingRow = {
  id: string;
  title: string;
  meeting_time: string;
  location_or_link: string | null;
  group: { id: string; name: string };
};

// Dashboard only ever queries todo/in_progress (done tasks are
// deliberately excluded, see app/dashboard/page.tsx), but the field
// keeps the full TaskStatus type rather than a narrower union so
// TaskStatusBadge (shared with the group Overview tab) doesn't need a
// separate prop type.
export type DashboardTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  group: { id: string; name: string };
};

export type OwnerPendingRequest = PendingJoinRequest & {
  group: { id: string; name: string };
};

export type DashboardGroupPreviewRow = {
  role: Extract<GroupCardStatus, "owner" | "member">;
  group: GroupCardData;
};
