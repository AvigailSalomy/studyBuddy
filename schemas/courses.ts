import { z } from "zod";

export const courseSearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export const createCourseSchema = z.object({
  courseName: z.string().trim().min(1, "Course name is required").max(200),
});

export type CourseSearchInput = z.infer<typeof courseSearchSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
