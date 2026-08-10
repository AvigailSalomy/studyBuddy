"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prepareMaterialUpload, finalizeMaterialUpload } from "@/actions/materials";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MAX_MATERIAL_FILE_SIZE,
  ALLOWED_MATERIAL_MIME_TYPES,
  ALLOWED_MATERIAL_EXTENSIONS,
  type MaterialCategory,
} from "@/schemas/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Stage = "idle" | "preparing" | "uploading" | "finalizing";

const STAGE_LABELS: Record<Exclude<Stage, "idle">, string> = {
  preparing: "Preparing...",
  uploading: "Uploading...",
  finalizing: "Saving...",
};

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

// Fast, client-side-only feedback -- the authoritative checks are
// server-side (prepareMaterialUpload) and, ultimately, the Storage
// bucket's own file_size_limit/allowed_mime_types.
function validateFileForUx(file: File): string | null {
  if (file.size > MAX_MATERIAL_FILE_SIZE) return "File is too large (max 20MB).";
  const extension = getExtension(file.name);
  const mimeOk = (ALLOWED_MATERIAL_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  const extensionOk = (
    ALLOWED_MATERIAL_EXTENSIONS as readonly string[]
  ).includes(extension);
  if (!mimeOk && !extensionOk) return "That file type isn't supported.";
  return null;
}

export function MaterialUploadForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("summary");
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const uxError = validateFileForUx(file);
    if (uxError) {
      setError(uxError);
      return;
    }

    startTransition(async () => {
      setStage("preparing");
      const prepared = await prepareMaterialUpload(
        groupId,
        title,
        category,
        file.name,
        file.size,
        file.type,
      );
      if (!prepared.success) {
        setError(prepared.error);
        setStage("idle");
        return;
      }

      setStage("uploading");
      const browserSupabase = createClient();
      const { error: uploadError } = await browserSupabase.storage
        .from("materials")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type || undefined,
        });

      if (uploadError) {
        setError(uploadError.message);
        setStage("idle");
        return;
      }

      setStage("finalizing");
      const finalized = await finalizeMaterialUpload(
        groupId,
        prepared.path,
        title,
        category,
        file.name,
      );

      if (!finalized.success) {
        setError(finalized.error);
        setStage("idle");
        return;
      }

      setSaved(true);
      setStage("idle");
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="material-title">Title</Label>
        <Input
          id="material-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Machine Learning Exam Summary"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="material-file">File</Label>
        <Input id="material-file" type="file" ref={fileInputRef} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as MaterialCategory)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {MATERIAL_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {MATERIAL_CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-sm text-green-600 dark:text-green-500">
          Material uploaded.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? STAGE_LABELS[stage === "idle" ? "preparing" : stage] : "Upload"}
      </Button>
    </form>
  );
}
