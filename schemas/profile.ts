import { z } from "zod";

export const completeProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  institution: z.string().trim().min(1, "Institution is required"),
  faculty: z.string().trim().min(1, "Faculty is required"),
  degree: z.string().trim().min(1, "Degree/track is required"),
  studyYear: z.coerce.number().int().min(1).max(8),
  courseIds: z.array(z.uuid()).min(1, "Select at least one course"),
});

// z.coerce.number() accepts unknown input (e.g. the string a number <input>
// produces) and outputs a number, so the form's raw field values and the
// schema's validated output are different types -- both are needed to type
// useForm() correctly with a resolver.
export type CompleteProfileFormInput = z.input<typeof completeProfileSchema>;
export type CompleteProfileInput = z.output<typeof completeProfileSchema>;
