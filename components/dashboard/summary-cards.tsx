import Link from "next/link";
import { Users, CheckSquare, Calendar, UserPlus, type LucideIcon } from "lucide-react";

type SummaryCard = {
  label: string;
  count: number;
  icon: LucideIcon;
  href?: string;
};

// Pending Requests only appears when there's at least one -- matches
// the section below it, which is likewise hidden when empty (this
// isn't a feature toggle, just "don't show a 0 for something that's
// usually irrelevant to most viewers, who don't own any group").
export function SummaryCards({
  groupsCount,
  tasksCount,
  meetingsCount,
  pendingRequestsCount,
}: {
  groupsCount: number;
  tasksCount: number;
  meetingsCount: number;
  pendingRequestsCount: number;
}) {
  const cards: SummaryCard[] = [
    { label: "My Groups", count: groupsCount, icon: Users, href: "/dashboard?scope=mine" },
    { label: "Open Tasks", count: tasksCount, icon: CheckSquare },
    { label: "Upcoming Meetings", count: meetingsCount, icon: Calendar },
  ];
  if (pendingRequestsCount > 0) {
    cards.push({
      label: "Pending Requests",
      count: pendingRequestsCount,
      icon: UserPlus,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const body = (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/30">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <card.icon className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl leading-none font-semibold">
                {card.count}
              </span>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
          </div>
        );
        return card.href ? (
          <Link key={card.label} href={card.href}>
            {body}
          </Link>
        ) : (
          <div key={card.label}>{body}</div>
        );
      })}
    </div>
  );
}
