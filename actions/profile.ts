"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileBasicsSchema, type ProfileBasicsInput } from "@/schemas/profile";

type ActionResult = { success: true } | { success: false; error: string };

export async function completeProfile(
  input: ProfileBasicsInput,
): Promise<ActionResult> {
  const parsed = profileBasicsSchema.safeParse(input);
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

  const { fullName, institution, faculty, degree, studyYear, contactEmail } =
    parsed.data;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email!,
    full_name: fullName,
    institution,
    faculty,
    degree,
    study_year: studyYear,
    // Distinct from `email` above (the auth/login email) -- this is the
    // user's own explicit choice, optional, empty by default.
    contact_email: contactEmail.length > 0 ? contactEmail : null,
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProfile(
  input: ProfileBasicsInput,
): Promise<ActionResult> {
  const parsed = profileBasicsSchema.safeParse(input);
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

  const { fullName, institution, faculty, degree, studyYear, contactEmail } =
    parsed.data;

  // .eq("id", user.id) is redundant with the profiles_update_self RLS
  // policy (which already restricts updates to auth.uid()), but kept
  // explicit here as defense in depth and to make the intent obvious.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      institution,
      faculty,
      degree,
      study_year: studyYear,
      // "" means the user cleared it -- stored as null, same convention
      // as other optional free-text fields (materials.title, meetings.
      // location_or_link) elsewhere in this app.
      contact_email: contactEmail.length > 0 ? contactEmail : null,
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}
