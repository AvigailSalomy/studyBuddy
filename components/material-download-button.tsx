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
    startTransition(async () => {
      const result = await getMaterialDownloadUrl(materialId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
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
        {isPending ? "Preparing..." : "Download"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
