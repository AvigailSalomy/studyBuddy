import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { ChangePasswordForm } from "@/components/change-password-form";
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

  if (!user.email) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, institution, faculty, degree, study_year, contact_email",
    )
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
    contactEmail: profile.contact_email ?? "",
  };

  return (
    <AppShell active="profile" userName={profile.full_name}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          View and update your academic details.
        </p>
      </div>
      <Card className="w-full max-w-xl rounded-2xl shadow-sm">
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
      <Card className="w-full max-w-xl rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm email={user.email} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
