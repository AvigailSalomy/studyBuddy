"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeeting } from "@/actions/meetings";
import { localDateTimeToUtcIso } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MeetingCreateForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingTimeLocal, setMeetingTimeLocal] = useState("");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const meetingTimeUtc = localDateTimeToUtcIso(meetingTimeLocal);
    if (!meetingTimeUtc) {
      setError("Choose a valid date and time.");
      return;
    }

    startTransition(async () => {
      const result = await createMeeting(groupId, {
        title,
        meetingTime: meetingTimeUtc,
        locationOrLink,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTitle("");
      setMeetingTimeLocal("");
      setLocationOrLink("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="meeting-title">Title</Label>
        <Input
          id="meeting-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="meeting-time">Date and time</Label>
        <Input
          id="meeting-time"
          type="datetime-local"
          value={meetingTimeLocal}
          onChange={(e) => setMeetingTimeLocal(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="meeting-location">
          Location or meeting link (optional)
        </Label>
        <Input
          id="meeting-location"
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
      {saved && !error && (
        <p role="status" className="text-sm text-green-600 dark:text-green-500">
          Meeting scheduled.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Scheduling..." : "Schedule meeting"}
      </Button>
    </form>
  );
}
