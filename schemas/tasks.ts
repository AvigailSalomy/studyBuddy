import { z } from "zod";
import { normalizeWhitespace } from "@/lib/text";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

// assigneeId/dueDate are kept as plain strings ("" means "not set"),
// same convention as groups.targetDegree/targetYear (schemas/groups.ts)
// -- sidesteps optional-field edge cases with an empty <select>/<input
// type="date">, and the Server Action converts "" to null. Real
// validation of assigneeId (must be a current group member) and dueDate
// (must be a valid, non-past date) happens in the action, not here --
// neither check can be done with static schema rules alone.
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200)
    .transform(normalizeWhitespace),
  description: z.string().trim().max(2000).transform(normalizeWhitespace),
  assigneeId: z.string(),
  dueDate: z.string(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
