"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  groupSchema,
  type GroupFormInput,
  type GroupInput,
} from "@/schemas/groups";
import { CoursePicker } from "@/components/course-picker";
import type { Course } from "@/types/course";
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

type ActionResult =
  | { success: true; groupId: string }
  | { success: false; error: string };

// Shared by group creation (/groups/new) and group editing
// (/groups/[id]/edit) -- both collect exactly the same fields, just
// against different Server Actions, default values, and a different
// pre-selected course.
export function GroupDetailsForm({
  defaultValues,
  defaultCourse,
  action,
  submitLabel,
  savingLabel,
  successMessage,
  onSuccess,
}: {
  defaultValues: GroupFormInput;
  defaultCourse: Course | null;
  action: (input: GroupInput) => Promise<ActionResult>;
  submitLabel: string;
  savingLabel: string;
  successMessage: string;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    defaultCourse,
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormInput, unknown, GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues,
  });

  async function onSubmit(values: GroupInput) {
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
        <Label htmlFor="name">Group name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Group type</Label>
        <Controller
          name="groupType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study">Study group</SelectItem>
                <SelectItem value="project">Task / project group</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Course</Label>
        <CoursePicker
          value={selectedCourse}
          onChange={(course) => {
            setSelectedCourse(course);
            setValue("courseId", course?.id ?? "", { shouldValidate: true });
          }}
        />
        {errors.courseId && (
          <p className="text-sm text-destructive">{errors.courseId.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="targetDegree">Target degree (optional)</Label>
        <Input id="targetDegree" {...register("targetDegree")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="targetYear">Target year (optional)</Label>
        <Input
          id="targetYear"
          type="number"
          min={1}
          max={8}
          {...register("targetYear")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="maxMembers">Max members</Label>
        <Input
          id="maxMembers"
          type="number"
          min={2}
          {...register("maxMembers")}
        />
        {errors.maxMembers && (
          <p className="text-sm text-destructive">
            {errors.maxMembers.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="locationOrLink">Location or meeting link (optional)</Label>
        <Input id="locationOrLink" {...register("locationOrLink")} />
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
