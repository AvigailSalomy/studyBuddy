import { JoinRequestsSection } from "@/components/join-requests-section";
import type { PendingJoinRequest } from "@/types/join-request";

export function JoinRequestsTab({
  requests,
}: {
  requests: PendingJoinRequest[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Join requests</h2>
      <JoinRequestsSection requests={requests} />
    </div>
  );
}
