import { CheckSquare, Plus } from "lucide-react";
import { RevealPanel } from "@/components/group/reveal-panel";
import { TaskCreateForm } from "@/components/task-create-form";
import { TaskListItem } from "@/components/task-list-item";
import { EmptyState } from "@/components/empty-state";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/schemas/tasks";
import type { TaskRow } from "@/types/task";

// Three status columns, not drag-and-drop -- status still changes only
// through TaskStatusControl's existing dropdown/action (unchanged), this
// just groups the same `tasks` array by status for display.
export function TasksTab({
  groupId,
  tasks,
  members,
  currentUserId,
  isOwner,
  openCreate,
}: {
  groupId: string;
  tasks: TaskRow[];
  members: { id: string; full_name: string }[];
  currentUserId: string;
  isOwner: boolean;
  openCreate: boolean;
}) {
  const columns: Record<TaskStatus, TaskRow[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };
  for (const task of tasks) columns[task.status].push(task);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
      </div>

      <RevealPanel label="Create task" icon={Plus} defaultOpen={openCreate}>
        <TaskCreateForm groupId={groupId} members={members} />
      </RevealPanel>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Break the work down into tasks and assign them to members."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-foreground">
                  {TASK_STATUS_LABELS[status]}
                </span>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  {columns[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {columns[status].length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    No tasks here.
                  </p>
                ) : (
                  columns[status].map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      members={members}
                      currentUserId={currentUserId}
                      isOwner={isOwner}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
