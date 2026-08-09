import { Search, Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import type { ActiveNav } from "@/components/app-shell/nav-items";

// Search and notifications have no backend behind them yet (no search
// index, no notifications table/feed) -- rendered as inert, clearly
// disabled affordances rather than wired up to fake results, same "don't
// fake it" rule applied to the sidebar's disabled Recommendations item.
// They're kept here only because they're expected chrome in this visual
// direction; a later milestone can make them real.
export function TopHeader({
  userName,
  active,
}: {
  userName: string;
  active: ActiveNav;
}) {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      <MobileNav active={active} />
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-label="Search (coming soon)"
          className="text-muted-foreground"
        >
          <Search className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-label="Notifications (coming soon)"
          className="text-muted-foreground"
        >
          <Bell className="size-4" />
        </Button>
        <div className="ml-1.5 flex items-center gap-2 border-l border-border pl-3">
          <Avatar name={userName} size="sm" />
          <span className="hidden text-sm font-medium sm:inline">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
