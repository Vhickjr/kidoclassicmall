import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { verifyEmailToken } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Email verification",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const success = token ? await verifyEmailToken(token) : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md bg-surface px-10 py-12 text-center shadow-2xl rounded-xl">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-soft/50">
          <span className={`flex size-12 items-center justify-center rounded-full ${
            success ? "bg-brand" : "bg-red-500"
          }`}>
            {success ? (
              <Check aria-hidden className="size-6 text-white" />
            ) : (
              <X aria-hidden className="size-6 text-white" />
            )}
          </span>
        </div>

        <h1 className="mt-7 text-xl font-bold tracking-tight">
          {success ? "Email Verified!" : "Verification Failed"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {success
            ? "Your email has been verified successfully."
            : "This link is invalid or has expired. Please request a new verification email from your account settings."}
        </p>

        <Link
          href={success ? "/account" : "/login"}
          className="mt-8 block w-full rounded-lg bg-brand py-3.5 text-center text-sm text-white"
        >
          {success ? "Go to Account" : "Back to Login"}
        </Link>
      </div>
    </div>
  );
}
