"use server";

import { createClient } from "@/lib/supabase/server";
import {
  courseSearchSchema,
  createCourseSchema,
  type CourseSearchInput,
  type CreateCourseInput,
} from "@/schemas/courses";
import type { Course } from "@/types/course";

type SearchResult =
  | { success: true; courses: Course[] }
  | { success: false; error: string };

type CreateResult =
  | { success: true; course: Course }
  | { success: false; error: string };

const COURSE_COLUMNS = "id, course_code, course_name, faculty, institution";

type OwnAcademicContext =
  | { ok: true; institution: string; faculty: string }
  | { ok: false; error: string };

// Explicit `ok` discriminant rather than an `"error" in x` structural
// check -- more reliably narrowed by TypeScript across an async
// function's inferred union return type.
async function getOwnInstitutionAndFaculty(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<OwnAcademicContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("institution, faculty")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "Complete your profile before managing courses.",
    };
  }

  return { ok: true, institution: profile.institution, faculty: profile.faculty };
}

// Suggestions are scoped to the searching user's own institution/faculty,
// not anything group-specific -- at course-selection time there's no
// group yet to derive that from.
export async function searchCourses(
  input: CourseSearchInput,
): Promise<SearchResult> {
  const parsed = courseSearchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const context = await getOwnInstitutionAndFaculty(supabase);
  if (!context.ok) {
    return { success: false, error: context.error };
  }

  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("institution", context.institution)
    .eq("faculty", context.faculty)
    .ilike("course_name", `${parsed.data.query}%`)
    .order("course_name")
    .limit(10);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, courses: data ?? [] };
}

// Finds an existing case-insensitive match first; only creates a new row
// if nothing matches. On a race (two users creating the same course at
// once), the unique index rejects the second insert (Postgres 23505) and
// we fall back to reading the row the other request just created, so the
// caller always gets back a usable course either way.
export async function findOrCreateCourse(
  input: CreateCourseInput,
): Promise<CreateResult> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const context = await getOwnInstitutionAndFaculty(supabase);
  if (!context.ok) {
    return { success: false, error: context.error };
  }

  const { institution, faculty } = context;
  const { courseName } = parsed.data;

  const existing = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("institution", institution)
    .eq("faculty", faculty)
    .ilike("course_name", courseName)
    .maybeSingle();

  if (existing.data) {
    return { success: true, course: existing.data };
  }

  const inserted = await supabase
    .from("courses")
    .insert({
      institution,
      faculty,
      course_name: courseName,
    })
    .select(COURSE_COLUMNS)
    .single();

  if (!inserted.error) {
    return { success: true, course: inserted.data };
  }

  if (inserted.error.code === "23505") {
    const retry = await supabase
      .from("courses")
      .select(COURSE_COLUMNS)
      .eq("institution", institution)
      .eq("faculty", faculty)
      .ilike("course_name", courseName)
      .maybeSingle();

    if (retry.data) {
      return { success: true, course: retry.data };
    }
  }

  return { success: false, error: inserted.error.message };
}
