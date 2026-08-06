"use client";

import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/profile";
import { ProfileDetailsForm } from "@/components/profile-details-form";
import type { ProfileBasicsFormInput } from "@/schemas/profile";

export function ProfileEditForm({
  defaultValues,
}: {
  defaultValues: ProfileBasicsFormInput;
}) {
  const router = useRouter();

  return (
    <ProfileDetailsForm
      defaultValues={defaultValues}
      action={updateProfile}
      submitLabel="Save changes"
      savingLabel="Saving..."
      successMessage="Changes saved."
      onSuccess={() => router.refresh()}
    />
  );
}
