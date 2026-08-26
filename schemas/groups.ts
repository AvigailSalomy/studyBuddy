import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

// Shared by group creation and group editing -- both collect exactly the
// same fields. targetDegree/targetYear/description are kept as plain
// strings here (not z.coerce/optional) -- empty string means "no
// preference"/"not set", and the Server Action converts that to null
// before writing to the nullable DB columns. This sidesteps the edge
// cases of combining z.coerce.number().optional() with an empty
// <input> (Number("") is 0, not undefined, which would otherwise fail
// validation instead of being treated as "cleared").
//
// targetDegree is whitespace-normalized (not just trimmed) so it stays
// comparable to profiles.degree, which goes through the same
// normalization -- see schemas/profile.ts.
export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(200),
  description: z.string().trim().max(2000),
  groupType: z.enum(["study", "project"]),
  courseId: z.uuid("Select or create a course first"),
  targetDegree: z.string().trim().max(200).transform(normalizeWhitespace),
  targetYear: z.string().trim(),
  maxMembers: z.coerce
    .number()
    .int()
    .min(2, "Must allow at least 2 members")
    .max(500),
});

export type GroupFormInput = z.input<typeof groupSchema>;
export type GroupInput = z.output<typeof groupSchema>;
