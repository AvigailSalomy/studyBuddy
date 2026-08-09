"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingRow } from "@/types/meeting";
import { isHttpUrl } from "@/lib/format";
import { MeetingDeleteButton } from "@/components/meeting-delete-button";
import { MeetingEditForm } from "@/components/meeting-edit-form";
import { MeetingTimeDisplay } from "@/components/meeting-time-display";
import { Button } from "@/components/ui/button";

// Owns the show/edit toggle for a single meeting row -- extracted out
// of the group page's Server Component for the same reason
// TaskListItem is: switching a specific row between its normal display
// and an inline edit form needs local client state.
export function MeetingListItem({
  meeting,
  currentUserId,
}: {
  meeting: MeetingRow;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const isCreator = meeting.created_by === currentUserId;

  if (isEditing) {
    return (
      <div className="rounded-md border p-3">
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

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
      <div className="flex flex-col">
        <span className="font-medium">{meeting.title}</span>
        <span className="text-xs text-muted-foreground">
          <MeetingTimeDisplay meetingTime={meeting.meeting_time} />
        </span>
        <span className="text-xs text-muted-foreground">
          {meeting.location_or_link ? (
            isHttpUrl(meeting.location_or_link) ? (
              <a
                href={meeting.location_or_link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {meeting.location_or_link}
              </a>
            ) : (
              meeting.location_or_link
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
      {isCreator && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <MeetingDeleteButton meetingId={meeting.id} />
        </div>
      )}
    </div>
  );
}
