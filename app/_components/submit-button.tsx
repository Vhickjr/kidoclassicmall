"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * A submit button that reacts to being pressed.
 *
 * `useFormStatus` reports on the form this button sits inside, so the button
 * knows when its own server action is actually in flight — no local state to
 * keep in step, and no way for the spinner to disagree with reality. It must
 * be rendered *inside* the form for that to work.
 *
 * It also blocks a second press while the first is still running, which is
 * what stops an impatient double-click creating two of something.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
  variant = "primary",
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "bare";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center justify-center gap-2 text-sm transition " +
    "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

  const looks = {
    primary: "bg-brand px-5 py-2.5 text-white hover:bg-brand-deep",
    secondary:
      "border border-line px-5 py-2.5 hover:border-brand hover:bg-brand-soft/30",
    danger: "text-red-600 hover:text-red-700 hover:underline",
    bare: "hover:underline",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${base} ${looks} ${className}`}
      {...rest}
    >
      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
