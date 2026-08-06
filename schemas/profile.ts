import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

// Basic academic profile fields. Used both at onboarding (create) and on
// the profile page (edit) -- the two flows collect exactly the same data,
// just via different Server Actions. Course management lives entirely in
// group creation now (see actions/courses.ts), not on the profile.
//
// institution/faculty/degree are whitespace-normalized (not just
// trimmed): these values flow into courses.institution/faculty (via
// actions/courses.ts, copied from the creating user's own profile) and
// are matched against group filters/target_degree, so inconsistent
// internal spacing here would silently break those comparisons even
// with case-insensitive matching.
export const profileBasicsSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  institution: z
    .string()
    .trim()
    .min(1, "Institution is required")
    .transform(normalizeWhitespace),
  faculty: z
    .string()
    .trim()
    .min(1, "Faculty is required")
    .transform(normalizeWhitespace),
  degree: z
    .string()
    .trim()
    .min(1, "Degree/track is required")
    .transform(normalizeWhitespace),
  studyYear: z.coerce.number().int().min(1).max(8),
});

// z.coerce.number() accepts unknown input (e.g. the string a number <input>
// produces) and outputs a number, so the form's raw field values and the
// schema's validated output are different types -- both are needed to type
// useForm() correctly with a resolver.
export type ProfileBasicsFormInput = z.input<typeof profileBasicsSchema>;
export type ProfileBasicsInput = z.output<typeof profileBasicsSchema>;
