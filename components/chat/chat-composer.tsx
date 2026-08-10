"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CHAT_MESSAGE_LENGTH } from "@/schemas/chat";

// Enter sends; Shift+Enter inserts a newline (kept, since content isn't
// whitespace-normalized -- see schemas/chat.ts). No client-side "empty
// message" error round-trip: Send just stays inertly disabled instead,
// which is the expected feel for a chat composer specifically (unlike
// this app's other create forms, which do let the server reject an
// empty submission and show the error).
export function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled;

  function handleSend() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border bg-card p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message the group..."
        aria-label="Message"
        rows={1}
        maxLength={MAX_CHAT_MESSAGE_LENGTH}
        disabled={disabled}
        autoComplete="off"
        className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      />
      <Button
        type="button"
        size="icon"
        aria-label="Send message"
        disabled={!canSend}
        onClick={handleSend}
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
