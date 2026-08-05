"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { completeProfileSchema, type CompleteProfileInput } from "@/schemas/profile";

type ActionResult = { success: true } | { success: false; error: string };

export async function completeProfile(
  input: CompleteProfileInput,
): Promise<ActionResult> {
  const parsed = completeProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { fullName, institution, faculty, degree, studyYear, courseIds } =
    parsed.data;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email!,
    full_name: fullName,
    institution,
    faculty,
    degree,
    study_year: studyYear,
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: coursesError } = await supabase
    .from("profile_courses")
    .insert(
      courseIds.map((courseId) => ({
        profile_id: user.id,
        course_id: courseId,
      })),
    );

  if (coursesError) {
    return { success: false, error: coursesError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
