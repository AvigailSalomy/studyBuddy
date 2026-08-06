import Link from "next/link";
import { GROUP_TYPE_LABELS, type GroupCardData } from "@/types/group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GroupCard({ group }: { group: GroupCardData }) {
  const memberCount = group.group_members[0]?.count ?? 0;
  const isOnlineLink = group.location_or_link
    ? /^https?:\/\//i.test(group.location_or_link)
    : false;

  return (
    <Link href={`/groups/${group.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>Course: {group.course.course_name}</p>
          <p>Type: {GROUP_TYPE_LABELS[group.group_type]}</p>
          <p>
            Target: {group.target_degree ?? "Any degree"} ·{" "}
            {group.target_year ? `Year ${group.target_year}` : "Any year"}
          </p>
          <p>
            Members: {memberCount}/{group.max_members}
          </p>
          <p>
            {group.location_or_link
              ? isOnlineLink
                ? "Online"
                : group.location_or_link
              : "Location not specified"}
          </p>
          <span className="mt-1 text-sm font-medium text-primary underline underline-offset-4">
            View group →
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
