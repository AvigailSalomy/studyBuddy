import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users2,
  Target,
  Building2,
  Pencil,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JoinRequestButton } from "@/components/join-request-button";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { GROUP_TYPE_LABELS, type GroupDetailData } from "@/types/group";

// Owner/member-count/created-date live in the Overview tab's Group Info
// card instead of here -- this header stays focused on identity
// (title/description/chips) and the actions that always matter
// regardless of which tab is open (Edit group / Request to join /
// Leave group -- exactly one of these three ever applies to a given
// viewer: owner, non-member, or non-owner member, respectively).
export function GroupHeader({
  group,
  isOwner,
  isMember,
  hasPendingRequest,
}: {
  group: GroupDetailData;
  isOwner: boolean;
  isMember: boolean;
  hasPendingRequest: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
              <GraduationCap className="size-7" />
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {group.name}
              </h1>
              {group.description && (
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:pl-2">
            {isOwner && (
              <Link
                href={`/groups/${group.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Pencil className="size-3.5" />
                Edit group
              </Link>
            )}
            {!isMember &&
              (hasPendingRequest ? (
                <Badge variant="warning" className="px-3 py-1.5">
                  Request pending
                </Badge>
              ) : (
                <JoinRequestButton groupId={group.id} />
              ))}
            {isMember && !isOwner && (
              <LeaveGroupButton groupId={group.id} />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip icon={BookOpen}>{group.course.course_name}</Chip>
          <Chip icon={Users2}>{GROUP_TYPE_LABELS[group.group_type]}</Chip>
          <Chip icon={Target}>
            {group.target_degree ?? "Any degree"} ·{" "}
            {group.target_year ? `Year ${group.target_year}` : "Any year"}
          </Chip>
          <Chip icon={Building2}>{group.course.institution}</Chip>
        </div>
      </div>
    </div>
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
      <Icon className="size-3.5 text-primary" />
      {children}
    </span>
  );
}
