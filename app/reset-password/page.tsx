import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthForm from "@/app/_components/auth-form";
import { setNewPassword } from "@/app/_actions/auth";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  if (!token || !email) redirect("/forgot-password");

  return (
    <AuthSplit>
      <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your new password below.
      </p>

      <AuthForm action={setNewPassword} label="Update Password">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        <AuthField
          label="New Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
        <AuthField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
        />
      </AuthForm>
    </AuthSplit>
  );
}
