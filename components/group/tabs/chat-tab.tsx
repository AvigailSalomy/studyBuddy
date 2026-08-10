import { ChatPanel } from "@/components/chat/chat-panel";
import type { ChatMessageRow } from "@/types/chat";
import type { GroupMemberRow } from "@/types/group-member";

export function ChatTab({
  groupId,
  currentUserId,
  members,
  messages,
}: {
  groupId: string;
  currentUserId: string;
  members: GroupMemberRow[];
  messages: ChatMessageRow[];
}) {
  // Built once here from the roster GroupTabs already fetched for the
  // Members tab -- reused so ChatPanel can resolve a realtime message's
  // sender name without an extra per-message (or even per-mount) query.
  const memberNames = new Map(
    members.map((member) => [member.profile.id, member.profile.full_name]),
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Chat</h2>
      <ChatPanel
        groupId={groupId}
        currentUserId={currentUserId}
        memberNames={memberNames}
        initialMessages={messages}
      />
    </div>
  );
}
