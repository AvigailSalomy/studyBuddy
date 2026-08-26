"use client";

import { useRouter } from "next/navigation";
import { updateGroup } from "@/actions/groups";
import { GroupDetailsForm } from "@/components/group-details-form";
import type { GroupInput } from "@/schemas/groups";
import type { GroupDetailData } from "@/types/group";

export function GroupEditForm({ group }: { group: GroupDetailData }) {
  const router = useRouter();

  return (
    <GroupDetailsForm
      defaultValues={{
        name: group.name,
        description: group.description ?? "",
        groupType: group.group_type,
        courseId: group.course.id,
        targetDegree: group.target_degree ?? "",
        targetYear: group.target_year ? String(group.target_year) : "",
        maxMembers: group.max_members,
      }}
      defaultCourse={group.course}
      action={(values: GroupInput) => updateGroup(group.id, values)}
      submitLabel="Save changes"
      savingLabel="Saving..."
      successMessage="Changes saved."
      onSuccess={() => router.refresh()}
    />
  );
}
