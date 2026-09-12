import type { Metadata } from "next";
import Link from "next/link";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthButton from "@/app/_components/auth-button";
import NotWired from "@/app/_components/not-wired";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthSplit photoSeed="auth-signup" showLogo>
      <h1 className="text-3xl font-bold tracking-tight">Create New Account</h1>
      <p className="mt-2 text-sm text-muted">Please enter details</p>

      <AuthField label="First Name" placeholder="Robert" autoComplete="given-name" />
      <AuthField label="Last Name" placeholder="Fox" autoComplete="family-name" />
      <AuthField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
      />
      <AuthField
        label="Password"
        type="password"
        placeholder="••••••••••••"
        autoComplete="new-password"
      />

      <label className="mt-5 flex items-center gap-2.5 text-sm">
        <input type="checkbox" className="size-4 accent-foreground" />
        <span>
          I agree to the <strong className="font-semibold">Terms &amp; Conditions</strong>
        </span>
      </label>

      <AuthButton label="Signup" />

      <NotWired>Shell only. No account is created yet.</NotWired>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Login
        </Link>
      </p>
    </AuthSplit>
  );
}
