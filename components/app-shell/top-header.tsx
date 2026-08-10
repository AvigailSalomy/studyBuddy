import { Avatar } from "@/components/ui/avatar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import type { ActiveNav } from "@/components/app-shell/nav-items";

// Search and notifications were previously rendered here as disabled,
// inert icon buttons ("coming soon" affordances) -- removed entirely
// rather than kept as placeholders, since neither has any functionality
// behind it and an unclickable icon still implies a feature that
// doesn't exist. Add them back for real once a search index or
// notifications feed actually exists.
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
      <div className="flex flex-1 items-center justify-end gap-2">
        <Avatar name={userName} size="sm" />
        <span className="hidden text-sm font-medium sm:inline">
          {userName}
        </span>
      </div>
    </header>
  );
}
