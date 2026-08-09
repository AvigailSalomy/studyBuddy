"use client";

import { useState } from "react";
import {
  Home,
  MessageCircle,
  FolderOpen,
  CheckSquare,
  Calendar,
  Users,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupDetailData } from "@/types/group";
import type { GroupMemberRow } from "@/types/group-member";
import type { MaterialRow } from "@/types/material";
import type { TaskRow } from "@/types/task";
import type { MeetingRow } from "@/types/meeting";
import type { PendingJoinRequest } from "@/types/join-request";
import { OverviewTab } from "@/components/group/tabs/overview-tab";
import { ChatTab } from "@/components/group/tabs/chat-tab";
import { MaterialsTab } from "@/components/group/tabs/materials-tab";
import { TasksTab } from "@/components/group/tabs/tasks-tab";
import { MeetingsTab } from "@/components/group/tabs/meetings-tab";
import { MembersTab } from "@/components/group/tabs/members-tab";
import { JoinRequestsTab } from "@/components/group/tabs/join-requests-tab";

type TabKey =
  | "overview"
  | "chat"
  | "materials"
  | "tasks"
  | "meetings"
  | "members"
  | "join-requests";

type TabDef = { key: TabKey; label: string; icon: LucideIcon; show: boolean };

// Owns which tab/panel is showing as plain client state, seeded once
// from the URL the Server Component page already parsed (initialTab/
// initialPanel), then kept in sync with the address bar via
// window.history.replaceState -- never through next/navigation's
// router. That's deliberate: going through the Next router would
// re-run app/groups/[id]/page.tsx's data fetch on every tab click
// (searchParams is part of that Server Component's input), which is
// exactly the refetch this was designed to avoid. All the data below
// (members/materials/tasks/meetings/pendingRequests) was already
// fetched once, server-side, under the same isMember/isOwner gates as
// before -- switching tabs only changes what's rendered from it.
export function GroupTabs({
  group,
  groupId,
  currentUserId,
  isOwner,
  isMember,
  ownerName,
  memberCount,
  createdAt,
  members,
  materials,
  tasks,
  meetings,
  pendingRequests,
  initialTab,
  initialPanel,
}: {
  group: GroupDetailData;
  groupId: string;
  currentUserId: string;
  isOwner: boolean;
  isMember: boolean;
  ownerName: string;
  memberCount: number;
  createdAt: string | null;
  members: GroupMemberRow[] | null;
  materials: MaterialRow[] | null;
  tasks: TaskRow[] | null;
  meetings: MeetingRow[] | null;
  pendingRequests: PendingJoinRequest[];
  initialTab?: string;
  initialPanel?: string;
}) {
  const tabs: TabDef[] = [
    { key: "overview", label: "Overview", icon: Home, show: true },
    { key: "chat", label: "Chat", icon: MessageCircle, show: isMember },
    { key: "materials", label: "Materials", icon: FolderOpen, show: isMember },
    { key: "tasks", label: "Tasks", icon: CheckSquare, show: isMember },
    { key: "meetings", label: "Meetings", icon: Calendar, show: isMember },
    { key: "members", label: "Members", icon: Users, show: isMember },
    {
      key: "join-requests",
      label: "Join Requests",
      icon: UserPlus,
      show: isOwner,
    },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const isVisibleTab = (value: string | undefined): value is TabKey =>
    !!value && visibleTabs.some((t) => t.key === value);

  const [tab, setTab] = useState<TabKey>(
    isVisibleTab(initialTab) ? initialTab : "overview",
  );
  const [panel, setPanel] = useState<string | undefined>(
    isVisibleTab(initialTab) ? initialPanel : undefined,
  );

  function navigate(nextTab: string, nextPanel?: string) {
    if (!isVisibleTab(nextTab)) return;
    setTab(nextTab);
    setPanel(nextPanel);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", nextTab);
    if (nextPanel) url.searchParams.set("panel", nextPanel);
    else url.searchParams.delete("panel");
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto border-b border-border">
        <div role="tablist" className="flex min-w-max gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => navigate(t.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <OverviewTab
          group={group}
          ownerName={ownerName}
          memberCount={memberCount}
          createdAt={createdAt}
          isMember={isMember}
          isOwner={isOwner}
          members={members}
          materials={materials}
          tasks={tasks}
          meetings={meetings}
          pendingRequestCount={pendingRequests.length}
          onNavigate={navigate}
        />
      )}
      {tab === "chat" && isMember && <ChatTab />}
      {tab === "materials" && isMember && (
        <MaterialsTab
          groupId={groupId}
          materials={materials ?? []}
          currentUserId={currentUserId}
          openUpload={panel === "upload"}
        />
      )}
      {tab === "tasks" && isMember && (
        <TasksTab
          groupId={groupId}
          tasks={tasks ?? []}
          members={(members ?? []).map((m) => m.profile)}
          currentUserId={currentUserId}
          openCreate={panel === "create"}
        />
      )}
      {tab === "meetings" && isMember && (
        <MeetingsTab
          groupId={groupId}
          meetings={meetings ?? []}
          currentUserId={currentUserId}
          openSchedule={panel === "schedule"}
        />
      )}
      {tab === "members" && isMember && <MembersTab members={members ?? []} />}
      {tab === "join-requests" && isOwner && (
        <JoinRequestsTab requests={pendingRequests} />
      )}
    </div>
  );
}
