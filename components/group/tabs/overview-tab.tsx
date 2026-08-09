"use client";

import {
  Info,
  Calendar,
  Zap,
  CheckSquare,
  FolderOpen,
  Users,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MeetingTimeDisplay } from "@/components/meeting-time-display";
import { MeetingDateBadge } from "@/components/meeting-date-badge";
import { TaskStatusBadge } from "@/components/task-status-badge";
import { type GroupDetailData } from "@/types/group";
import {
  GROUP_MEMBER_ROLE_LABELS,
  type GroupMemberRow,
} from "@/types/group-member";
import type { MaterialRow } from "@/types/material";
import type { TaskRow } from "@/types/task";
import type { MeetingRow } from "@/types/meeting";
import { MATERIAL_CATEGORY_LABELS } from "@/schemas/materials";
import { isHttpUrl, formatFileSize } from "@/lib/format";

export function OverviewTab({
  group,
  ownerName,
  memberCount,
  createdAt,
  isMember,
  isOwner,
  members,
  materials,
  tasks,
  meetings,
  pendingRequestCount,
  onNavigate,
}: {
  group: GroupDetailData;
  ownerName: string;
  memberCount: number;
  createdAt: string | null;
  isMember: boolean;
  isOwner: boolean;
  members: GroupMemberRow[] | null;
  materials: MaterialRow[] | null;
  tasks: TaskRow[] | null;
  meetings: MeetingRow[] | null;
  pendingRequestCount: number;
  onNavigate: (tab: string, panel?: string) => void;
}) {
  const capacityPct = Math.min(
    100,
    Math.round((memberCount / group.max_members) * 100),
  );
  const nextMeeting = meetings?.[0] ?? null;
  const upcomingTasks = (tasks ?? []).slice(0, 3);
  const recentMaterials = (materials ?? []).slice(0, 3);
  const memberPreview = (members ?? []).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard title="Group" icon={Info}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Owner</span>
          <span className="flex items-center gap-2 font-medium">
            <Avatar name={ownerName} size="sm" />
            {ownerName}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="font-medium">
              {memberCount}/{group.max_members}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        )}
        {createdAt && (
          // Explicit locale, timeZone deliberately left unpinned here
          // (created_at is a genuine timestamptz) -- suppressHydrationWarning
          // because, unlike the old Server-Component-only display of this
          // same field, this now renders inside a client component, so a
          // server/client timezone difference near a day boundary could
          // otherwise produce a hydration mismatch (same class of issue
          // MeetingTimeDisplay already handles the same way).
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            Created {new Date(createdAt).toLocaleDateString("en-GB")}
          </p>
        )}
        {!isMember && (
          <p className="text-xs text-muted-foreground">
            Join this group to see materials, tasks, meetings, and members.
          </p>
        )}
      </SectionCard>

      {isMember && (
        <SectionCard
          title="Upcoming meeting"
          icon={Calendar}
          action={
            <TabLink onClick={() => onNavigate("meetings")}>View all</TabLink>
          }
        >
          {nextMeeting ? (
            <div className="flex items-start gap-3">
              <MeetingDateBadge meetingTime={nextMeeting.meeting_time} />
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{nextMeeting.title}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  <MeetingTimeDisplay meetingTime={nextMeeting.meeting_time} />
                </span>
                {nextMeeting.location_or_link && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {isHttpUrl(nextMeeting.location_or_link)
                      ? "Online"
                      : nextMeeting.location_or_link}
                  </span>
                )}
                {nextMeeting.location_or_link &&
                  isHttpUrl(nextMeeting.location_or_link) && (
                    <a
                      href={nextMeeting.location_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      Join meeting <ExternalLink className="size-3" />
                    </a>
                  )}
              </div>
            </div>
          ) : (
            <EmptyState icon={Calendar} title="No upcoming meetings" />
          )}
        </SectionCard>
      )}

      {isMember && (
        <SectionCard title="Quick actions" icon={Zap}>
          <QuickAction
            icon={Upload}
            label="Upload material"
            onClick={() => onNavigate("materials", "upload")}
          />
          <QuickAction
            icon={Plus}
            label="Create task"
            onClick={() => onNavigate("tasks", "create")}
          />
          <QuickAction
            icon={Calendar}
            label="Schedule meeting"
            onClick={() => onNavigate("meetings", "schedule")}
          />
          {isOwner && (
            <QuickAction
              icon={UserPlus}
              label={
                pendingRequestCount > 0
                  ? `Review join requests (${pendingRequestCount})`
                  : "Manage join requests"
              }
              onClick={() => onNavigate("join-requests")}
            />
          )}
        </SectionCard>
      )}

      {isMember && (
        <SectionCard
          title="Tasks"
          icon={CheckSquare}
          action={
            <TabLink onClick={() => onNavigate("tasks")}>View all</TabLink>
          }
        >
          {upcomingTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              action={
                <Button size="sm" onClick={() => onNavigate("tasks", "create")}>
                  Create task
                </Button>
              }
            />
          ) : (
            upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{task.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {task.assignee?.full_name ?? "Unassigned"}
                    {task.due_date &&
                      ` · Due ${new Date(task.due_date).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}
                  </span>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
            ))
          )}
        </SectionCard>
      )}

      {isMember && (
        <SectionCard
          title="Recent materials"
          icon={FolderOpen}
          action={
            <TabLink onClick={() => onNavigate("materials")}>View all</TabLink>
          }
        >
          {recentMaterials.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No materials uploaded yet"
              action={
                <Button
                  size="sm"
                  onClick={() => onNavigate("materials", "upload")}
                >
                  Upload material
                </Button>
              }
            />
          ) : (
            recentMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 text-sm"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{material.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {MATERIAL_CATEGORY_LABELS[material.category]} ·{" "}
                    {formatFileSize(material.file_size)}
                  </span>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      )}

      {isMember && (
        <SectionCard
          title="Members"
          icon={Users}
          action={
            <TabLink onClick={() => onNavigate("members")}>View all</TabLink>
          }
        >
          {memberPreview.map((member) => (
            <div
              key={member.profile.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Avatar name={member.profile.full_name} size="sm" />
                {member.profile.full_name}
              </span>
              <Badge variant={member.role === "owner" ? "warning" : "muted"}>
                {GROUP_MEMBER_ROLE_LABELS[member.role]}
              </Badge>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" />
          {title}
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function TabLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </span>
      {label}
    </button>
  );
}

