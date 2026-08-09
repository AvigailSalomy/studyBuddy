import Link from "next/link";
import { BookOpen, Users2, Target, type LucideIcon } from "lucide-react";
import {
  GROUP_CARD_STATUS_LABELS,
  GROUP_TYPE_LABELS,
  type GroupCardData,
  type GroupCardStatus,
} from "@/types/group";
import { Badge } from "@/components/ui/badge";
import { isHttpUrl } from "@/lib/format";

const STATUS_BADGE_VARIANT: Record<
  GroupCardStatus,
  "warning" | "success" | "muted"
> = {
  owner: "warning",
  member: "success",
  pending: "muted",
};

export function GroupCard({
  group,
  memberCount,
  status,
}: {
  group: GroupCardData;
  memberCount: number;
  status: GroupCardStatus | null;
}) {
  const isOnlineLink = group.location_or_link
    ? isHttpUrl(group.location_or_link)
    : false;
  const capacityPct = Math.min(
    100,
    Math.round((memberCount / group.max_members) * 100),
  );

  return (
    <Link href={`/groups/${group.id}`} className="block h-full">
      <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <h3 className="leading-snug font-semibold">{group.name}</h3>
          {status && (
            <Badge variant={STATUS_BADGE_VARIANT[status]}>
              {GROUP_CARD_STATUS_LABELS[status]}
            </Badge>
          )}
        </div>

        {group.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {group.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Chip icon={BookOpen}>{group.course.course_name}</Chip>
          <Chip icon={Users2}>{GROUP_TYPE_LABELS[group.group_type]}</Chip>
          <Chip icon={Target}>
            {group.target_degree ?? "Any degree"}
            {group.target_year ? ` · Y${group.target_year}` : ""}
          </Chip>
        </div>

        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Members</span>
            <span className="font-medium text-foreground">
              {memberCount}/{group.max_members}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          {group.location_or_link && (
            <p className="truncate text-xs text-muted-foreground">
              {isOnlineLink ? "Online" : group.location_or_link}
            </p>
          )}
          {!status && (
            <span className="mt-1 text-sm font-medium text-primary">
              View group →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3" />
      {children}
    </span>
  );
}
