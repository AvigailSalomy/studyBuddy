import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { TaskStatusBadge } from "@/components/task-status-badge";
import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/dashboard/section-shell";
import type { DashboardTaskRow } from "@/types/dashboard";

// Server-rendered only (this whole card tree has no client interactivity
// -- unlike the group Tasks tab, there's no status control or edit/delete
// here by design: "do not duplicate task-editing logic", a card just
// links to the task's group Tasks tab, where the real controls live.
// due_date uses the same explicit-locale + timeZone: "UTC" convention as
// TaskListItem, and needs no suppressHydrationWarning since this never
// re-renders client-side (no "use client" boundary above it).
export function MyTasksCard({ tasks }: { tasks: DashboardTaskRow[] }) {
  return (
    <SectionShell title="My Tasks" icon={CheckSquare}>
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="You're all caught up"
          description="Tasks assigned to you across your groups will show up here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/groups/${task.group.id}?tab=tasks`}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/70 p-3 transition-colors hover:bg-accent/40"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {task.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {task.group.name}
                  {task.due_date &&
                    ` · Due ${new Date(task.due_date).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}
                </span>
              </div>
              <TaskStatusBadge status={task.status} />
            </Link>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
