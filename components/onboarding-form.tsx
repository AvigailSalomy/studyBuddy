"use client";

import { useRouter } from "next/navigation";
import { completeProfile } from "@/actions/profile";
import { ProfileDetailsForm } from "@/components/profile-details-form";

export function OnboardingForm() {
  const router = useRouter();

  return (
    <ProfileDetailsForm
      action={completeProfile}
      submitLabel="Finish setup"
      savingLabel="Saving..."
      successMessage="Profile created."
      onSuccess={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
