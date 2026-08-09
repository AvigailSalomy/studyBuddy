import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/schemas/tasks";

// Shared by the group Overview tab and the Dashboard's My Tasks card --
// both show the same status pill for a task, so the status -> variant
// mapping lives in one place instead of being duplicated.
const TASK_STATUS_BADGE_VARIANT: Record<
  TaskStatus,
  "muted" | "default" | "success"
> = {
  todo: "muted",
  in_progress: "default",
  done: "success",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={TASK_STATUS_BADGE_VARIANT[status]}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
