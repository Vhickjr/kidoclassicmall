"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/_actions/auth";

export default function AccountProfileForm({
  user,
}: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  } | null;
}) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);

  return (
    <form action={action}>
      {state?.error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3.5 text-sm text-red-600">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 p-3.5 text-sm text-green-700">
          Personal information saved successfully!
        </div>
      )}

      <div className="mt-6 grid max-w-xl gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">First Name</span>
          <input
            type="text"
            name="firstName"
            defaultValue={user?.firstName ?? ""}
            placeholder="Enter first name"
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Last Name</span>
          <input
            type="text"
            name="lastName"
            defaultValue={user?.lastName ?? ""}
            placeholder="Enter last name"
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Email Address (Read-only)</span>
          <input
            type="email"
            name="email"
            defaultValue={user?.email ?? ""}
            readOnly
            disabled
            className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-line bg-surface/50 px-4 py-3 text-sm text-muted outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Mobile Number</span>
          <input
            type="tel"
            name="phone"
            defaultValue={user?.phone ?? ""}
            placeholder="Enter mobile number"
            className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-lg bg-brand px-8 py-3.5 text-sm text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving changes…" : "Save changes"}
      </button>
    </form>
  );
}
