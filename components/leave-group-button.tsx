"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { leaveGroup } from "@/actions/groups";
import { Button } from "@/components/ui/button";

// Only ever rendered for a non-owner member (see GroupHeader) -- but
// that's a UI convenience, not the security boundary: leaveGroup
// re-checks membership and ownership server-side, and the underlying
// RLS policy independently refuses to ever delete the owner's own row.
//
// On success, navigates away entirely (router.push, not just
// router.refresh) rather than staying on this page -- the group page's
// already-fetched member-only data (materials/tasks/meetings/chat/
// members) lives in this page's own React state and wouldn't otherwise
// disappear just because the underlying membership row is gone.
export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLeave() {
    setError(null);
    startTransition(async () => {
      const result = await leaveGroup(groupId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex w-64 flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs font-semibold text-foreground">
          Leave this group?
        </p>
        <p className="text-xs text-muted-foreground">
          You&apos;ll lose access to this group&apos;s chat, materials, tasks,
          meetings, and member list. Your previous contributions will
          remain.
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
            onClick={handleLeave}
            disabled={isPending}
          >
            {isPending ? "Leaving..." : "Leave group"}
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
      <LogOut className="size-3.5" />
      Leave group
    </Button>
  );
}
