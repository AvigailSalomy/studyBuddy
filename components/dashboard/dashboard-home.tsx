import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { UpcomingMeetingsCard } from "@/components/dashboard/upcoming-meetings-card";
import { MyTasksCard } from "@/components/dashboard/my-tasks-card";
import { PendingRequestsCard } from "@/components/dashboard/pending-requests-card";
import { MyGroupsPreviewCard } from "@/components/dashboard/my-groups-preview-card";
import type {
  DashboardMeetingRow,
  DashboardTaskRow,
  OwnerPendingRequest,
  DashboardGroupPreviewRow,
} from "@/types/dashboard";
import type { GroupMemberCountRow } from "@/types/group";

// Bare /dashboard: "what needs my attention right now" -- distinct from
// My Groups (?scope=mine, the full list) and Explore Groups
// (?scope=explore, groups not yet joined). No search/filter toolbar
// here on purpose; that's what My Groups/Explore Groups are for.
export function DashboardHome({
  userName,
  groupsCount,
  tasksCount,
  meetingsCount,
  pendingRequestsCount,
  meetings,
  tasks,
  pendingRequests,
  groupsPreview,
  groupsPreviewMemberCounts,
}: {
  userName: string;
  groupsCount: number;
  tasksCount: number;
  meetingsCount: number;
  pendingRequestsCount: number;
  meetings: DashboardMeetingRow[];
  tasks: DashboardTaskRow[];
  pendingRequests: OwnerPendingRequest[];
  groupsPreview: DashboardGroupPreviewRow[];
  groupsPreviewMemberCounts: GroupMemberCountRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what needs your attention.
          </p>
        </div>
        <Link href="/groups/new" className={buttonVariants({ variant: "outline" })}>
          <Plus className="size-4" />
          Create group
        </Link>
      </div>

      <SummaryCards
        groupsCount={groupsCount}
        tasksCount={tasksCount}
        meetingsCount={meetingsCount}
        pendingRequestsCount={pendingRequestsCount}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingMeetingsCard meetings={meetings} />
        <MyTasksCard tasks={tasks} />
        {pendingRequestsCount > 0 && (
          <PendingRequestsCard requests={pendingRequests} />
        )}
        <MyGroupsPreviewCard
          groups={groupsPreview}
          memberCounts={groupsPreviewMemberCounts}
        />
      </div>
    </div>
  );
}
