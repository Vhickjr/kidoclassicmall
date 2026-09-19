import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthForm from "@/app/_components/auth-form";
import { signUp } from "@/app/_actions/auth";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/account");

  return (
    <AuthSplit showLogo>
      <h1 className="text-3xl font-bold tracking-tight">Create New Account</h1>
      <p className="mt-2 text-sm text-muted">Please enter details</p>

      <AuthForm action={signUp} label="Signup">
        <AuthField
          label="First Name"
          name="firstName"
          placeholder="Robert"
          autoComplete="given-name"
        />
        <AuthField
          label="Last Name"
          name="lastName"
          placeholder="Fox"
          autoComplete="family-name"
        />
        <AuthField
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <label className="mt-5 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="terms"
            className="size-4 accent-brand"
          />
          <span>
            I agree to the{" "}
            <strong className="font-semibold">Terms &amp; Conditions</strong>
          </span>
        </label>
      </AuthForm>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Login
        </Link>
      </p>
    </AuthSplit>
  );
}
