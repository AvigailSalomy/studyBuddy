import { z } from "zod";

// Basic academic profile fields. Used both at onboarding (create) and on
// the profile page (edit) -- the two flows collect exactly the same data,
// just via different Server Actions. Course management lives entirely in
// group creation now (see actions/courses.ts), not on the profile.
export const profileBasicsSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  institution: z.string().trim().min(1, "Institution is required"),
  faculty: z.string().trim().min(1, "Faculty is required"),
  degree: z.string().trim().min(1, "Degree/track is required"),
  studyYear: z.coerce.number().int().min(1).max(8),
});

// z.coerce.number() accepts unknown input (e.g. the string a number <input>
// produces) and outputs a number, so the form's raw field values and the
// schema's validated output are different types -- both are needed to type
// useForm() correctly with a resolver.
export type ProfileBasicsFormInput = z.input<typeof profileBasicsSchema>;
export type ProfileBasicsInput = z.output<typeof profileBasicsSchema>;
