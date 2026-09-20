"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A labelled input for the sign-in and sign-up forms.
 *
 * Password fields get a reveal button. Typing a password you cannot see is
 * where most failed sign-ins come from, and it matters more here than usual:
 * these customers are on phones, and the old WordPress site had a password bug
 * of exactly this flavour.
 */
export default function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  name?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const id = useId();

  return (
    <div className="mt-5">
      {/* Not a wrapping <label> any more: the reveal button sits inside the
          field, and a button inside a label steals the click meant for it. */}
      <label htmlFor={id} className="block text-xs text-muted">
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          id={id}
          name={name}
          type={isPassword && revealed ? "text" : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-lg border border-foreground py-3 pl-4 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30 ${
            isPassword ? "pr-12" : "pr-4"
          }`}
        />

        {isPassword && (
          <button
            type="button"
            // Never a submit button: inside a form, a bare <button> submits.
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            // Skipped in tab order so it never sits between the password box
            // and the submit button; still reachable by click and by screen
            // readers.
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground"
          >
            {revealed ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
