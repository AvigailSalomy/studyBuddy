"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus } from "@/actions/tasks";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/schemas/tasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Any approved group member may change a task's status, not just its
// creator or assignee -- matches tasks_update_members (RLS) and the
// product's collaborative-task-board framing.
export function TaskStatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: TaskStatus | null) {
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, value);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select value={status} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger size="sm">
          {/* Same fix as the assignee dropdown in TaskCreateForm: Base
              UI's SelectValue doesn't resolve a label from SelectItem
              children on its own, so without this it would show the
              raw "in_progress" instead of "In progress". */}
          <SelectValue>
            {(value: TaskStatus | null) =>
              value ? TASK_STATUS_LABELS[value] : ""
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {TASK_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
