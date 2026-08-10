"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/actions/tasks";
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

export function TaskCreateForm({
  groupId,
  members,
}: {
  groupId: string;
  members: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await createTask(groupId, {
        title,
        description,
        assigneeId,
        dueDate,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-description">Description (optional)</Label>
        <Input
          id="task-description"
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
            {/* Base UI's SelectValue doesn't read labels off SelectItem
                children automatically -- without an items list on
                Select.Root, it just echoes the raw value back (a uuid,
                here) unless given this render-prop form to resolve
                value -> label itself. The underlying value stays
                member.id either way; only the displayed text changes. */}
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
        <Label htmlFor="task-due-date">Due date (optional)</Label>
        <Input
          id="task-due-date"
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
      {saved && !error && (
        <p role="status" className="text-sm text-green-600 dark:text-green-500">
          Task created.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Creating..." : "Create task"}
      </Button>
    </form>
  );
}
