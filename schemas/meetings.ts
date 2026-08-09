import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

// Shared by meeting creation and meeting editing -- both collect
// exactly the same fields. meetingTime is a full ISO 8601 UTC instant
// (e.g. "2026-08-15T18:00:00.000Z"), already converted from the
// browser's local <input type="datetime-local"> value on the client
// before this ever reaches the server -- see lib/datetime.ts for why
// that conversion has to happen client-side. Future-ness is checked in
// the Server Action, not here, since "now" needs to be evaluated at
// submit time, not schema definition time.
export const meetingDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200)
    .transform(normalizeWhitespace),
  meetingTime: z.iso.datetime({ message: "Invalid date/time." }),
  locationOrLink: z.string().trim().max(500).transform(normalizeWhitespace),
});

export type MeetingDetailsInput = z.infer<typeof meetingDetailsSchema>;
