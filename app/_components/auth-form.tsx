"use client";

import { useActionState } from "react";
import type { AuthResult } from "@/app/_actions/auth";

export default function AuthForm({
  action,
  label,
  children,
}: {
  action: (previous: AuthResult, formData: FormData) => Promise<AuthResult>;
  label: string;
  children: React.ReactNode;
}) {
  const [result, submit, pending] = useActionState(action, undefined);

  return (
    <form action={submit}>
      {children}

      {result?.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full rounded-lg bg-brand py-3.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Please wait…" : label}
      </button>
    </form>
  );
}
