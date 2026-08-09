"use client";

import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { JoinRequestRow } from "@/components/join-requests-section";
import { SectionShell } from "@/components/dashboard/section-shell";
import type { OwnerPendingRequest } from "@/types/dashboard";

// Reuses JoinRequestRow (and, through it, the exact same
// approveJoinRequest/rejectJoinRequest Server Actions and RLS-backed
// authorization as the per-group Join Requests tab) -- only the "use
// client" + router.refresh() wiring is duplicated, not the approval
// logic itself. Only rendered by DashboardHome when requests.length > 0.
export function PendingRequestsCard({
  requests,
}: {
  requests: OwnerPendingRequest[];
}) {
  const router = useRouter();

  return (
    <SectionShell
      title="Pending Join Requests"
      icon={UserPlus}
      badge={`${requests.length} pending`}
      className="lg:col-span-2"
    >
      <div className="flex flex-col gap-2">
        {requests.map((request) => (
          <JoinRequestRow
            key={request.id}
            request={request}
            groupName={request.group.name}
            onHandled={() => router.refresh()}
          />
        ))}
      </div>
    </SectionShell>
  );
}
