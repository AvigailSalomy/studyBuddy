import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupCreateForm } from "@/components/group-create-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewGroupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("degree, study_year")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 p-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
          <CardDescription>
            Start a new study or project group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupCreateForm
            defaultDegree={profile.degree}
            defaultYear={profile.study_year}
          />
        </CardContent>
      </Card>
    </div>
  );
}
