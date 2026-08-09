import type { TaskStatus } from "@/schemas/tasks";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  created_by: string;
  assignee: { id: string; full_name: string } | null;
};
