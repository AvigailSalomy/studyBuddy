"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMeeting } from "@/actions/meetings";
import { Button } from "@/components/ui/button";

// Only rendered for the creator in the UI, but that's a convenience,
// not the security boundary -- deleteMeeting re-checks ownership
// server-side regardless of who calls it.
export function MeetingDeleteButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMeeting(meetingId);
      if (!result.success) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Delete?</span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Confirm"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  );
}
