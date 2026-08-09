import { FolderOpen, Upload } from "lucide-react";
import { RevealPanel } from "@/components/group/reveal-panel";
import { MaterialUploadForm } from "@/components/material-upload-form";
import { MaterialDownloadButton } from "@/components/material-download-button";
import { MaterialDeleteButton } from "@/components/material-delete-button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { MATERIAL_CATEGORY_LABELS } from "@/schemas/materials";
import { formatFileSize } from "@/lib/format";
import type { MaterialRow } from "@/types/material";

// Delete is only ever rendered for the uploader in the UI here, same as
// before -- deleteMaterial itself still re-checks ownership server-side
// regardless (see MaterialDeleteButton).
export function MaterialsTab({
  groupId,
  materials,
  currentUserId,
  openUpload,
}: {
  groupId: string;
  materials: MaterialRow[];
  currentUserId: string;
  openUpload: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Materials</h2>
      </div>

      <RevealPanel label="Upload material" icon={Upload} defaultOpen={openUpload}>
        <MaterialUploadForm groupId={groupId} />
      </RevealPanel>

      {materials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No materials uploaded yet"
          description="Shared files, summaries, and exam prep will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{material.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {material.file_name}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="muted">
                  {MATERIAL_CATEGORY_LABELS[material.category]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatFileSize(material.file_size)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {material.uploader.full_name} ·{" "}
                {/* This whole tab tree is client-rendered (nested under
                    GroupTabs), unlike the old Server-Component-only
                    version of this same display -- suppressHydrationWarning
                    for the same reason MeetingTimeDisplay needs it. */}
                <span suppressHydrationWarning>
                  {new Date(material.created_at).toLocaleDateString("en-GB")}
                </span>
              </p>

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <MaterialDownloadButton materialId={material.id} />
                {material.uploader.id === currentUserId && (
                  <MaterialDeleteButton materialId={material.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
