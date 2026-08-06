import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "@/components/profile-edit-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, institution, faculty, degree, study_year")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const profileDefaultValues = {
    fullName: profile.full_name,
    institution: profile.institution,
    faculty: profile.faculty,
    degree: profile.degree,
    studyYear: profile.study_year,
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Academic details</CardTitle>
          <CardDescription>
            View and update your academic profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm defaultValues={profileDefaultValues} />
        </CardContent>
      </Card>
    </div>
  );
}
