"use client";

import { useState, useTransition } from "react";
import { getMaterialDownloadUrl } from "@/actions/materials";
import { Button } from "@/components/ui/button";

// On-demand, not a static link: a fresh, short-lived signed URL is
// generated at click time (see actions/materials.ts) rather than
// eagerly for every material on page load, so nothing expires while a
// page sits open and no signed URL exists until an authorized click.
export function MaterialDownloadButton({
  materialId,
}: {
  materialId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);

    // Opened synchronously, inside the click handler, before the
    // Server Action's await -- browsers only associate window.open()
    // with the triggering click if it happens essentially synchronously
    // within that event; calling it after an awaited network round-trip
    // gets silently popup-blocked in most browsers. Navigating this
    // already-open tab once the signed URL comes back avoids that
    // without changing anything about when/how the signed URL itself is
    // requested.
    //
    // Deliberately no "noopener"/"noreferrer" in the features string:
    // per spec, those make window.open() itself return null (there's no
    // WindowProxy for the opener to hold), which would make navigating
    // it later impossible. The same opener-severing security property
    // is instead applied manually, right below, through the reference
    // we still have -- this keeps both the reference and the security
    // property.
    const downloadWindow = window.open("", "_blank");

    if (!downloadWindow) {
      // The browser blocked the popup outright -- nothing exists to
      // navigate later, so this is surfaced immediately instead of
      // silently calling the Server Action for a tab that will never
      // open.
      setError("Please allow pop-ups to download this file.");
      return;
    }

    downloadWindow.opener = null;

    startTransition(async () => {
      const result = await getMaterialDownloadUrl(materialId);
      if (!result.success) {
        setError(result.error);
        downloadWindow.close();
        return;
      }
      downloadWindow.location.href = result.url;
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Preparing..." : "Open file"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
