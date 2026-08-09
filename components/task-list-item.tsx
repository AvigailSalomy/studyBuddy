"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskRow } from "@/types/task";
import { TaskStatusControl } from "@/components/task-status-control";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { TaskEditForm } from "@/components/task-edit-form";
import { Button } from "@/components/ui/button";

// Owns the show/edit toggle for a single task row -- extracted out of
// the group page's Server Component because switching a specific row
// between its normal display and an inline edit form needs local
// client state, the same reason TaskDeleteButton owns its own
// confirm-step state.
export function TaskListItem({
  task,
  members,
  currentUserId,
}: {
  task: TaskRow;
  members: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const isCreator = task.created_by === currentUserId;

  if (isEditing) {
    return (
      <div className="rounded-md border p-3">
        <TaskEditForm
          task={task}
          members={members}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
      <div className="flex flex-col">
        <span className="font-medium">{task.title}</span>
        {task.description && (
          <span className="text-xs text-muted-foreground">
            {task.description}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {task.assignee?.full_name ?? "Unassigned"}
          {task.due_date &&
            // Explicit locale so the server-rendered HTML and the
            // client's hydration pass produce identical text (an
            // unspecified locale falls back to each environment's own
            // default, which differ between server and browser --
            // that mismatch, not a real data difference, is what was
            // reported). timeZone: "UTC" matters separately: due_date
            // is a plain `date` column with no time-of-day, and
            // new Date("2026-08-26") parses as UTC midnight -- without
            // pinning the timezone, toLocaleDateString would convert
            // that instant into the *runtime's* local zone and could
            // display the day before for viewers behind UTC.
            ` · Due ${new Date(task.due_date).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TaskStatusControl taskId={task.id} status={task.status} />
        {isCreator && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
        {isCreator && <TaskDeleteButton taskId={task.id} />}
      </div>
    </div>
  );
}
