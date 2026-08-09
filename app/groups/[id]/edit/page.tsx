import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { GroupEditForm } from "@/components/group-edit-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GroupDetailData } from "@/types/group";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: rows, error } = await supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, location_or_link, max_members, owner_id, created_at, course:courses!inner(id, course_code, course_name, faculty, institution), group_members(count)",
    )
    .eq("id", id)
    .returns<GroupDetailData[]>();

  if (error) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-2 p-4 text-center">
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load this group: {error.message}
        </p>
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const group = rows?.[0];
  if (!group) {
    notFound();
  }

  // Page-level gate in addition to RLS: a non-owner who navigates here
  // directly (e.g. by typing the URL) is sent back to the group's detail
  // page rather than shown an edit form they have no permission to
  // submit. RLS (groups_update_owner) independently blocks the actual
  // write regardless.
  if (group.owner_id !== user.id) {
    redirect(`/groups/${id}`);
  }

  return (
    <AppShell active="group" userName={profile.full_name}>
      <Link
        href={`/groups/${id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to group
      </Link>
      <Card className="w-full max-w-xl rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Edit group</CardTitle>
          <CardDescription>Update your group&apos;s details.</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupEditForm group={group} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
