import Link from "next/link";
import { Users } from "lucide-react";
import { GroupCard } from "@/components/group-card";
import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/dashboard/section-shell";
import { buttonVariants } from "@/components/ui/button";
import type { DashboardGroupPreviewRow } from "@/types/dashboard";
import type { GroupMemberCountRow } from "@/types/group";

export function MyGroupsPreviewCard({
  groups,
  memberCounts,
}: {
  groups: DashboardGroupPreviewRow[];
  memberCounts: GroupMemberCountRow[];
}) {
  const memberCountByGroupId = new Map(
    memberCounts.map((row) => [row.group_id, row.member_count]),
  );

  return (
    <SectionShell
      title="My Groups"
      icon={Users}
      action={
        groups.length > 0 && (
          <Link
            href="/dashboard?scope=mine"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View all
          </Link>
        )
      }
      className="lg:col-span-2"
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You haven't joined any groups yet"
          description="Explore groups or create your own to get started."
          action={
            <Link
              href="/dashboard?scope=explore"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Explore groups
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map(({ group, role }) => (
            <GroupCard
              key={group.id}
              group={group}
              memberCount={memberCountByGroupId.get(group.id) ?? 0}
              status={role}
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}
