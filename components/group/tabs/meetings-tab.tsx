import { Calendar, Plus } from "lucide-react";
import { RevealPanel } from "@/components/group/reveal-panel";
import { MeetingCreateForm } from "@/components/meeting-create-form";
import { MeetingListItem } from "@/components/meeting-list-item";
import { EmptyState } from "@/components/empty-state";
import type { MeetingRow } from "@/types/meeting";

export function MeetingsTab({
  groupId,
  meetings,
  currentUserId,
  isOwner,
  openSchedule,
}: {
  groupId: string;
  meetings: MeetingRow[];
  currentUserId: string;
  isOwner: boolean;
  openSchedule: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Meetings</h2>
      </div>

      <RevealPanel label="Schedule meeting" icon={Plus} defaultOpen={openSchedule}>
        <MeetingCreateForm groupId={groupId} />
      </RevealPanel>

      {meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No upcoming meetings"
          description="Scheduled meetings will appear here, soonest first."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {meetings.map((meeting) => (
            <MeetingListItem
              key={meeting.id}
              meeting={meeting}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
