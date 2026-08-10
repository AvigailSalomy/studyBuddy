"use client";

import { useState, useTransition } from "react";
import { updateTaskDetails } from "@/actions/tasks";
import type { TaskRow } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNASSIGNED = "unassigned";

// Status is deliberately not editable here -- that stays exclusively
// TaskStatusControl's responsibility, available to every member
// regardless of who created the task.
export function TaskEditForm({
  task,
  members,
  onCancel,
  onSaved,
}: {
  task: TaskRow;
  members: { id: string; full_name: string }[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateTaskDetails(task.id, {
        title,
        description,
        assigneeId,
        dueDate,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`task-edit-title-${task.id}`}>Title</Label>
        <Input
          id={`task-edit-title-${task.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`task-edit-description-${task.id}`}>
          Description (optional)
        </Label>
        <Input
          id={`task-edit-description-${task.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Assigned to (optional)</Label>
        <Select
          value={assigneeId || UNASSIGNED}
          onValueChange={(value) =>
            setAssigneeId(!value || value === UNASSIGNED ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unassigned">
              {(value: string | null) => {
                if (!value || value === UNASSIGNED) return "Unassigned";
                return (
                  members.find((member) => member.id === value)?.full_name ??
                  "Unassigned"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`task-edit-due-date-${task.id}`}>
          Due date (optional)
        </Label>
        <Input
          id={`task-edit-due-date-${task.id}`}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          autoComplete="off"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
