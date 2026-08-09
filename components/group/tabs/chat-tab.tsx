import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

// Visual placeholder only for this redesign milestone -- no chat
// backend (no messages table, no Realtime subscription) exists yet.
export function ChatTab() {
  return (
    <EmptyState
      icon={MessageCircle}
      title="Chat is coming soon"
      description="Group chat isn't available yet. This tab is a placeholder for an upcoming milestone."
    />
  );
}
