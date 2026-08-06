"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveJoinRequest, rejectJoinRequest } from "@/actions/join-requests";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PendingJoinRequest } from "@/types/join-request";

export function JoinRequestsSection({
  requests,
}: {
  requests: PendingJoinRequest[];
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join requests</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No pending requests.
          </p>
        )}
        {requests.map((request) => (
          <JoinRequestRow
            key={request.id}
            request={request}
            onHandled={() => router.refresh()}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function JoinRequestRow({
  request,
  onHandled,
}: {
  request: PendingJoinRequest;
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
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <p className="font-medium">{request.profile.full_name}</p>
      <p className="text-muted-foreground">
        Institution: {request.profile.institution}
      </p>
      <p className="text-muted-foreground">
        Faculty: {request.profile.faculty}
      </p>
      <p className="text-muted-foreground">Degree: {request.profile.degree}</p>
      <p className="text-muted-foreground">
        Study year: {request.profile.study_year}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleApprove} disabled={isPending}>
          {isPending && action === "approve" ? "Approving..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
        >
          {isPending && action === "reject" ? "Rejecting..." : "Reject"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
