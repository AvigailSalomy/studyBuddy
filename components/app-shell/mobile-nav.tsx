"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { NavList, type ActiveNav } from "@/components/app-shell/nav-items";

// Sidebar is desktop-only (lg:flex); this is the mobile equivalent --
// a hamburger button that reveals the same NavList in a dropdown panel,
// so small screens keep every nav destination without permanently
// consuming horizontal space.
export function MobileNav({ active }: { active: ActiveNav }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-40 border-b border-border bg-sidebar px-3 py-3 shadow-lg">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-base font-semibold text-sidebar-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
            StudyBuddy
          </Link>
          <div className="mt-2">
            <NavList active={active} onItemClick={() => setOpen(false)} />
          </div>
          <div className="mt-2 border-t border-sidebar-border pt-2">
            <SignOutButton className="w-full justify-start gap-2.5" />
          </div>
        </div>
      )}
    </div>
  );
}
