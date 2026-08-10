"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type ChatMessageInsertRow = { sender_id: string };

// Renders nothing -- a Realtime subscription that keeps the Dashboard's
// New Messages card (and its unread counts) current while the page is
// open, by triggering a normal Server Component refetch instead of
// re-deriving unread_chat_summary()'s shaping logic client-side.
//
// Deliberately unfiltered (no `filter: group_id=in.(...)`):
// chat_messages_select_members already restricts delivery to groups
// this user belongs to, so a filter here would only be an efficiency
// tweak, not a security boundary -- and building one would need an
// extra "my group ids" query this component intentionally skips.
export function UnreadWatcher({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function subscribe() {
      // Same fix as ChatPanel: without awaiting this first, a channel
      // created before the browser client's auth state has resolved
      // joins as anon and never receives events RLS would otherwise
      // allow through.
      await supabase.auth.getSession();
      if (cancelled) return;

      channel = supabase
        .channel("dashboard-unread-chat")
        .on<ChatMessageInsertRow>(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            if (payload.new.sender_id === currentUserId) return;
            router.refresh();
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
  }, [currentUserId, router]);

  return null;
}
