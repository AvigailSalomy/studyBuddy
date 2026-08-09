import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopHeader } from "@/components/app-shell/top-header";
import type { ActiveNav } from "@/components/app-shell/nav-items";

export type { ActiveNav };

// Every authenticated page (dashboard, group pages, profile, group
// create/edit) renders through this shell so the sidebar/top header stay
// visually consistent app-wide. Deliberately a plain component each page
// wraps its own JSX in, not a Next.js layout.tsx -- keeps every page's
// existing data-fetching/redirect logic exactly where it is, with zero
// file moves or route restructuring.
export function AppShell({
  active,
  userName,
  children,
}: {
  active: ActiveNav;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar active={active} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader userName={userName} active={active} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
