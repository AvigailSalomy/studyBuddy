import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionShell } from "@/components/dashboard/section-shell";
import type { UnreadGroupSummary } from "@/types/chat";

// Only ever rendered by DashboardHome when summaries.length > 0 (same
// "hide the section entirely when empty" convention as
// PendingRequestsCard) -- grouped by group, newest activity first
// (unread_chat_summary() already orders that way), not a single flat
// message list.
export function NewMessagesCard({
  summaries,
}: {
  summaries: UnreadGroupSummary[];
}) {
  const totalUnread = summaries.reduce((sum, s) => sum + s.unread_count, 0);

  return (
    <SectionShell
      title="New Messages"
      icon={MessageCircle}
      badge={`${totalUnread} new`}
      className="lg:col-span-2"
    >
      <div className="flex flex-col gap-2">
        {summaries.map((summary) => (
          <Link
            key={summary.group_id}
            href={`/groups/${summary.group_id}?tab=chat`}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-accent/40"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {summary.group_name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {summary.latest_sender_name}:
                </span>{" "}
                {summary.latest_message_content}
              </span>
            </div>
            <Badge className="shrink-0">
              {summary.unread_count} new
            </Badge>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
