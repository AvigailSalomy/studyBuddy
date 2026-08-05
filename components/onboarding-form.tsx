"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  completeProfileSchema,
  type CompleteProfileFormInput,
  type CompleteProfileInput,
} from "@/schemas/profile";
import { completeProfile } from "@/actions/profile";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function OnboardingForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileFormInput, unknown, CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { courseIds: [] },
  });

  async function onSubmit(values: CompleteProfileInput) {
    setServerError(null);
    const result = await completeProfile(values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName && (
          <p className="text-sm text-destructive">
            {errors.fullName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="institution">Institution</Label>
        <Input id="institution" {...register("institution")} />
        {errors.institution && (
          <p className="text-sm text-destructive">
            {errors.institution.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="faculty">Faculty</Label>
        <Input id="faculty" {...register("faculty")} />
        {errors.faculty && (
          <p className="text-sm text-destructive">{errors.faculty.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="degree">Degree / track</Label>
        <Input id="degree" {...register("degree")} />
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
          {...register("studyYear")}
        />
        {errors.studyYear && (
          <p className="text-sm text-destructive">
            {errors.studyYear.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Courses</Label>
        <Controller
          name="courseIds"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              {courses.map((course) => {
                const checked = field.value?.includes(course.id) ?? false;
                return (
                  <label
                    key={course.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const current = field.value ?? [];
                        field.onChange(
                          value
                            ? [...current, course.id]
                            : current.filter((id) => id !== course.id),
                        );
                      }}
                    />
                    {course.course_code} — {course.course_name}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.courseIds && (
          <p className="text-sm text-destructive">
            {errors.courseIds.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Finish setup"}
      </Button>
    </form>
  );
}
