"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestToJoin } from "@/actions/join-requests";
import { Button } from "@/components/ui/button";

export function JoinRequestButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await requestToJoin(groupId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRequested(true);
      router.refresh();
    });
  }

  if (requested) {
    return (
      <Button disabled variant="outline">
        Request pending
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Requesting..." : "Request to join"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
