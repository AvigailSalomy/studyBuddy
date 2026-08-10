import { z } from "zod";

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

// Deliberately not lib/text.ts's normalizeWhitespace here -- that
// collapses every whitespace run (including newlines) to a single
// space, which is right for one-line fields (names, titles) but would
// silently destroy the intentional line breaks a chat composer's
// Shift+Enter produces. z's own .trim() only strips leading/trailing
// whitespace, which is all that's needed to reject an empty/
// whitespace-only message.
export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message can't be empty.")
    .max(MAX_CHAT_MESSAGE_LENGTH, "Message is too long."),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
