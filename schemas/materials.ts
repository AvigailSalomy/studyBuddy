import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

export const MATERIAL_CATEGORIES = [
  "summary",
  "exercise",
  "past_exam",
  "other",
] as const;

export const materialCategorySchema = z.enum(MATERIAL_CATEGORIES);

export type MaterialCategory = z.infer<typeof materialCategorySchema>;

// title is a separate, user-facing label from file_name (the original
// uploaded filename, untouched) -- e.g. title "Machine Learning Exam
// Summary" for a file named "machine_learning_notes.pdf". Normalized
// the same way as every other free-text field in this app (trim +
// collapse internal whitespace), not just trimmed.
export const materialUploadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200)
    .transform(normalizeWhitespace),
  category: materialCategorySchema,
});

export type MaterialUploadInput = z.infer<typeof materialUploadSchema>;

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  summary: "Summary",
  exercise: "Exercise",
  past_exam: "Past exam",
  other: "Other",
};

export const MAX_MATERIAL_FILE_SIZE = 20 * 1024 * 1024; // 20MB, matches the bucket's file_size_limit

export const ALLOWED_MATERIAL_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
] as const;

export const ALLOWED_MATERIAL_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
] as const;
