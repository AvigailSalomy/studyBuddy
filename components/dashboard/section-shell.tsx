import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Shared card chrome for every Dashboard-home section (Upcoming
// Meetings / My Tasks / Pending Join Requests / My Groups preview) --
// same title+icon+optional badge/action header, same card treatment as
// the rest of the redesign (OverviewTab's SectionCard is the closest
// analogue, kept separate since it doesn't need a `badge` slot).
export function SectionShell({
  title,
  icon: Icon,
  badge,
  action,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  badge?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" />
          {title}
          {badge && <Badge variant="warning">{badge}</Badge>}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}
