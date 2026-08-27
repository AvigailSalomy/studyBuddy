"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteGroup } from "@/actions/groups";
import { Button } from "@/components/ui/button";

// Only ever rendered for the owner (see GroupHeader) -- but that's a UI
// convenience, not the security boundary: deleteGroup re-checks
// ownership server-side, and the underlying RLS policy independently
// refuses to delete any group whose owner_id doesn't match auth.uid().
export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/dashboard?scope=mine");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex w-64 flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs font-semibold text-foreground">
          Delete this group?
        </p>
        <p className="text-xs text-muted-foreground">
          This action cannot be undone. All materials, chat messages,
          meetings, and tasks in this group will be permanently deleted.
        </p>
        <div className="flex items-center gap-2 self-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete group"}
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
    <Button
      size="sm"
      variant="outline"
      onClick={() => setConfirming(true)}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-3.5" />
      Delete group
    </Button>
  );
}
