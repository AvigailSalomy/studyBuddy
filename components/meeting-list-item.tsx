"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Link as LinkIcon, Pencil } from "lucide-react";
import type { MeetingRow } from "@/types/meeting";
import { isHttpUrl } from "@/lib/format";
import { MeetingDeleteButton } from "@/components/meeting-delete-button";
import { MeetingEditForm } from "@/components/meeting-edit-form";
import { MeetingTimeDisplay } from "@/components/meeting-time-display";
import { MeetingDateBadge } from "@/components/meeting-date-badge";
import { Button } from "@/components/ui/button";

// Owns the show/edit toggle for a single meeting row -- extracted out
// of the group page's Server Component for the same reason
// TaskListItem is: switching a specific row between its normal display
// and an inline edit form needs local client state.
export function MeetingListItem({
  meeting,
  currentUserId,
  isOwner,
}: {
  meeting: MeetingRow;
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  // Edit and Delete share the same rule for Meetings: the creator (while
  // still a member) or the group owner -- matches
  // meetings_update_creator_or_owner / meetings_delete_creator_or_owner.
  const isCreator = meeting.created_by === currentUserId;
  const canManage = isCreator || isOwner;

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <MeetingEditForm
          meeting={meeting}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  const isOnlineLink = meeting.location_or_link
    ? isHttpUrl(meeting.location_or_link)
    : false;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <MeetingDateBadge meetingTime={meeting.meeting_time} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium">{meeting.title}</span>
          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                aria-label="Edit meeting"
              >
                <Pencil className="size-3.5" />
              </Button>
              <MeetingDeleteButton meetingId={meeting.id} />
            </div>
          )}
        </div>

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          <MeetingTimeDisplay meetingTime={meeting.meeting_time} />
        </span>

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {meeting.location_or_link ? (
            isOnlineLink ? (
              <>
                <LinkIcon className="size-3.5 shrink-0" />
                <a
                  href={meeting.location_or_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate underline underline-offset-2"
                >
                  {meeting.location_or_link}
                </a>
              </>
            ) : (
              <>
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{meeting.location_or_link}</span>
              </>
            )
          ) : (
            "Location not specified"
          )}
        </span>

        {meeting.creator && (
          <span className="text-xs text-muted-foreground">
            Created by {meeting.creator.full_name}
          </span>
        )}
      </div>
    </div>
  );
}
