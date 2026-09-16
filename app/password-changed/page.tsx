import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Password changed",
};

export default function PasswordChangedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md bg-surface px-10 py-12 text-center shadow-2xl rounded-xl">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-soft/50">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand">
            <Check aria-hidden className="size-6 text-white" />
          </span>
        </div>

        <h1 className="mt-7 text-xl font-bold tracking-tight">
          Password Changed Successfully
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your password has been updated successfully
        </p>

        <Link
          href="/login"
          className="mt-8 block w-full rounded-lg bg-brand py-3.5 text-center text-sm text-white"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
