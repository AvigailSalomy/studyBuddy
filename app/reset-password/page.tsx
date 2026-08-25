"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SessionState = "checking" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // A valid recovery link lands here only after /auth/callback has
  // already exchanged the code and set a session cookie -- but *any*
  // logged-in session (including an unrelated pre-existing one) would
  // pass a plain getUser() presence check. getClaims() verifies the JWT
  // and exposes its amr (Authentication Method Reference) history, so
  // we can require the session to have actually been established via
  // Supabase's password-recovery flow specifically, not just "some
  // user happens to be logged in".
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getClaims().then(({ data, error }) => {
      const amr = data?.claims.amr;
      const hasRecoveryAuth =
        Array.isArray(amr) &&
        amr.some((entry) =>
          typeof entry === "string" ? entry === "recovery" : entry.method === "recovery",
        );
      setSessionState(!error && hasRecoveryAuth ? "valid" : "invalid");
    });
  }, []);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    // The password update already succeeded at this point. Sign out the
    // recovery session so it can't be reused to change the password
    // again (e.g. via the browser back button) -- but a failure here
    // must not be reported as an update failure, since the update
    // itself is done. Best-effort only: even if sign-out fails, routing
    // to /login still requires the user to authenticate with the new
    // password before reaching anything protected.
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error(
        "Failed to sign out recovery session after password reset:",
        signOutError,
      );
    }

    router.push("/login?reset=success");
  }

  if (sessionState === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionState === "invalid") {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Link invalid or expired</CardTitle>
            <CardDescription>
              This password reset link is no longer valid. Please request a
              new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full">Request a new link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
