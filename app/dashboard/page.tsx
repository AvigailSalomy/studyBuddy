import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardFilters } from "@/components/dashboard-filters";
import { GroupCard } from "@/components/group-card";
import { buttonVariants } from "@/components/ui/button";
import type { GroupCardData } from "@/types/group";

type DashboardSearchParams = {
  course?: string;
  faculty?: string;
  degree?: string;
  year?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, faculty, degree, study_year")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  // A param key absent entirely (first visit, no query string yet) means
  // "use the profile default"; a key present but empty means the user
  // explicitly cleared that filter -- see DashboardFilters.
  const courseFilter = params.course ?? "";
  const facultyFilter =
    params.faculty !== undefined ? params.faculty : profile.faculty;
  const degreeFilter =
    params.degree !== undefined ? params.degree : profile.degree;
  const yearFilter =
    params.year !== undefined ? params.year : String(profile.study_year);

  let query = supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, location_or_link, max_members, course:courses!inner(id, course_name, faculty), group_members(count)",
    )
    .order("created_at", { ascending: false });

  if (courseFilter.trim().length > 0) {
    query = query.ilike("course.course_name", `%${courseFilter.trim()}%`);
  }
  if (facultyFilter.trim().length > 0) {
    query = query.eq("course.faculty", facultyFilter.trim());
  }
  if (degreeFilter.trim().length > 0) {
    // Groups open to any degree (target_degree is null) stay visible
    // alongside an exact match -- mirrors how the recommendation engine
    // treats an empty target_year as "matches anyone" (architecture.md
    // 8.2), applied here to filtering instead of scoring.
    query = query.or(
      `target_degree.eq.${degreeFilter.trim()},target_degree.is.null`,
    );
  }
  if (yearFilter.trim().length > 0) {
    const yearNumber = Number(yearFilter.trim());
    if (Number.isInteger(yearNumber)) {
      query = query.or(`target_year.eq.${yearNumber},target_year.is.null`);
    }
  }

  const { data: groups, error } = await query.returns<GroupCardData[]>();

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Welcome, {profile.full_name}</h1>
        <div className="flex items-center gap-2">
          <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
            Profile
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Groups</h2>
        <Link href="/groups/new" className={buttonVariants({})}>
          Create group
        </Link>
      </div>

      <DashboardFilters
        initialCourse={courseFilter}
        initialFaculty={facultyFilter}
        initialDegree={degreeFilter}
        initialYear={yearFilter}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load groups: {error.message}
        </p>
      )}

      {!error && (groups?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          No groups match your filters yet. Try widening your search, or{" "}
          <Link href="/groups/new" className="underline underline-offset-4">
            create one
          </Link>
          .
        </p>
      )}

      {!error && groups && groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
