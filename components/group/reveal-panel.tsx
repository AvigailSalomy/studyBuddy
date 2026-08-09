"use client";

import { useState } from "react";
import { X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generic "show a trigger button, click to reveal a form beneath it"
// wrapper -- used for Upload material / Create task / Schedule meeting,
// so those forms aren't permanently expanded on the page. Wraps the
// existing create-form components as-is; no changes to their internals.
export function RevealPanel({
  label,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  label: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" className="self-start">
        <Icon className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}
