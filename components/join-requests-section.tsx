"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, UserPlus } from "lucide-react";
import { approveJoinRequest, rejectJoinRequest } from "@/actions/join-requests";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import type { PendingJoinRequest } from "@/types/join-request";

// Only ever rendered for the group owner (see JoinRequestsTab / the
// isOwner gate in app/groups/[id]/page.tsx) -- but that's a UI
// convenience, not the security boundary: approveJoinRequest/
// rejectJoinRequest re-check ownership server-side regardless of who
// calls them.
export function JoinRequestsSection({
  requests,
}: {
  requests: PendingJoinRequest[];
}) {
  const router = useRouter();

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No pending requests"
        description="Requests to join this group will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <JoinRequestRow
          key={request.id}
          request={request}
          onHandled={() => router.refresh()}
        />
      ))}
    </div>
  );
}

// Exported so the Dashboard's Pending Join Requests card (which spans
// every group the viewer owns, not just one) can reuse the exact same
// approve/reject Server Action calls and confirm/error state instead of
// re-implementing them -- groupName is the only addition, shown when a
// row needs to say *which* group the request is for.
export function JoinRequestRow({
  request,
  groupName,
  onHandled,
}: {
  request: PendingJoinRequest;
  groupName?: string;
  onHandled: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    setAction("approve");
    startTransition(async () => {
      const result = await approveJoinRequest(request.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onHandled();
    });
  }

  function handleReject() {
    setError(null);
    setAction("reject");
    startTransition(async () => {
      const result = await rejectJoinRequest(request.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onHandled();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar name={request.profile.full_name} />
        <div className="flex flex-col text-sm">
          <span className="font-medium">{request.profile.full_name}</span>
          {groupName && (
            <span className="text-xs font-medium text-primary">
              {groupName}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {request.profile.institution} · {request.profile.faculty} ·{" "}
            {request.profile.degree} · Year {request.profile.study_year}
          </span>
          {error && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={handleApprove} disabled={isPending}>
          <Check className="size-3.5" />
          {isPending && action === "approve" ? "Approving..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
        >
          <X className="size-3.5" />
          {isPending && action === "reject" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
    </div>
  );
}
