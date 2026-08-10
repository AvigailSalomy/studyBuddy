import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Compass,
  Sparkles,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActiveNav =
  | "dashboard"
  | "my-groups"
  | "recommendations"
  | "explore"
  | "profile"
  | "group"
  | null;

type LinkNavItem = {
  kind: "link";
  key: Exclude<ActiveNav, null>;
  label: string;
  href: string;
  icon: LucideIcon;
};

type DisabledNavItem = {
  kind: "disabled";
  label: string;
  icon: LucideIcon;
};

// "My Groups" and "Explore Groups" are real, working views over the
// dashboard's own already-fetched group list (see app/dashboard/page.tsx's
// `scope` param) -- not placeholders. Recommendations now links to its
// own real page too (app/recommendations/page.tsx). Settings was
// removed entirely (no feature planned yet, not even disabled).
export const NAV_ITEMS: (LinkNavItem | DisabledNavItem)[] = [
  { kind: "link", key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { kind: "link", key: "my-groups", label: "My Groups", href: "/dashboard?scope=mine", icon: Users },
  { kind: "link", key: "recommendations", label: "Recommendations", href: "/recommendations", icon: Sparkles },
  { kind: "link", key: "explore", label: "Explore Groups", href: "/dashboard?scope=explore", icon: Compass },
  { kind: "link", key: "profile", label: "Profile", href: "/profile", icon: UserCircle },
];

// Shared between the desktop sidebar and the mobile nav sheet so both
// stay in sync automatically. A viewer inside a specific group (its
// overview/materials/tasks/etc, or its create/edit forms) is still
// conceptually inside "My Groups", so that item stays highlighted for
// the whole /groups/* area (active === "group").
export function NavList({
  active,
  onItemClick,
}: {
  active: ActiveNav;
  onItemClick?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV_ITEMS.map((item) =>
        item.kind === "disabled" ? (
          <span
            key={item.label}
            aria-disabled="true"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/60"
          >
            <item.icon className="size-4" />
            {item.label}
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Soon
            </span>
          </span>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            onClick={onItemClick}
            aria-current={
              active === item.key ||
              (item.key === "my-groups" && active === "group")
                ? "page"
                : undefined
            }
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              (active === item.key ||
                (item.key === "my-groups" && active === "group")) &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
