"use client";

import { useState, useTransition } from "react";
import { updateMeetingDetails } from "@/actions/meetings";
import {
  localDateTimeToUtcIso,
  utcIsoToLocalDateTimeInputValue,
} from "@/lib/datetime";
import type { MeetingRow } from "@/types/meeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MeetingEditForm({
  meeting,
  onCancel,
  onSaved,
}: {
  meeting: MeetingRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [meetingTimeLocal, setMeetingTimeLocal] = useState(() =>
    utcIsoToLocalDateTimeInputValue(meeting.meeting_time),
  );
  const [locationOrLink, setLocationOrLink] = useState(
    meeting.location_or_link ?? "",
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const meetingTimeUtc = localDateTimeToUtcIso(meetingTimeLocal);
    if (!meetingTimeUtc) {
      setError("Choose a valid date and time.");
      return;
    }

    startTransition(async () => {
      const result = await updateMeetingDetails(meeting.id, {
        title,
        meetingTime: meetingTimeUtc,
        locationOrLink,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`meeting-edit-title-${meeting.id}`}>Title</Label>
        <Input
          id={`meeting-edit-title-${meeting.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`meeting-edit-time-${meeting.id}`}>
          Date and time
        </Label>
        <Input
          id={`meeting-edit-time-${meeting.id}`}
          type="datetime-local"
          value={meetingTimeLocal}
          onChange={(e) => setMeetingTimeLocal(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`meeting-edit-location-${meeting.id}`}>
          Location or meeting link (optional)
        </Label>
        <Input
          id={`meeting-edit-location-${meeting.id}`}
          value={locationOrLink}
          onChange={(e) => setLocationOrLink(e.target.value)}
          placeholder="University Library, Room 204 or https://..."
          autoComplete="off"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
