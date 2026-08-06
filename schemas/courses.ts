import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

// Whitespace-normalized (not just trimmed): course_name is only
// case-folded (lower()) in the DB's uniqueness index, not
// whitespace-collapsed, so "Data  Structures" (double space) and
// "Data Structures" would otherwise be treated as different courses --
// and an ILIKE substring search for one wouldn't find the other either.
export const courseSearchSchema = z.object({
  query: z.string().trim().min(1).max(200).transform(normalizeWhitespace),
});

export const createCourseSchema = z.object({
  courseName: z
    .string()
    .trim()
    .min(1, "Course name is required")
    .max(200)
    .transform(normalizeWhitespace),
});

export type CourseSearchInput = z.infer<typeof courseSearchSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
