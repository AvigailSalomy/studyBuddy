import { cn } from "@/lib/utils";
import type { ChatMessageRow } from "@/types/chat";

// "Soft indigo/lavender" (accent) for the current user's own messages,
// "neutral/light" (muted) for everyone else's -- both are existing
// design-system tokens, not new colors.
export function ChatMessageBubble({
  message,
  senderName,
  isOwn,
}: {
  message: ChatMessageRow;
  senderName: string;
  isOwn: boolean;
}) {
  // This bubble only ever renders inside ChatPanel, a client component,
  // so this has the same SSR/hydration exposure as MeetingTimeDisplay --
  // suppressHydrationWarning for the same reason (viewer-local time is
  // expected to legitimately differ between server and client render).
  const timestamp = new Date(message.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        isOwn ? "items-end" : "items-start",
      )}
    >
      {!isOwn && (
        <span className="px-1 text-xs font-medium text-muted-foreground">
          {senderName}
        </span>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap",
          isOwn
            ? "rounded-br-sm bg-accent text-accent-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
      <span
        className="px-1 text-[11px] text-muted-foreground"
        suppressHydrationWarning
      >
        {timestamp}
      </span>
    </div>
  );
}
