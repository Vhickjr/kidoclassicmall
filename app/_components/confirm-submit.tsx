"use client";

/**
 * A submit button that asks before it goes through.
 *
 * Exists because a Server Component cannot attach an onSubmit handler to its
 * own <form> — the handler is a function, and nothing in a Server Component's
 * output can be one. So the button alone becomes the client component, and the
 * form and its server action stay exactly where they were.
 *
 * The dialog is a courtesy, not a guard: anything destructive still has to be
 * refused server-side, because a direct POST never sees this at all.
 */
export default function ConfirmSubmit({
  message,
  children,
  className,
  ariaLabel,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
