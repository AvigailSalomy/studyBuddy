import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GROUP_TYPE_LABELS, type GroupDetailData } from "@/types/group";

export default async function GroupDetailPage({
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
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: rows, error } = await supabase
    .from("groups")
    .select(
      "id, name, description, group_type, target_degree, target_year, location_or_link, max_members, owner_id, course:courses!inner(id, course_code, course_name, faculty, institution), group_members(count)",
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

  const memberCount = group.group_members[0]?.count ?? 0;
  const isOwner = group.owner_id === user.id;
  const isOnlineLink = group.location_or_link
    ? /^https?:\/\//i.test(group.location_or_link)
    : false;

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4 py-12">
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        ← Back to dashboard
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle>{group.name}</CardTitle>
          {isOwner && (
            <Link
              href={`/groups/${group.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit group
            </Link>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {group.description && <p>{group.description}</p>}
          <p className="text-muted-foreground">
            Course: {group.course.course_name}
          </p>
          <p className="text-muted-foreground">
            Type: {GROUP_TYPE_LABELS[group.group_type]}
          </p>
          <p className="text-muted-foreground">
            Target: {group.target_degree ?? "Any degree"} ·{" "}
            {group.target_year ? `Year ${group.target_year}` : "Any year"}
          </p>
          <p className="text-muted-foreground">
            Members: {memberCount}/{group.max_members}
          </p>
          <p className="text-muted-foreground">
            {group.location_or_link
              ? isOnlineLink
                ? "Online"
                : group.location_or_link
              : "Location not specified"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
