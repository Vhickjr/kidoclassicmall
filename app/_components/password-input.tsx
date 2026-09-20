"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password box with a reveal button, for the admin forms.
 *
 * Separate from AuthField because these live in server-rendered admin pages
 * that pass their own classes; only the input itself needs to be a client
 * component, so the pages around it stay on the server.
 */
export default function PasswordInput({
  name,
  required,
  minLength,
  autoComplete = "off",
  className = "",
}: {
  name: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="relative block">
      <input
        name={name}
        type={revealed ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setRevealed((shown) => !shown)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground"
      >
        {revealed ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </span>
  );
}
