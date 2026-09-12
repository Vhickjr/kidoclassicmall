import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthButton from "@/app/_components/auth-button";
import NotWired from "@/app/_components/not-wired";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthSplit photoSeed="auth-forgot">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm hover:text-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Back
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Forgot Password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Enter your registered email address and we&rsquo;ll send you a code to
        reset your password.
      </p>

      <AuthField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
      />

      <AuthButton label="Send OTP" href="/verify-otp" />

      <NotWired>
        Shell only. No code is sent; the button just opens the next screen.
      </NotWired>
    </AuthSplit>
  );
}
