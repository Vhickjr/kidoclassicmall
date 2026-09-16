"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { resendVerificationEmail } from "@/app/_actions/auth";

export default function VerifyEmailBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  return (
    <div className="border-b border-brand/30 bg-brand-soft/40 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Mail aria-hidden className="size-4 text-brand-deep" />
          <span>
            {sent
              ? "Verification email sent! Check your inbox."
              : "Please verify your email address."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!sent && (
            <button
              type="button"
              disabled={isPending}
              className="font-medium text-brand-deep underline disabled:opacity-50"
              onClick={() =>
                startTransition(async () => {
                  await resendVerificationEmail();
                  setSent(true);
                })
              }
            >
              {isPending ? "Sending…" : "Resend"}
            </button>
          )}
          <button
            type="button"
            className="text-muted hover:text-foreground"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
