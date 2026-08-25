"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ email }: { email: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Supabase has no standalone "check this password" endpoint, so the
  // current password is verified by re-authenticating with it -- a
  // failure here means it's wrong, and updateUser is never reached. A
  // success just refreshes the existing session for the same account,
  // which is harmless. The user stays signed in afterward: unlike the
  // recovery flow (which signs out because that session only proves
  // email access), this interaction already required typing both the
  // current and new password while authenticated, which is itself a
  // direct re-verification.
  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    setSuccess(false);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: values.currentPassword,
    });

    if (verifyError) {
      setServerError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.newPassword,
    });

    if (updateError) {
      setServerError("Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmNewPassword">Confirm new password</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmNewPassword")}
        />
        {errors.confirmNewPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmNewPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      {success && !serverError && (
        <p role="status" className="text-sm text-green-600 dark:text-green-500">
          Password changed.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
