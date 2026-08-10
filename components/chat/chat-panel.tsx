"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, markChatRead } from "@/actions/chat";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { EmptyState } from "@/components/empty-state";
import type { ChatMessageRow } from "@/types/chat";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

// The raw row shape a chat_messages INSERT event carries -- Realtime's
// Postgres Changes payload is the table's own columns only (no
// resource embedding over the WAL), so it never includes the joined
// sender profile the initial history fetch gets via
// `sender:profiles!sender_id(...)`.
type ChatMessageInsertRow = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function ChatPanel({
  groupId,
  currentUserId,
  memberNames,
  initialMessages,
}: {
  groupId: string;
  currentUserId: string;
  memberNames: Map<string, string>;
  initialMessages: ChatMessageRow[];
}) {
  const [messages, setMessages] = useState<ChatMessageRow[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const seenMessageIds = useRef(new Set(initialMessages.map((m) => m.id)));
  // Whether the reader was near the bottom *before* the latest message
  // list change -- computed on scroll, not on the new message itself,
  // so someone who has intentionally scrolled up to read older history
  // is never yanked back down.
  const shouldAutoScroll = useRef(true);
  const isFirstRender = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isFirstRender.current) {
      // Jump straight to the newest message on first open -- no
      // animation, no "was I near the bottom" check needed yet.
      el.scrollTop = el.scrollHeight;
      isFirstRender.current = false;
      return;
    }
    if (shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Marks read on open, and again whenever the visible message list
  // grows while this panel stays mounted -- a message that arrives live
  // while the user is actively looking at this chat shouldn't later show
  // up as unread on the Dashboard. `messages.length` (not `messages`
  // itself) is the dependency deliberately: this only needs to re-fire
  // when a message is added, not on every render. Best-effort: a failure
  // here only leaves an unread count stale elsewhere, nothing in this
  // panel depends on its result, so errors are swallowed rather than
  // surfaced to the reader.
  useEffect(() => {
    markChatRead(groupId).catch(() => {});
  }, [groupId, messages.length]);

  function appendMessage(message: ChatMessageRow) {
    if (seenMessageIds.current.has(message.id)) return;
    seenMessageIds.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  }

  // Subscribed only while this panel is mounted -- GroupTabs already
  // renders just the active tab's content, so opening a different tab
  // (or navigating to a different group) unmounts this and runs the
  // cleanup below; the groupId dependency covers it defensively too.
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function subscribe() {
      // The browser client attaches the signed-in user's JWT to the
      // realtime socket asynchronously (via its own internal auth-state
      // resolution) -- awaiting getSession() here guarantees that has
      // already happened before we join, so the channel authenticates
      // as this user (not anon) from its very first join. Without this,
      // a channel created before that resolution completes joins
      // unauthenticated: chat_messages_select_members never matches (no
      // auth.uid()), so it silently never receives postgres_changes
      // events for this group.
      await supabase.auth.getSession();
      // The effect's cleanup can run before this resolves (e.g. React
      // Strict Mode's dev-only mount -> cleanup -> mount, or a fast tab
      // switch) -- bail out rather than join a channel nothing will
      // ever clean up.
      if (cancelled) return;

      channel = supabase
        .channel(`chat:${groupId}`)
        .on<ChatMessageInsertRow>(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            const row = payload.new;
            appendMessage({
              id: row.id,
              content: row.content,
              created_at: row.created_at,
              sender_id: row.sender_id,
              sender: null,
            });
          },
        )
        .subscribe();
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [groupId]);

  async function handleSend(content: string) {
    setError(null);
    setIsSending(true);
    const result = await sendChatMessage(groupId, { content });
    setIsSending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    // Direct local append of the server-confirmed row -- not
    // router.refresh(). The realtime INSERT for this same row will
    // also arrive shortly (this client is subscribed to its own
    // group's channel too); appendMessage's id check drops that
    // duplicate rather than showing the message twice.
    appendMessage(result.message);
  }

  function resolveSenderName(message: ChatMessageRow): string {
    return (
      message.sender?.full_name ?? memberNames.get(message.sender_id) ?? "Member"
    );
  }

  return (
    <div className="flex h-[32rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircle className="size-4 text-primary" />
        <span className="text-sm font-semibold">Group Chat</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {memberNames.size} member{memberNames.size === 1 ? "" : "s"}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Say hello to get the conversation started."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                senderName={resolveSenderName(message)}
                isOwn={message.sender_id === currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="shrink-0 px-4 pb-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="shrink-0">
        <ChatComposer onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
