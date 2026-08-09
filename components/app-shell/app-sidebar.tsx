import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { NavList, type ActiveNav } from "@/components/app-shell/nav-items";

export type { ActiveNav };

export function AppSidebar({ active }: { active: ActiveNav }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-svh">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-lg font-semibold text-sidebar-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4.5" />
        </span>
        StudyBuddy
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <NavList active={active} />
      </div>

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <SignOutButton className="w-full justify-start gap-2.5" />
      </div>
    </aside>
  );
}
