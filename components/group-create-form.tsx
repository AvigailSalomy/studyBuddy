"use client";

import { useRouter } from "next/navigation";
import { createGroup } from "@/actions/groups";
import { GroupDetailsForm } from "@/components/group-details-form";

export function GroupCreateForm({
  defaultDegree,
  defaultYear,
}: {
  defaultDegree: string;
  defaultYear: number;
}) {
  const router = useRouter();

  return (
    <GroupDetailsForm
      defaultValues={{
        name: "",
        description: "",
        groupType: "study",
        courseId: "",
        targetDegree: defaultDegree,
        targetYear: String(defaultYear),
        maxMembers: 10,
        locationOrLink: "",
      }}
      defaultCourse={null}
      action={createGroup}
      submitLabel="Create group"
      savingLabel="Creating..."
      successMessage="Group created."
      onSuccess={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
