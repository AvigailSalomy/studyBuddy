"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil } from "lucide-react";
import type { TaskRow } from "@/types/task";
import { TaskStatusControl } from "@/components/task-status-control";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { TaskEditForm } from "@/components/task-edit-form";
import { Avatar } from "@/components/ui/avatar";
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
  isOwner,
}: {
  task: TaskRow;
  members: { id: string; full_name: string }[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  // Edit stays creator-only, deliberately not extended to the owner --
  // only Delete gets the owner bypass (see canDelete below).
  const isCreator = task.created_by === currentUserId;
  const canDelete = isCreator || isOwner;

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
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
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug font-medium">{task.title}</span>
        {isCreator && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      {task.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Avatar name={task.assignee?.full_name ?? "?"} size="sm" />
        {task.assignee?.full_name ?? "Unassigned"}
      </span>

      {task.due_date && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          {/* Explicit locale (en-GB) + timeZone: "UTC" -- due_date is a
              plain `date` column with no time-of-day, and new
              Date("2026-08-26") parses as UTC midnight, so pinning UTC
              here (not just the locale) avoids both a hydration
              mismatch and an off-by-one-day display for viewers behind
              UTC. */}
          Due{" "}
          {new Date(task.due_date).toLocaleDateString("en-GB", {
            timeZone: "UTC",
          })}
        </span>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <TaskStatusControl taskId={task.id} status={task.status} />
        {canDelete && <TaskDeleteButton taskId={task.id} />}
      </div>
    </div>
  );
}
