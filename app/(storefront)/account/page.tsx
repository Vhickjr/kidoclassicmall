import type { Metadata } from "next";
import NotWired from "@/app/_components/not-wired";

export const metadata: Metadata = { title: "Personal Information" };

export default function PersonalInformationPage() {
  return (
    <div>
      <h2 className="font-semibold">Personal Information</h2>

      <div className="mt-6 grid max-w-xl gap-5 sm:grid-cols-2">
        <Field label="First Name" placeholder="Enter first name" />
        <Field label="Last Name" placeholder="Enter last name" />
        <Field label="Email Address" placeholder="you@example.com" type="email" />
        <Field label="Mobile Number" placeholder="Enter mobile number" />
      </div>

      <button
        type="button"
        className="mt-6 bg-brand px-8 py-3.5 text-sm text-white"
      >
        Save changes
      </button>

      <NotWired>
        Shell only. Profiles belong to a signed-in user, and logins are not built
        yet.
      </NotWired>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
      />
    </label>
  );
}
