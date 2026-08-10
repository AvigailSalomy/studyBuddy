"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileBasicsSchema,
  type ProfileBasicsFormInput,
  type ProfileBasicsInput,
} from "@/schemas/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActionResult = { success: true } | { success: false; error: string };

// Shared by /onboarding (create) and the "Academic details" section of
// /profile (edit) -- both operate on the same basic profile fields, just
// against different Server Actions and default values. Course selection
// is a separate concern, handled by CourseSelectionForm.
export function ProfileDetailsForm({
  defaultValues,
  action,
  submitLabel,
  savingLabel,
  successMessage,
  onSuccess,
}: {
  defaultValues?: Partial<ProfileBasicsFormInput>;
  action: (input: ProfileBasicsInput) => Promise<ActionResult>;
  submitLabel: string;
  savingLabel: string;
  successMessage: string;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileBasicsFormInput, unknown, ProfileBasicsInput>({
    resolver: zodResolver(profileBasicsSchema),
    defaultValues,
  });

  async function onSubmit(values: ProfileBasicsInput) {
    setServerError(null);
    setSaved(false);
    const result = await action(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
    onSuccess?.();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" autoComplete="off" {...register("fullName")} />
        {errors.fullName && (
          <p className="text-sm text-destructive">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="institution">Institution</Label>
        <Input id="institution" autoComplete="off" {...register("institution")} />
        {errors.institution && (
          <p className="text-sm text-destructive">
            {errors.institution.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="faculty">Faculty</Label>
        <Input id="faculty" autoComplete="off" {...register("faculty")} />
        {errors.faculty && (
          <p className="text-sm text-destructive">{errors.faculty.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="degree">Degree / track</Label>
        <Input id="degree" autoComplete="off" {...register("degree")} />
        {errors.degree && (
          <p className="text-sm text-destructive">{errors.degree.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="studyYear">Study year</Label>
        <Input
          id="studyYear"
          type="number"
          min={1}
          max={8}
          autoComplete="off"
          {...register("studyYear")}
        />
        {errors.studyYear && (
          <p className="text-sm text-destructive">
            {errors.studyYear.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contactEmail">Contact email (optional)</Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="you@example.com"
          autoComplete="off"
          {...register("contactEmail")}
        />
        <p className="text-xs text-muted-foreground">
          Shown to fellow group members so they can reach you. This is
          separate from your login email and is only shared if you add one
          here.
        </p>
        {errors.contactEmail && (
          <p className="text-sm text-destructive">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      {saved && !serverError && (
        <p role="status" className="text-sm text-green-600 dark:text-green-500">
          {successMessage}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? savingLabel : submitLabel}
      </Button>
    </form>
  );
}
